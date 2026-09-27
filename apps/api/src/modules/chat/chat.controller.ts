import {
  Body,
  Controller,
  Post,
  Req,
  RequestTimeoutException,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ChatService } from "./chat.service";
import type { ChatResponseDto } from "@repo/contracts";
import { ChatAdmissionService } from "../security/chat-admission.service";
import type { SecurityRequest } from "../security/security.types";
import { ChatRequestBody } from "./chat-request.dto";

@ApiTags("Chat & Assistant")
@Controller("v1/chat")
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly admission: ChatAdmissionService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Ask a question about recent UIUC research (unary)",
  })
  async askQuestion(
    @Body() body: ChatRequestBody,
    @Req() req: SecurityRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ChatResponseDto> {
    const lease = await this.admission.acquire(req, res);
    const scopedBody = this.scopeConversation(body, req);
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.admission.requestTimeoutMs());
    const abort = () => controller.abort();
    req.once("aborted", abort);

    try {
      return await this.chatService.processQuestion(
        scopedBody,
        controller.signal,
      );
    } catch (error) {
      if (timedOut) {
        throw new RequestTimeoutException(
          "The research assistant took too long to respond.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      req.off("aborted", abort);
      await lease.release();
    }
  }

  @Post("stream")
  @ApiOperation({
    summary:
      "Ask a question with continuous ChatGPT-like streaming response (SSE)",
  })
  async streamQuestion(
    @Body() body: ChatRequestBody,
    @Req() req: SecurityRequest,
    @Res() res: Response,
  ): Promise<void> {
    const lease = await this.admission.acquire(req, res);
    const scopedBody = this.scopeConversation(body, req);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    req.once("aborted", abort);
    res.once("close", abort);
    const timeout = setTimeout(() => {
      if (!res.writableEnded && !controller.signal.aborted) {
        res.write(
          `data: ${JSON.stringify({
            status: "error",
            errorCode: "CHAT_TIMEOUT",
            error: "The research assistant took too long to respond.",
            done: true,
          })}\n\n`,
        );
        res.end();
      }
      controller.abort();
    }, this.admission.requestTimeoutMs());

    try {
      await this.chatService.streamQuestion(
        scopedBody,
        (chunk) => {
          if (res.writableEnded || controller.signal.aborted) return;
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          (res as Response & { flush?: () => void }).flush?.();
        },
        controller.signal,
      );
      if (!res.writableEnded) res.end();
    } finally {
      clearTimeout(timeout);
      req.off("aborted", abort);
      res.off("close", abort);
      await lease.release();
    }
  }

  private scopeConversation(
    body: ChatRequestBody,
    req: SecurityRequest,
  ): ChatRequestBody {
    if (!body.conversationId || !req.securityIdentity) return body;
    const owner = req.securityIdentity.userId || req.securityIdentity.sessionId;
    return {
      ...body,
      conversationId: `${owner}_${body.conversationId}`,
    };
  }
}
