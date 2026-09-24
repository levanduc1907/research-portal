import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OpenAlexAuthorEntityRaw,
  OpenAlexClient,
  mapOpenAlexAuthor,
  mapOpenAlexAuthorIdentity,
  mapOpenAlexWork,
  NormalizedWork,
} from "@repo/openalex";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { PrismaService } from "../../database/prisma.service";

type ImportResult = {
  totalFetched: number;
  totalImported: number;
  status: "COMPLETED" | "FAILED";
};

@Injectable()
export class OpenAlexImportService {
  private readonly logger = new Logger(OpenAlexImportService.name);
  private readonly client: OpenAlexClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.client = new OpenAlexClient({
      baseUrl: config.get<string>("OPENALEX_BASE_URL"),
      email: config.get<string>("OPENALEX_CONTACT_EMAIL"),
      apiKey: config.get<string>("OPENALEX_API_KEY"),
    });
  }

  private positiveInt(
    value: number | string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : fallback;
  }

  private parseDelimitedLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"';
          index++;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        values.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }
    values.push(value.trim());
    return values;
  }

  private parseKeywords(value: string, limit: number): string[] {
    const content = value.trim().replace(/^\{/, "").replace(/\}$/, "");
    if (!content) return [];
    return [
      ...new Set(
        this.parseDelimitedLine(content, ",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ].slice(0, limit);
  }

  private async createRun(source: string, resume: boolean) {
    const previous = resume
      ? await this.prisma.importRun.findFirst({
          where: {
            source,
            status: { in: ["FAILED", "RUNNING"] },
            cursor: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        })
      : null;
    return this.prisma.importRun.create({
      data: {
        source,
        status: "RUNNING",
        startedAt: new Date(),
        cursor: previous?.cursor || "*",
        totalFetched: previous?.totalFetched || 0,
        importedCount: previous?.importedCount || 0,
      },
    });
  }

  private readonly topicCache = new Map<string, string>();
  private readonly authorCache = new Map<string, string>();

  private normalizePersonName(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(dr|prof)\.?\s+/i, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .toLowerCase();
  }

  private personNameScore(expected: string, candidate: string): number {
    const expectedTokens = this.normalizePersonName(expected).split(" ");
    const candidateTokens = this.normalizePersonName(candidate).split(" ");
    if (expectedTokens.join(" ") === candidateTokens.join(" ")) return 100;
    if (
      expectedTokens.length === candidateTokens.length &&
      [...expectedTokens].sort().join(" ") ===
        [...candidateTokens].sort().join(" ")
    ) {
      return 98;
    }
    const expectedFirst = expectedTokens[0] || "";
    const candidateFirst = candidateTokens[0] || "";
    const expectedLast = expectedTokens.at(-1) || "";
    const candidateLast = candidateTokens.at(-1) || "";
    if (expectedLast !== candidateLast) return 0;
    if (expectedFirst === candidateFirst) {
      const overlap = expectedTokens.filter((token) =>
        candidateTokens.includes(token),
      ).length;
      return 85 + Math.min(10, overlap * 2);
    }
    if (expectedFirst[0] && expectedFirst[0] === candidateFirst[0]) return 75;
    return 0;
  }

  private async upsertOpenAlexAuthor(
    raw: OpenAlexAuthorEntityRaw,
  ): Promise<string> {
    const author = mapOpenAlexAuthorIdentity(raw);
    const record = await this.prisma.author.upsert({
      where: { openalexId: author.openalexId },
      update: { displayName: author.displayName, orcid: author.orcid },
      create: author,
    });
    this.authorCache.set(author.openalexId, record.id);
    return record.id;
  }

  private async resolveOpenAlexAuthor(
    name: string,
    openalexId?: string,
    institutionId: string = "I157725225",
  ): Promise<OpenAlexAuthorEntityRaw> {
    if (openalexId) {
      return this.client.getAuthor(openalexId);
    }

    const response = await this.client.getAuthors({
      institutionId,
      search: name,
      perPage: 25,
    });
    const ranked = response.results
      .map((candidate) => ({
        candidate,
        score: Math.max(
          ...[
            candidate.display_name,
            ...(candidate.display_name_alternatives || []),
          ]
            .filter((value): value is string => Boolean(value))
            .map((value) => this.personNameScore(name, value)),
        ),
      }))
      .filter((item) => item.score >= 85)
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.candidate.works_count || 0) -
            (left.candidate.works_count || 0),
      );

    if (
      !ranked.length ||
      ranked.filter((item) => item.score === ranked[0].score).length !== 1
    ) {
      throw new Error(
        `Cannot uniquely resolve an OpenAlex UIUC author for "${name}" with a safe name score`,
      );
    }
    return ranked[0].candidate;
  }

  private async upsertTopic(
    topic: NormalizedWork["topics"][number],
  ): Promise<string | null> {
    if (!topic || !topic.openalexId) return null;
    const cached = this.topicCache.get(topic.openalexId);
    if (cached) return cached;

    const existing = await this.prisma.topic.findUnique({
      where: { openalexId: topic.openalexId },
    });
    if (existing) {
      this.topicCache.set(topic.openalexId, existing.id);
      return existing.id;
    }

    try {
      const record = await this.prisma.topic.create({
        data: {
          openalexId: topic.openalexId,
          displayName: topic.displayName,
          subfieldId: topic.subfieldId,
          subfieldName: topic.subfieldName,
          fieldId: topic.fieldId,
          fieldName: topic.fieldName,
          domainId: topic.domainId,
          domainName: topic.domainName,
        },
      });
      this.topicCache.set(topic.openalexId, record.id);
      return record.id;
    } catch {
      const found = await this.prisma.topic.findUnique({
        where: { openalexId: topic.openalexId },
      });
      if (found) {
        this.topicCache.set(topic.openalexId, found.id);
        return found.id;
      }
      return null;
    }
  }

  private async upsertAuthor(
    item: NormalizedWork["authors"][number],
  ): Promise<string | null> {
    if (!item || !item.openalexId) return null;
    const cached = this.authorCache.get(item.openalexId);
    if (cached) return cached;

    const existing = await this.prisma.author.findUnique({
      where: { openalexId: item.openalexId },
    });
    if (existing) {
      this.authorCache.set(item.openalexId, existing.id);
      return existing.id;
    }

    try {
      const author = await this.prisma.author.create({
        data: {
          openalexId: item.openalexId,
          displayName: item.displayName,
          orcid: item.orcid,
        },
      });
      this.authorCache.set(item.openalexId, author.id);
      return author.id;
    } catch {
      const found = await this.prisma.author.findUnique({
        where: { openalexId: item.openalexId },
      });
      if (found) {
        this.authorCache.set(item.openalexId, found.id);
        return found.id;
      }
      return null;
    }
  }

  private async persistWork(normalized: NormalizedWork): Promise<void> {
    const topicIds = new Map<string, string>();
    for (const topic of normalized.topics) {
      if (!topic?.openalexId) continue;
      const topicId = await this.upsertTopic(topic);
      if (topicId) {
        topicIds.set(topic.openalexId, topicId);
      }
    }

    const primaryTopic = normalized.topics.find((topic) => topic.isPrimary);
    const primaryTopicId = primaryTopic?.openalexId
      ? topicIds.get(primaryTopic.openalexId) || null
      : null;
    const paper = await this.prisma.paper.upsert({
      where: { openalexId: normalized.paper.openalexId },
      update: { ...normalized.paper, primaryTopicId },
      create: { ...normalized.paper, primaryTopicId },
    });
    const embeddingContent = [
      `Title: ${normalized.paper.title}`,
      primaryTopic?.displayName
        ? `Primary topic: ${primaryTopic.displayName}`
        : "",
      normalized.paper.abstract ? `Abstract: ${normalized.paper.abstract}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 24_000);
    const contentHash = createHash("sha256")
      .update(embeddingContent)
      .digest("hex");
    await this.prisma.embeddingRecord.updateMany({
      where: {
        paperId: paper.id,
        contentHash: { not: contentHash },
      },
      data: { status: "PENDING", errorMessage: null },
    });
    await this.prisma.embeddingRecord.createMany({
      data: [
        {
          paperId: paper.id,
          embeddingVersion: "v1",
          model:
            this.config.get<string>("EMBEDDING_MODEL") ||
            "text-embedding-3-small",
          contentHash,
          status: "PENDING",
        },
      ],
      skipDuplicates: true,
    });

    for (const topic of normalized.topics) {
      if (!topic?.openalexId) continue;
      const topicId = topicIds.get(topic.openalexId);
      if (!topicId) continue;
      await this.prisma.paperTopic.upsert({
        where: { paperId_topicId: { paperId: paper.id, topicId } },
        update: { score: topic.score, isPrimary: topic.isPrimary },
        create: {
          paperId: paper.id,
          topicId,
          score: topic.score,
          isPrimary: topic.isPrimary,
        },
      });
    }

    const uniqueAuthors = new Map<string, NormalizedWork["authors"][number]>();
    for (const item of normalized.authors) {
      if (item?.openalexId && !uniqueAuthors.has(item.openalexId)) {
        uniqueAuthors.set(item.openalexId, item);
      }
    }

    for (const item of uniqueAuthors.values()) {
      const authorId = await this.upsertAuthor(item);
      if (!authorId) continue;
      await this.prisma.paperAuthor.upsert({
        where: { paperId_authorId: { paperId: paper.id, authorId } },
        update: {
          authorPosition: item.position,
          isCorresponding: item.isCorresponding,
        },
        create: {
          paperId: paper.id,
          authorId,
          authorPosition: item.position,
          isCorresponding: item.isCorresponding,
        },
      });
    }
  }

  async runImport(
    params: {
      institutionId?: string;
      fromYear?: number;
      toYear?: number;
      fromDate?: string;
      toDate?: string;
      targetCount?: number;
      perPage?: number;
      resume?: boolean;
    } = {},
  ): Promise<ImportResult> {
    const fromDate =
      params.fromDate ||
      this.config.get<string>("IMPORT_FROM_DATE") ||
      process.env.IMPORT_FROM_DATE ||
      undefined;
    const toDate =
      params.toDate ||
      this.config.get<string>("IMPORT_TO_DATE") ||
      process.env.IMPORT_TO_DATE ||
      undefined;
    const fromYear = fromDate
      ? undefined
      : this.positiveInt(
          params.fromYear ||
            this.config.get("IMPORT_FROM_YEAR") ||
            process.env.IMPORT_FROM_YEAR,
          2024,
        );
    const toYear = toDate
      ? undefined
      : this.positiveInt(
          params.toYear ||
            this.config.get("IMPORT_TO_YEAR") ||
            process.env.IMPORT_TO_YEAR,
          2026,
        );
    const targetCount = this.positiveInt(
      params.targetCount ||
        this.config.get("IMPORT_PAPER_TARGET") ||
        process.env.IMPORT_PAPER_TARGET,
      100_000,
    );
    const perPage = Math.min(
      this.positiveInt(
        params.perPage ||
          this.config.get("IMPORT_BATCH_SIZE") ||
          process.env.IMPORT_BATCH_SIZE,
        200,
      ),
      200,
    );
    const institutionId =
      params.institutionId ||
      this.config.get<string>("UIUC_OPENALEX_INSTITUTION_ID") ||
      process.env.UIUC_OPENALEX_INSTITUTION_ID ||
      "I157725225";
    const run = await this.createRun("openalex_works", params.resume !== false);
    let cursor = run.cursor || "*";
    let totalFetched = run.totalFetched;
    let totalImported = run.importedCount;
    const rangeDescription =
      fromDate || toDate
        ? `${fromDate || "beginning"} to ${toDate || "now"}`
        : `${fromYear}-${toYear}`;
    this.logger.log(
      `Importing up to ${targetCount} UIUC papers (${rangeDescription}), ${perPage} per batch.`,
    );

    try {
      while (cursor && totalFetched < targetCount) {
        const response = await this.client.getWorks({
          institutionId,
          cursor,
          perPage,
          fromYear,
          toYear,
          fromDate,
          toDate,
        });
        const rows = response.results.slice(0, targetCount - totalFetched);
        if (!rows.length) break;
        for (const raw of rows) {
          await this.persistWork(mapOpenAlexWork(raw));
          totalImported++;
        }
        totalFetched += rows.length;
        cursor = response.meta.next_cursor || "";
        await this.prisma.importRun.update({
          where: { id: run.id },
          data: { cursor, totalFetched, importedCount: totalImported },
        });
        this.logger.log(`Papers: ${totalImported}/${targetCount}`);
      }
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), cursor },
      });
      return { totalFetched, totalImported, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
          cursor,
        },
      });
      this.logger.error(
        `Paper import failed after ${totalImported} records: ${message}`,
      );
      return { totalFetched, totalImported, status: "FAILED" };
    }
  }

  async runFacultyImport(
    params: {
      institutionId?: string;
      targetCount?: number;
      perPage?: number;
      resume?: boolean;
    } = {},
  ): Promise<ImportResult> {
    const targetCount = this.positiveInt(
      params.targetCount || process.env.IMPORT_FACULTY_TARGET,
      1_000,
    );
    const perPage = Math.min(
      this.positiveInt(params.perPage || process.env.IMPORT_BATCH_SIZE, 200),
      200,
    );
    const institutionId =
      params.institutionId ||
      process.env.UIUC_OPENALEX_INSTITUTION_ID ||
      "I157725225";
    const run = await this.createRun(
      "openalex_faculty",
      params.resume !== false,
    );
    let cursor = run.cursor || "*";
    let totalFetched = run.totalFetched;
    let totalImported = run.importedCount;
    this.logger.log(
      `Importing up to ${targetCount} UIUC researchers, ${perPage} per batch.`,
    );

    try {
      while (cursor && totalFetched < targetCount) {
        const response = await this.client.getAuthors({
          institutionId,
          cursor,
          perPage,
        });
        const rows = response.results.slice(0, targetCount - totalFetched);
        if (!rows.length) break;
        for (const raw of rows) {
          const item = mapOpenAlexAuthor(raw);
          const authorId = await this.upsertOpenAlexAuthor(raw);
          const { keywords, ...researcherData } = item;
          const researcher = await this.prisma.researcher.upsert({
            where: { authorId },
            update: { ...researcherData, authorId },
            create: { ...researcherData, authorId },
          });
          await this.prisma.researcherKeyword.deleteMany({
            where: { researcherId: researcher.id },
          });
          if (keywords.length) {
            await this.prisma.researcherKeyword.createMany({
              data: keywords.map((keyword) => ({
                researcherId: researcher.id,
                keyword,
              })),
            });
          }
          totalImported++;
        }
        totalFetched += rows.length;
        cursor = response.meta.next_cursor || "";
        await this.prisma.importRun.update({
          where: { id: run.id },
          data: { cursor, totalFetched, importedCount: totalImported },
        });
        this.logger.log(`Researchers: ${totalImported}/${targetCount}`);
      }
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), cursor },
      });
      return { totalFetched, totalImported, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
          cursor,
        },
      });
      this.logger.error(
        `Faculty import failed after ${totalImported} records: ${message}`,
      );
      return { totalFetched, totalImported, status: "FAILED" };
    }
  }

  async runFacultyCsvImport(filePath: string): Promise<ImportResult> {
    const keywordLimit = this.positiveInt(
      process.env.IMPORT_KEYWORDS_LIMIT,
      40,
    );
    const run = await this.prisma.importRun.create({
      data: { source: "faculty_csv", status: "RUNNING", startedAt: new Date() },
    });
    let totalFetched = 0;
    let totalImported = 0;

    try {
      const input = createInterface({
        input: createReadStream(filePath),
        crlfDelay: Infinity,
      });
      let headers: string[] | null = null;
      let delimiter = ",";

      for await (const rawLine of input) {
        const line = rawLine.trim();
        if (!line) continue;
        if (!headers) {
          delimiter = rawLine.includes("\t") ? "\t" : ",";
          headers = this.parseDelimitedLine(
            rawLine.replace(/^\uFEFF/, ""),
            delimiter,
          ).map((header) => header.toLowerCase());
          const required = [
            "email",
            "name",
            "photo_url",
            "position",
            "keywords",
          ];
          const missing = required.filter(
            (column) => !headers?.includes(column),
          );
          if (missing.length)
            throw new Error(
              `Faculty file is missing columns: ${missing.join(", ")}`,
            );
          continue;
        }

        const values = this.parseDelimitedLine(rawLine, delimiter);
        const row = Object.fromEntries(
          headers.map((header, index) => [header, values[index] || ""]),
        );
        if (!row.email && !row.name) continue;
        totalFetched++;
        if (!row.email || !row.name) {
          throw new Error(
            `Invalid faculty row ${totalFetched + 1}: email and name are required`,
          );
        }

        const openAlexAuthor = await this.resolveOpenAlexAuthor(
          row.name,
          row.openalex_id || undefined,
        );
        const authorId = await this.upsertOpenAlexAuthor(openAlexAuthor);
        const existingResearcher = await this.prisma.researcher.findUnique({
          where: { email: row.email },
        });
        const researcher = existingResearcher
          ? await this.prisma.researcher.update({
              where: { id: existingResearcher.id },
              data: {
                authorId,
                openalexId: openAlexAuthor.id,
                name: row.name,
                photoUrl: row.photo_url || null,
                title: row.position || null,
              },
            })
          : await this.prisma.researcher.create({
              data: {
                authorId,
                openalexId: openAlexAuthor.id,
                email: row.email,
                name: row.name,
                photoUrl: row.photo_url || null,
                title: row.position || null,
              },
            });
        const keywords = this.parseKeywords(row.keywords, keywordLimit);
        await this.prisma.researcherKeyword.deleteMany({
          where: { researcherId: researcher.id },
        });
        if (keywords.length) {
          await this.prisma.researcherKeyword.createMany({
            data: keywords.map((keyword) => ({
              researcherId: researcher.id,
              keyword,
            })),
          });
        }
        totalImported++;

        if (totalImported % 100 === 0) {
          await this.prisma.importRun.update({
            where: { id: run.id },
            data: { totalFetched, importedCount: totalImported },
          });
          this.logger.log(`CSV researchers: ${totalImported}`);
        }
      }

      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          totalFetched,
          importedCount: totalImported,
          completedAt: new Date(),
        },
      });
      return { totalFetched, totalImported, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          totalFetched,
          importedCount: totalImported,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      this.logger.error(
        `Faculty CSV import failed after ${totalImported} records: ${message}`,
      );
      return { totalFetched, totalImported, status: "FAILED" };
    }
  }

  async linkExistingResearchersToAuthors(): Promise<ImportResult> {
    const researchers = await this.prisma.researcher.findMany({
      where: { authorId: null },
      orderBy: { createdAt: "asc" },
    });
    let totalImported = 0;
    const failures: string[] = [];

    try {
      const authors = await this.prisma.author.findMany({
        select: { id: true, openalexId: true, displayName: true },
      });
      const authorsByName = new Map<string, typeof authors>();
      for (const author of authors) {
        const normalized = this.normalizePersonName(author.displayName);
        authorsByName.set(normalized, [
          ...(authorsByName.get(normalized) || []),
          author,
        ]);
      }
      const researcherNameCounts = new Map<string, number>();
      for (const researcher of researchers) {
        const normalized = this.normalizePersonName(researcher.name);
        researcherNameCounts.set(
          normalized,
          (researcherNameCounts.get(normalized) || 0) + 1,
        );
      }

      const unresolved = [] as typeof researchers;
      for (const researcher of researchers) {
        const normalized = this.normalizePersonName(researcher.name);
        const localMatches = authorsByName.get(normalized) || [];
        if (
          localMatches.length === 1 &&
          researcherNameCounts.get(normalized) === 1
        ) {
          const author = localMatches[0];
          await this.prisma.researcher.update({
            where: { id: researcher.id },
            data: { authorId: author.id, openalexId: author.openalexId },
          });
          totalImported++;
        } else {
          unresolved.push(researcher);
        }
      }
      this.logger.log(
        `Linked ${totalImported} researchers from local OpenAlex authors; resolving ${unresolved.length} through OpenAlex.`,
      );

      const concurrency = 5;
      for (let index = 0; index < unresolved.length; index += concurrency) {
        const batch = unresolved.slice(index, index + concurrency);
        const results = await Promise.allSettled(
          batch.map(async (researcher) => {
            const raw = await this.resolveOpenAlexAuthor(
              researcher.name,
              researcher.openalexId || undefined,
            );
            const authorId = await this.upsertOpenAlexAuthor(raw);
            await this.prisma.researcher.update({
              where: { id: researcher.id },
              data: { authorId, openalexId: raw.id },
            });
          }),
        );
        results.forEach((result, resultIndex) => {
          if (result.status === "fulfilled") {
            totalImported++;
          } else {
            failures.push(
              `${batch[resultIndex].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            );
          }
        });
        const budgetFailure = results.find(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof Error &&
            result.reason.message.includes("rate limit budget is exhausted"),
        );
        if (budgetFailure?.status === "rejected") {
          throw budgetFailure.reason;
        }
        if ((index + batch.length) % 25 === 0) {
          this.logger.log(
            `Researcher-author backfill: ${totalImported}/${researchers.length}`,
          );
        }
      }

      const unlinkedCount = await this.prisma.researcher.count({
        where: { authorId: null },
      });
      if (unlinkedCount !== 0) {
        throw new Error(
          `${unlinkedCount} researchers remain without an OpenAlex author. ${failures.slice(0, 10).join(" | ")}`,
        );
      }

      return {
        totalFetched: researchers.length,
        totalImported,
        status: "COMPLETED",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Researcher-author linking failed: ${message}`);
      return {
        totalFetched: researchers.length,
        totalImported,
        status: "FAILED",
      };
    }
  }
}
