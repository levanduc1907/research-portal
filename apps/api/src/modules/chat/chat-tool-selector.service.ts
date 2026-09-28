import { Injectable } from "@nestjs/common";
import type { ChatResponseDto } from "@repo/contracts";
import {
  ChatIntentClassification,
  ChatToolSelection,
  toolCallsForClassification,
} from "./chat-intent-classification";
import { ChatTraceService } from "./chat-trace.service";

@Injectable()
export class ChatToolSelectorService {
  constructor(private readonly trace: ChatTraceService) {}

  select(
    classification: ChatIntentClassification,
    requestId = "unary",
  ): ChatToolSelection {
    const toolCalls = toolCallsForClassification(classification);
    const route = this.resolveRoute(classification, toolCalls);
    const selection: ChatToolSelection = {
      ...classification,
      toolCalls,
      route,
    };
    this.trace.log(requestId, "tool_selection.completed", {
      intent: classification.intent,
      secondaryIntents: classification.secondaryIntents,
      route,
      toolCalls: toolCalls.map((call) => ({
        callId: call.id,
        tool: call.name,
        arguments: call.arguments,
      })),
    });
    return selection;
  }

  private resolveRoute(
    classification: ChatIntentClassification,
    toolCalls: ChatToolSelection["toolCalls"],
  ): ChatResponseDto["route"] {
    if (classification.intent === "UNSUPPORTED" && !toolCalls.length) {
      return "UNSUPPORTED";
    }
    const hasVectorTool = toolCalls.some(
      (call) => call.name === "semantic_search_papers",
    );
    const hasDatabaseTool = toolCalls.some(
      (call) => call.name !== "semantic_search_papers",
    );
    if (hasVectorTool && hasDatabaseTool) return "HYBRID";
    if (hasVectorTool) return "SEMANTIC";
    if (hasDatabaseTool) return "STRUCTURED";
    if (classification.retrieval === "DATABASE") return "STRUCTURED";
    if (classification.retrieval === "VECTOR") return "SEMANTIC";
    return "HYBRID";
  }
}
