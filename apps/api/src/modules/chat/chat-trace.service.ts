import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ChatTraceService {
  private readonly logger = new Logger("AiFlowTrace");

  constructor(private readonly config: ConfigService) {}

  enabled(): boolean {
    return this.config.get<string>("CHAT_TRACE_ENABLED", "false") === "true";
  }

  tokensEnabled(): boolean {
    return (
      this.enabled() &&
      this.config.get<string>("CHAT_TRACE_TOKENS", "false") === "true"
    );
  }

  log(requestId: string, step: string, data: unknown): void {
    if (!this.enabled()) return;
    const payload = {
      timestamp: new Date().toISOString(),
      requestId,
      step,
      data: this.sanitize(data),
    };
    const serialized = JSON.stringify(payload, null, 2);
    const configuredMax = Number(
      this.config.get<string>("CHAT_TRACE_MAX_CHARS"),
    );
    const maxChars =
      Number.isSafeInteger(configuredMax) && configuredMax > 0
        ? configuredMax
        : 100_000;
    this.logger.log(
      serialized.length <= maxChars
        ? `[AI_FLOW]\n${serialized}`
        : `[AI_FLOW]\n${serialized.slice(0, maxChars)}\n... [TRACE TRUNCATED: ${serialized.length - maxChars} chars]`,
    );
  }

  private sanitize(value: unknown, key = "", depth = 0): unknown {
    if (depth > 12) return "[MAX_DEPTH]";
    if (
      /^(api.?key|authorization|password|secret|token|access.?token|refresh.?token|encrypted.*|encryption.*)$/i.test(
        key,
      )
    ) {
      return "[REDACTED]";
    }
    if (typeof value === "string") return this.redactString(value);
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined
    ) {
      return value;
    }
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, key, depth + 1));
    }
    if (typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([childKey, childValue]) => [
            childKey,
            this.sanitize(childValue, childKey, depth + 1),
          ],
        ),
      );
    }
    return String(value);
  }

  private redactString(value: string): string {
    return value
      .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
      .replace(/sk-(?:proj-)?[A-Za-z0-9_-]{12,}/g, "[REDACTED_OPENAI_KEY]")
      .replace(/AQ\.[A-Za-z0-9_-]{12,}/g, "[REDACTED_GEMINI_KEY]");
  }
}
