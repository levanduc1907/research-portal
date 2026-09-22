import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ChatService } from "./chat.service";
import { ChatRequestDto, ChatResponseDto } from "@repo/contracts";

@ApiTags("Chat & Assistant")
@Controller("v1/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: "Ask a question about recent UIUC research (unary)" })
  async askQuestion(@Body() body: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.processQuestion(body);
  }

  @Post("stream")
  @ApiOperation({
    summary:
      "Ask a question with continuous ChatGPT-like streaming response (SSE)",
  })
  async streamQuestion(
    @Body() body: ChatRequestDto,
    @Res() res: Response
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    await this.chatService.streamQuestion(body, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.end();
  }
}
