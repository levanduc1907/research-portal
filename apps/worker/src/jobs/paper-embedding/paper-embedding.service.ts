import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { EmbeddingProviderService } from "../../vector/embedding-provider.service";
import { QdrantService } from "../../vector/qdrant.service";

interface SyncResult {
  selected: number;
  processed: number;
  failed: number;
  retryAfterMs?: number;
}

@Injectable()
export class PaperEmbeddingService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PaperEmbeddingService.name);
  private readonly syncEnabled: boolean;
  private readonly syncIntervalMs: number;
  private readonly scheduledBatchSize: number;
  private syncTimer?: NodeJS.Timeout;
  private syncRunning = false;
  private missingKeyWarningLogged = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingProviderService,
    private readonly qdrant: QdrantService,
    config: ConfigService,
  ) {
    this.syncEnabled = config.get("VECTOR_SYNC_ENABLED", "true") === "true";
    this.syncIntervalMs = Math.max(
      10_000,
      Number(config.get("VECTOR_SYNC_INTERVAL_MS", "60000")),
    );
    this.scheduledBatchSize = Math.max(
      1,
      Math.min(200, Number(config.get("VECTOR_SYNC_BATCH_SIZE", "50"))),
    );
  }

  onApplicationBootstrap(): void {
    // CLI jobs are finite processes and invoke sync explicitly when requested.
    if (!this.syncEnabled || process.argv[2]) return;
    this.logger.log(
      `Automatic vector sync enabled (every ${this.syncIntervalMs}ms, batch ${this.scheduledBatchSize})`,
    );
    void this.runScheduledSync();
    this.syncTimer = setInterval(
      () => void this.runScheduledSync(),
      this.syncIntervalMs,
    );
  }

  onModuleDestroy(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
  }

  private async runScheduledSync(): Promise<void> {
    if (this.syncRunning) return;
    this.syncRunning = true;
    try {
      await this.qdrant.ensureCollection();
      // Status tracking does not require an API key: legacy/new papers first
      // become PENDING and remain visible there until embedding is available.
      await this.enqueuePapersWithoutStatus(this.scheduledBatchSize);
    } catch (error) {
      this.logger.error(
        `Could not enqueue vector jobs: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.syncRunning = false;
      return;
    }
    if (!this.embeddings.isConfigured()) {
      if (!this.missingKeyWarningLogged) {
        this.logger.warn(
          "Automatic vector sync is waiting for EMBEDDING_API_KEY.",
        );
        this.missingKeyWarningLogged = true;
      }
      this.syncRunning = false;
      return;
    }

    try {
      await this.recoverStaleProcessingRecords();
      const result = await this.processPendingPapers(
        this.scheduledBatchSize,
        true,
      );
      if (result.selected > 0) {
        this.logger.log(
          `Scheduled vector sync: ${result.processed} completed, ${result.failed} failed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Scheduled vector sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.syncRunning = false;
    }
  }

  private async recoverStaleProcessingRecords(): Promise<void> {
    const staleBefore = new Date(
      Date.now() - Math.max(this.syncIntervalMs * 2, 10 * 60_000),
    );
    const recovered = await this.prisma.embeddingRecord.updateMany({
      where: { status: "PROCESSING", updatedAt: { lt: staleBefore } },
      data: {
        status: "PENDING",
        errorMessage: "Recovered after an interrupted vector sync.",
      },
    });
    if (recovered.count > 0) {
      this.logger.warn(`Recovered ${recovered.count} stale vector jobs`);
    }
    await this.prisma.embeddingRecord.updateMany({
      where: { status: "COMPLETED", model: { not: this.embeddings.model } },
      data: { status: "PENDING", errorMessage: null },
    });
  }

  private buildContent(paper: {
    title: string;
    abstract?: string | null;
    primaryTopicName?: string;
  }): string {
    return [
      `Title: ${paper.title}`,
      paper.primaryTopicName ? `Primary topic: ${paper.primaryTopicName}` : "",
      paper.abstract ? `Abstract: ${paper.abstract}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 24_000);
  }

  generateContentHash(paper: {
    title: string;
    abstract?: string | null;
    primaryTopicName?: string;
  }): string {
    return createHash("sha256").update(this.buildContent(paper)).digest("hex");
  }

  private async enqueuePapersWithoutStatus(batchSize: number): Promise<number> {
    const papers = await this.prisma.paper.findMany({
      where: { embeddingRecord: null },
      take: Math.max(1, Math.min(batchSize, 200)),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        abstract: true,
        primaryTopic: { select: { displayName: true } },
      },
    });
    if (!papers.length) return 0;
    const result = await this.prisma.embeddingRecord.createMany({
      data: papers.map((paper) => ({
        paperId: paper.id,
        embeddingVersion: "v1",
        model: this.embeddings.model,
        contentHash: this.generateContentHash({
          title: paper.title,
          abstract: paper.abstract,
          primaryTopicName: paper.primaryTopic?.displayName,
        }),
        status: "PENDING",
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async processPendingPapers(
    batchSize = 50,
    retryFailed = false,
  ): Promise<SyncResult> {
    if (!this.embeddings.isConfigured()) {
      throw new Error(
        "Vector sync is ready but EMBEDDING_API_KEY is not configured.",
      );
    }
    await this.qdrant.ensureCollection();
    await this.enqueuePapersWithoutStatus(batchSize);

    const papers = await this.prisma.paper.findMany({
      where: {
        embeddingRecord: {
          is: {
            status: {
              in: retryFailed ? ["PENDING", "FAILED"] : ["PENDING"],
            },
          },
        },
      },
      take: Math.max(1, Math.min(batchSize, 200)),
      orderBy: { createdAt: "asc" },
      include: {
        primaryTopic: true,
        authors: {
          orderBy: { authorPosition: "asc" },
          include: { author: true },
        },
      },
    });
    if (!papers.length) return { selected: 0, processed: 0, failed: 0 };

    const prepared = papers.map((paper) => {
      const content = this.buildContent({
        title: paper.title,
        abstract: paper.abstract,
        primaryTopicName: paper.primaryTopic?.displayName,
      });
      return {
        paper,
        content,
        contentHash: createHash("sha256").update(content).digest("hex"),
      };
    });

    await this.prisma.$transaction(
      prepared.map(({ paper, contentHash }) =>
        this.prisma.embeddingRecord.upsert({
          where: { paperId: paper.id },
          create: {
            paperId: paper.id,
            embeddingVersion: "v1",
            model: this.embeddings.model,
            contentHash,
            status: "PROCESSING",
          },
          update: {
            embeddingVersion: "v1",
            model: this.embeddings.model,
            contentHash,
            status: "PROCESSING",
            errorMessage: null,
          },
        }),
      ),
    );

    try {
      const vectors = await this.embeddings.embed(
        prepared.map((item) => item.content),
      );
      await this.qdrant.upsert(
        prepared.map(({ paper }, index) => ({
          id: paper.id,
          vector: vectors[index],
          payload: {
            paperId: paper.id,
            openalexId: paper.openalexId,
            title: paper.title,
            abstract: paper.abstract,
            publicationYear: paper.publicationYear,
            citedByCount: paper.citedByCount,
            doi: paper.doi,
            landingPageUrl: paper.landingPageUrl,
            primaryTopic: paper.primaryTopic?.displayName || null,
            authors: paper.authors.map((item) => item.author.displayName),
          },
        })),
      );

      await this.prisma.$transaction(
        prepared.map(({ paper, contentHash }) =>
          this.prisma.embeddingRecord.updateMany({
            where: {
              paperId: paper.id,
              contentHash,
              status: "PROCESSING",
            },
            data: {
              qdrantPointId: paper.id,
              status: "COMPLETED",
              errorMessage: null,
            },
          }),
        ),
      );
      this.logger.log(`Synced ${prepared.length} papers to Qdrant`);
      return {
        selected: prepared.length,
        processed: prepared.length,
        failed: 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rateLimited = /quota|rate.?limit|too many requests|\b429\b/i.test(
        message,
      );
      const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
      const retryAfterMs = Math.min(
        60_000,
        Math.max(
          1_000,
          Math.ceil(Number(retryMatch?.[1] || 60) * 1_000) + 1_000,
        ),
      );
      await this.prisma.$transaction(
        prepared.map(({ paper, contentHash }) =>
          this.prisma.embeddingRecord.updateMany({
            where: {
              paperId: paper.id,
              contentHash,
              status: "PROCESSING",
            },
            data: {
              status: rateLimited ? "PENDING" : "FAILED",
              errorMessage: message.slice(0, 65_535),
            },
          }),
        ),
      );
      if (rateLimited) {
        this.logger.warn(
          `Embedding quota reached; returned ${prepared.length} papers to PENDING and will retry after ${retryAfterMs}ms`,
        );
      } else {
        this.logger.error(`Vector sync batch failed: ${message}`);
      }
      return {
        selected: prepared.length,
        processed: 0,
        failed: rateLimited ? 0 : prepared.length,
        ...(rateLimited ? { retryAfterMs } : {}),
      };
    }
  }

  async syncAll(batchSize = 50, retryFailed = false): Promise<SyncResult> {
    const total: SyncResult = { selected: 0, processed: 0, failed: 0 };
    while (true) {
      const batch = await this.processPendingPapers(batchSize, retryFailed);
      if (batch.retryAfterMs) {
        this.logger.warn(
          `Pausing vector sync for ${batch.retryAfterMs}ms to respect provider quota`,
        );
        await new Promise((resolve) => setTimeout(resolve, batch.retryAfterMs));
        continue;
      }
      total.selected += batch.selected;
      total.processed += batch.processed;
      total.failed += batch.failed;
      if (batch.selected === 0 || batch.failed > 0) break;
    }
    return total;
  }
}
