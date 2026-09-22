import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { OpenAlexClient, mapOpenAlexWork } from "@repo/openalex";

@Injectable()
export class OpenAlexImportService {
  private readonly logger = new Logger(OpenAlexImportService.name);
  private readonly client = new OpenAlexClient();

  constructor(private readonly prisma: PrismaService) {}

  async runImport(params: {
    institutionId?: string;
    fromYear?: number;
    toYear?: number;
    maxBatches?: number;
  } = {}): Promise<{ totalImported: number; status: string }> {
    const fromYear = params.fromYear || 2024;
    const toYear = params.toYear || 2026;
    const maxBatches = params.maxBatches || 5;

    this.logger.log(`Starting OpenAlex import for UIUC (years ${fromYear}-${toYear})...`);

    let importRun: any;
    try {
      importRun = await this.prisma.importRun.create({
        data: {
          source: "openalex",
          status: "RUNNING",
          startedAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not record import run in DB: ${e?.message || e}`);
    }

    let cursor = "*";
    let totalImported = 0;
    let batchCount = 0;

    try {
      while (cursor && batchCount < maxBatches) {
        batchCount++;
        this.logger.log(`Fetching batch ${batchCount} (cursor: ${cursor.substring(0, 10)}...)...`);

        const response = await this.client.getWorks({
          institutionId: params.institutionId || "I157725225",
          cursor,
          perPage: 50,
          fromYear,
          toYear,
        });

        if (!response.results || response.results.length === 0) {
          break;
        }

        for (const raw of response.results) {
          const normalized = mapOpenAlexWork(raw);

          // Find or create primary topic
          let primaryTopicId: string | null = null;
          const primaryTopic = normalized.topics.find((t) => t.isPrimary) || normalized.topics[0];

          if (primaryTopic) {
            const topicRecord = await this.prisma.topic.upsert({
              where: { openalexId: primaryTopic.openalexId },
              update: {
                displayName: primaryTopic.displayName,
                domainName: primaryTopic.domainName,
                fieldName: primaryTopic.fieldName,
                subfieldName: primaryTopic.subfieldName,
              },
              create: {
                openalexId: primaryTopic.openalexId,
                displayName: primaryTopic.displayName,
                domainName: primaryTopic.domainName,
                fieldName: primaryTopic.fieldName,
                subfieldName: primaryTopic.subfieldName,
              },
            });
            primaryTopicId = topicRecord.id;
          }

          // Upsert Paper
          const paper = await this.prisma.paper.upsert({
            where: { openalexId: normalized.paper.openalexId },
            update: {
              doi: normalized.paper.doi,
              title: normalized.paper.title,
              publicationDate: normalized.paper.publicationDate,
              publicationYear: normalized.paper.publicationYear,
              citedByCount: normalized.paper.citedByCount,
              abstract: normalized.paper.abstract,
              landingPageUrl: normalized.paper.landingPageUrl,
              pdfUrl: normalized.paper.pdfUrl,
              primaryTopicId,
            },
            create: {
              openalexId: normalized.paper.openalexId,
              doi: normalized.paper.doi,
              title: normalized.paper.title,
              publicationDate: normalized.paper.publicationDate,
              publicationYear: normalized.paper.publicationYear,
              citedByCount: normalized.paper.citedByCount,
              abstract: normalized.paper.abstract,
              landingPageUrl: normalized.paper.landingPageUrl,
              pdfUrl: normalized.paper.pdfUrl,
              primaryTopicId,
            },
          });

          // Upsert Authors and PaperAuthors
          for (const a of normalized.authors) {
            const author = await this.prisma.author.upsert({
              where: { openalexId: a.openalexId },
              update: { displayName: a.displayName, orcid: a.orcid },
              create: { openalexId: a.openalexId, displayName: a.displayName, orcid: a.orcid },
            });

            await this.prisma.paperAuthor.upsert({
              where: {
                paperId_authorId: {
                  paperId: paper.id,
                  authorId: author.id,
                },
              },
              update: { authorPosition: a.position, isCorresponding: a.isCorresponding },
              create: {
                paperId: paper.id,
                authorId: author.id,
                authorPosition: a.position,
                isCorresponding: a.isCorresponding,
              },
            });
          }

          totalImported++;
        }

        cursor = response.meta.next_cursor || "";
        if (importRun) {
          await this.prisma.importRun.update({
            where: { id: importRun.id },
            data: {
              cursor,
              importedCount: totalImported,
              totalFetched: totalImported,
            },
          });
        }
      }

      if (importRun) {
        await this.prisma.importRun.update({
          where: { id: importRun.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }

      this.logger.log(`OpenAlex import completed. Total imported/updated: ${totalImported}`);
      return { totalImported, status: "COMPLETED" };
    } catch (error: any) {
      this.logger.error(`OpenAlex import failed: ${error?.message || error}`);
      if (importRun) {
        await this.prisma.importRun.update({
          where: { id: importRun.id },
          data: {
            status: "FAILED",
            errorMessage: error?.message || String(error),
            completedAt: new Date(),
          },
        });
      }
      return { totalImported, status: "FAILED" };
    }
  }
}
