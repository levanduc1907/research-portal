import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const AI_FLOW_LOG_STEPS = new Set([
  "AI_CLASSIFICATION_COMMAND",
  "STEP1_CLASSIFICATION_RESULT",
  "STEP2_RETRIEVAL_INPUT",
  "STEP3_RETRIEVED_DATA",
  "STEP4_GENERATION_COMMAND",
  "STEP4_GENERATION_RESULT",
]);

const STEP_TITLES: Record<string, string> = {
  AI_CLASSIFICATION_COMMAND: "STEP 1 - INTENT CLASSIFICATION - AI COMMAND",
  STEP1_CLASSIFICATION_RESULT: "STEP 1 - CLASSIFICATION RESULT",
  STEP2_RETRIEVAL_INPUT: "STEP 2 - SEARCH QUERY AND EMBEDDING VECTOR",
  STEP3_RETRIEVED_DATA: "STEP 3 - DATA PROVIDED TO THE AI",
  STEP4_GENERATION_COMMAND: "STEP 4 - ANSWER GENERATION COMMAND",
  STEP4_GENERATION_RESULT: "STEP 4 - FINAL ANSWER",
};

const DIVIDER = "=".repeat(96);

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
    if (!this.enabled() || !AI_FLOW_LOG_STEPS.has(step)) return;
    const content = JSON.stringify(this.sanitize(data), null, 2);
    const message = [
      "",
      DIVIDER,
      `>>> ${STEP_TITLES[step]} <<<`,
      DIVIDER,
      `REQUEST ID: ${requestId}`,
      "",
      content,
      DIVIDER,
    ].join("\n");
    const configuredMax = Number(
      this.config.get<string>("CHAT_TRACE_MAX_CHARS"),
    );
    const maxChars =
      Number.isSafeInteger(configuredMax) && configuredMax > 0
        ? configuredMax
        : 100_000;
    this.logger.log(
      message.length <= maxChars
        ? message
        : `${message.slice(0, maxChars)}\n... [TRUNCATED ${message.length - maxChars} CHARACTERS]`,
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
