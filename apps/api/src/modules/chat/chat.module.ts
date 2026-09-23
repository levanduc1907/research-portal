import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { DatabaseModule } from "../database/database.module";
import { AiProvidersModule } from "../ai-providers/ai-providers.module";

@Module({
  imports: [DatabaseModule, AiProvidersModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
