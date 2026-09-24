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
      }),
      signal,
    });
    await consumeSse(response, (data) => {
      const chunk = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) onToken(token);
    });
  }

  async embedTexts(
    config: AiProviderConfig,
    inputs: string[],
    dimensions: number,
  ): Promise<number[][]> {
    if (!config.baseUrl) throw new Error("A base URL is required");
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        input: inputs,
        encoding_format: "float",
        dimensions,
      }),
    });
    const body = (await response.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        body.error?.message || `Provider returned ${response.status}`,
      );
    }
    return [...(body.data || [])]
      .sort((left, right) => (left.index || 0) - (right.index || 0))
      .map((item) => item.embedding || []);
  }
}
