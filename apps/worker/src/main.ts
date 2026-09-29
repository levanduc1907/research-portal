import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { AppModule } from "./app.module";
import { OpenAlexImportService } from "./jobs/openalex-import/openalex-import.service";
import { PaperEmbeddingService } from "./jobs/paper-embedding/paper-embedding.service";

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  const app = await NestFactory.createApplicationContext(AppModule);

  const command = process.argv[2];
  if (
    command === "import-papers" ||
    command === "import-faculty" ||
    command === "import-faculty-csv" ||
    command === "import-phase2" ||
    command === "sync-institution" ||
    command === "link-researcher-authors" ||
    command === "sync-researcher-affiliations" ||
    command === "sync-researcher-metrics" ||
    command === "sync-researcher-topics" ||
    command === "audit-researcher-identities" ||
    command === "apply-researcher-identity-review" ||
    command === "backfill-reviewed-researcher-papers" ||
    command === "backfill-researcher-papers" ||
    command === "backfill-researcher-departments" ||
    command === "sync-vectors"
  ) {
    const importer = app.get(OpenAlexImportService);
    let failed = false;

    if (command === "sync-institution" || command === "import-phase2") {
      const result = await importer.syncInstitutionProfile();
      failed ||= result.status === "FAILED";
    }
    if (command === "import-papers" || command === "import-phase2") {
      const result = await importer.runImport();
      failed ||= result.status === "FAILED";
    }
    if (command === "import-faculty" || command === "import-phase2") {
      const result = await importer.runFacultyImport();
      failed ||= result.status === "FAILED";
    }
    if (command === "import-faculty-csv") {
      const rawPath = process.argv
        .slice(3)
        .find((arg) => arg !== "--" && !arg.startsWith("-"));
      if (!rawPath)
        throw new Error(
          "Usage: pnpm --filter worker import:faculty:csv -- /path/to/faculty.csv",
        );
      const candidates = [
        rawPath,
        resolve(process.cwd(), rawPath),
        resolve(process.cwd(), "..", "..", rawPath),
      ];
      const filePath = candidates.find((c) => existsSync(c)) || rawPath;
      const result = await importer.runFacultyCsvImport(filePath);
      failed ||= result.status === "FAILED";
    }
    if (command === "link-researcher-authors") {
      const result = await importer.linkExistingResearchersToAuthors();
      failed ||= result.status === "FAILED";
    }
    if (command === "sync-researcher-affiliations") {
      const result = await importer.syncResearcherAuthorAffiliations();
      logger.log(
        `Researcher affiliation sync finished: ${result.totalImported} unique authors linked from ${result.totalFetched} researchers`,
      );
      failed ||= result.status === "FAILED";
    }
    if (command === "sync-researcher-metrics") {
      const result = await importer.syncResearcherMetrics();
      logger.log(
        `Researcher metrics finished: ${result.totalImported}/${result.totalFetched} checked, ${result.changed} corrected, ${result.failed} failed`,
      );
      failed ||= result.status === "FAILED";
    }
    if (command === "sync-researcher-topics") {
      const researcherId = process.argv
        .find((arg) => arg.startsWith("--researcher-id="))
        ?.split("=")[1];
      const result = await importer.syncResearcherTopics(
        researcherId,
        process.argv.includes("--only-missing"),
      );
      logger.log(
        `Researcher topic sync finished: ${result.totalImported}/${result.totalFetched} synced, ${result.failed} failed`,
      );
      failed ||= result.status === "FAILED";
    }
    if (command === "audit-researcher-identities") {
      const outputDirectory = process.argv
        .find((arg) => arg.startsWith("--output="))
        ?.split("=")[1];
      const result = await importer.auditResearcherIdentities(outputDirectory);
      logger.log(
        `Researcher identity audit finished: ${result.linked}/${result.total} linked, ${result.unlinked} unlinked, ${result.review} name review, ${result.highRisk} high risk, ${result.missingUiucAffiliation} missing UIUC affiliation`,
      );
      logger.log(`Full report: ${result.fullReportPath}`);
      logger.log(`Review report: ${result.reviewReportPath}`);
    }
    if (command === "apply-researcher-identity-review") {
      const filePath = process.argv
        .slice(3)
        .find((arg) => arg !== "--" && !arg.startsWith("-"));
      if (!filePath) {
        throw new Error(
          "Usage: pnpm --filter worker apply:researcher-identity-review -- /path/to/review.csv",
        );
      }
      const result = await importer.applyResearcherIdentityReview(
        resolve(process.env.INIT_CWD || process.cwd(), filePath),
      );
      logger.log(
        `Curated identity import finished: ${result.applied}/${result.requested} applied (${result.changed} changed, ${result.unchanged} unchanged), ${result.skipped} null skipped, ${result.failed} failed`,
      );
      failed ||= result.failed > 0;
    }
    if (command === "backfill-reviewed-researcher-papers") {
      const filePath = process.argv
        .slice(3)
        .find((arg) => arg !== "--" && !arg.startsWith("-"));
      if (!filePath) {
        throw new Error(
          "Usage: pnpm --filter worker backfill:reviewed-researcher-papers -- /path/to/review.csv",
        );
      }
      const researcherIds = await importer.reviewedResearcherIds(
        resolve(process.env.INIT_CWD || process.cwd(), filePath),
      );
      const result = await importer.runResearcherPaperBackfill({
        researcherIds,
        perPage: 100,
        resume: !process.argv.includes("--restart"),
        trustLinkedIdentity: true,
      });
      logger.log(
        `Reviewed researcher paper backfill finished: ${result.researchersProcessed}/${researcherIds.length} researchers, ${result.totalImported} works persisted, ${result.unresolved} unresolved`,
      );
      failed ||= result.status === "FAILED";
    }
    if (command === "backfill-researcher-papers") {
      const researcherId = process.argv
        .find((arg) => arg.startsWith("--researcher-id="))
        ?.split("=")[1];
      const perPage = Number(
        process.argv
          .find((arg) => arg.startsWith("--per-page="))
          ?.split("=")[1] || 100,
      );
      const maxResearchersValue = process.argv
        .find((arg) => arg.startsWith("--max-researchers="))
        ?.split("=")[1];
      const result = await importer.runResearcherPaperBackfill({
        researcherId,
        perPage,
        maxResearchers: maxResearchersValue
          ? Number(maxResearchersValue)
          : undefined,
        resume: !process.argv.includes("--restart"),
      });
      logger.log(
        `Researcher paper backfill finished: ${result.researchersProcessed} researchers, ${result.totalImported} works persisted, ${result.unresolved} unresolved`,
      );
      failed ||= result.status === "FAILED";
    }
    if (command === "backfill-researcher-departments") {
      const result = await importer.backfillResearcherDepartments();
      logger.log(
        `Department backfill finished: ${result.totalImported}/${result.totalFetched} researchers updated`,
      );
      failed ||= result.status === "FAILED";
    }
    if (command === "sync-vectors") {
      const batchSizeArg = process.argv.find((arg) =>
        arg.startsWith("--batch-size="),
      );
      const batchSize = Number(batchSizeArg?.split("=")[1] || 50);
      const retryFailed = process.argv.includes("--retry-failed");
      const once = process.argv.includes("--once");
      const embeddings = app.get(PaperEmbeddingService);
      const result = once
        ? await embeddings.processPendingPapers(batchSize, retryFailed)
        : await embeddings.syncAll(batchSize, retryFailed);
      logger.log(
        `Vector sync finished: ${result.processed} completed, ${result.failed} failed`,
      );
      failed ||= result.failed > 0;
    }

    await app.close();
    process.exitCode = failed ? 1 : 0;
    return;
  }

  logger.log("Research portal worker is running and ready to process jobs.");

  process.on("SIGINT", async () => {
    logger.log("Gracefully shutting down worker...");
    await app.close();
    process.exit(0);
  });
}

bootstrap();
