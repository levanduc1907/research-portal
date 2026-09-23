import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { AppModule } from "./app.module";
import { OpenAlexImportService } from "./jobs/openalex-import/openalex-import.service";

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  const app = await NestFactory.createApplicationContext(AppModule);

  const command = process.argv[2];
  if (
    command === "import-papers" ||
    command === "import-faculty" ||
    command === "import-faculty-csv" ||
    command === "import-phase2" ||
    command === "link-researcher-authors"
  ) {
    const importer = app.get(OpenAlexImportService);
    let failed = false;

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
