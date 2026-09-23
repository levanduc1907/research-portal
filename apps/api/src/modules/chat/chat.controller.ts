import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ChatService } from "./chat.service";
import { ChatRequestDto, ChatResponseDto } from "@repo/contracts";

@ApiTags("Chat & Assistant")
@Controller("v1/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: "Ask a question about recent UIUC research (unary)",
  })
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
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    const controller = new AbortController();
    req.on("aborted", () => controller.abort());
    res.on("close", () => controller.abort());

    await this.chatService.streamQuestion(
      body,
      (chunk) => {
        if (res.writableEnded || controller.signal.aborted) return;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        (res as Response & { flush?: () => void }).flush?.();
      },
      controller.signal,
    );

    if (!res.writableEnded) res.end();
  }
}
