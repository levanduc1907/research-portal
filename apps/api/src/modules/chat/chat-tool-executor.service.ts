import { Injectable } from "@nestjs/common";
import type { ChatToolCall, ChatToolName } from "./chat-intent-classification";

export interface ChatToolResult<T extends { id: string }> {
  evidence: T[];
  facts: string[];
}

export type ChatToolHandlers<T extends { id: string }> = Partial<
  Record<ChatToolName, (call: ChatToolCall) => Promise<ChatToolResult<T>>>
>;

@Injectable()
export class ChatToolExecutorService {
  async execute<T extends { id: string }>(
    _requestId: string,
    calls: ChatToolCall[],
    handlers: ChatToolHandlers<T>,
  ): Promise<ChatToolResult<T>> {
    const safeCalls = calls.slice(0, 4);
    const results = await Promise.all(
      safeCalls.map(async (call) => {
        const handler = handlers[call.name];
        if (!handler) {
          const result = {
            evidence: [],
            facts: [`Tool ${call.name} is not available.`],
          } satisfies ChatToolResult<T>;
          return result;
        }
        return handler(call);
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
    return merged;
  }
}
