import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./modules/database/database.module";
import { InstitutionModule } from "./modules/institution/institution.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { PaperModule } from "./modules/papers/papers.module";
import { ResearcherModule } from "./modules/researchers/researchers.module";
import { ChatModule } from "./modules/chat/chat.module";
import { AiProvidersModule } from "./modules/ai-providers/ai-providers.module";
import { HealthController } from "./modules/health/health.controller";
import { SecurityModule } from "./modules/security/security.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SecurityModule,
    DatabaseModule,
    InstitutionModule,
    AnalyticsModule,
    PaperModule,
    ResearcherModule,
    ChatModule,
    AiProvidersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
