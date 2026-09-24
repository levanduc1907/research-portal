import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { DatabaseModule } from "../database/database.module";
import { AiProvidersModule } from "../ai-providers/ai-providers.module";
import { VectorModule } from "../vector/vector.module";

@Module({
  imports: [DatabaseModule, AiProvidersModule, VectorModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
