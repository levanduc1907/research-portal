import { Injectable } from "@nestjs/common";
import type {
  AiProviderAdapter,
  AiProviderConfig,
  AiProviderTestResult,
} from "./ai-provider.types";
import { consumeSse } from "./sse-parser";

@Injectable()
export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  readonly provider = "OPENAI_COMPATIBLE" as const;

  async test(config: AiProviderConfig): Promise<AiProviderTestResult> {
    const startedAt = Date.now();
    try {
      if (!config.baseUrl) throw new Error("A base URL is required");
      const response = await fetch(`${config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}`);
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (error: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async streamText(
    config: AiProviderConfig,
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!config.baseUrl) throw new Error("A base URL is required");
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        max_tokens: 1_024,
        temperature: 0.2,
      }),
      signal,
      redirect: "error",
    });
    await consumeSse(response, (data) => {
      const chunk = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) onToken(token);
    });
  }
}
