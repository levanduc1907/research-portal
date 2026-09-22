import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class PaperEmbeddingService {
  private readonly logger = new Logger(PaperEmbeddingService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateContentHash(paper: {
    title: string;
    abstract?: string | null;
    primaryTopicName?: string;
  }): string {
    const text = [
      paper.title,
      paper.abstract || "",
      paper.primaryTopicName || "",
    ].join("\n");

    return crypto.createHash("sha256").update(text).digest("hex");
  }

  async processPendingPapers(batchSize = 20): Promise<{ processed: number }> {
    try {
      const papers = await this.prisma.paper.findMany({
        where: {
          embeddingRecord: null,
        },
        take: batchSize,
        include: {
          primaryTopic: true,
        },
      });

      let processed = 0;
      for (const p of papers) {
        const hash = this.generateContentHash({
          title: p.title,
          abstract: p.abstract,
          primaryTopicName: p.primaryTopic?.displayName,
        });

        await this.prisma.embeddingRecord.create({
          data: {
            paperId: p.id,
            embeddingVersion: "v1",
            model: "text-embedding-3-small",
            contentHash: hash,
            status: "COMPLETED",
          },
        });
        processed++;
      }

      this.logger.log(`Processed ${processed} paper embedding records`);
      return { processed };
    } catch (e: any) {
      this.logger.warn(`Paper embedding skipped: ${e?.message || e}`);
      return { processed: 0 };
    }
  }
}
