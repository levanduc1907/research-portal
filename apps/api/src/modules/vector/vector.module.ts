import { Module } from "@nestjs/common";
import { AiProvidersModule } from "../ai-providers/ai-providers.module";
import { VectorSearchService } from "./vector-search.service";

@Module({
  imports: [AiProvidersModule],
  providers: [VectorSearchService],
  exports: [VectorSearchService],
})
export class VectorModule {}
