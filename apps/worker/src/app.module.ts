import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "./database/database.module";
import { OpenAlexImportService } from "./jobs/openalex-import/openalex-import.service";
import { PaperEmbeddingService } from "./jobs/paper-embedding/paper-embedding.service";
import { EmbeddingProviderService } from "./vector/embedding-provider.service";
import { QdrantService } from "./vector/qdrant.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
  ],
  providers: [
    OpenAlexImportService,
    PaperEmbeddingService,
    EmbeddingProviderService,
    QdrantService,
  ],
  exports: [OpenAlexImportService, PaperEmbeddingService],
})
export class AppModule {}
