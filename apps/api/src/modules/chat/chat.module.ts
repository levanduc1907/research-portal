import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { DatabaseModule } from "../database/database.module";
import { AiProvidersModule } from "../ai-providers/ai-providers.module";
import { VectorModule } from "../vector/vector.module";
import { ChatIntentClassifierService } from "./chat-intent-classifier.service";
import { ChatToolSelectorService } from "./chat-tool-selector.service";
import { ChatTraceService } from "./chat-trace.service";
import { ChatToolExecutorService } from "./chat-tool-executor.service";
import { ChatResponseGeneratorService } from "./chat-response-generator.service";
import { InstitutionModule } from "../institution/institution.module";

@Module({
  imports: [DatabaseModule, AiProvidersModule, VectorModule, InstitutionModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatIntentClassifierService,
    ChatToolSelectorService,
    ChatTraceService,
    ChatToolExecutorService,
    ChatResponseGeneratorService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
