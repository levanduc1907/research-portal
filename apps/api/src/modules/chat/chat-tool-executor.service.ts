import { Injectable } from "@nestjs/common";
import type { ChatToolCall, ChatToolName } from "./chat-intent-classification";
import { ChatTraceService } from "./chat-trace.service";

export interface ChatToolResult<T extends { id: string }> {
  evidence: T[];
  facts: string[];
}

export type ChatToolHandlers<T extends { id: string }> = Partial<
  Record<ChatToolName, (call: ChatToolCall) => Promise<ChatToolResult<T>>>
>;

@Injectable()
export class ChatToolExecutorService {
  constructor(private readonly trace: ChatTraceService) {}

  async execute<T extends { id: string }>(
    requestId: string,
    calls: ChatToolCall[],
    handlers: ChatToolHandlers<T>,
  ): Promise<ChatToolResult<T>> {
    const safeCalls = calls.slice(0, 4);
    this.trace.log(requestId, "tools.execution_started", {
      calls: safeCalls,
    });

    const results = await Promise.all(
      safeCalls.map(async (call) => {
        const handler = handlers[call.name];
        if (!handler) {
          return {
            evidence: [],
            facts: [`Tool ${call.name} is not available.`],
          } satisfies ChatToolResult<T>;
        }
        this.trace.log(requestId, "tools.call_started", { call });
        const result = await handler(call);
        this.trace.log(requestId, "tools.call_completed", {
          callId: call.id,
          tool: call.name,
          evidenceCount: result.evidence.length,
          facts: result.facts,
        });
        return result;
      }),
    );

    const evidenceById = new Map<string, T>();
    const facts: string[] = [];
    results.forEach((result, index) => {
      result.evidence.forEach((item) => evidenceById.set(item.id, item));
      result.facts.forEach((fact) => {
        facts.push(`[${safeCalls[index]?.name ?? "unknown_tool"}] ${fact}`);
      });
    });
    const merged = { evidence: [...evidenceById.values()], facts };
    this.trace.log(requestId, "tools.execution_completed", {
      toolCount: safeCalls.length,
      evidenceCount: merged.evidence.length,
      factCount: merged.facts.length,
    });
    return merged;
  }
}
