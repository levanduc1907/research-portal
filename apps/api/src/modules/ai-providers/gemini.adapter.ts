import { Injectable } from "@nestjs/common";
import type {
  AiProviderAdapter,
  AiProviderConfig,
  AiProviderTestResult,
} from "./ai-provider.types";
import { consumeSse } from "./sse-parser";

@Injectable()
export class GeminiAdapter implements AiProviderAdapter {
  readonly provider = "GEMINI" as const;

  async test(config: AiProviderConfig): Promise<AiProviderTestResult> {
    const startedAt = Date.now();
    try {
      const baseUrl =
        config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
      const response = await fetch(`${baseUrl}/models`, {
        headers: { "x-goog-api-key": config.apiKey },
      });
      if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
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
    const baseUrl =
      config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const response = await fetch(
      `${baseUrl}/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
        signal,
      },
    );
    await consumeSse(response, (data) => {
      const chunk = JSON.parse(data) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const token = chunk.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");
      if (token) onToken(token);
    });
  }

  async embedTexts(): Promise<number[][]> {
    throw new Error(
      "Gemini embeddings are not enabled in the initial Qdrant happy path. Use an OpenAI or OpenAI-compatible default credential.",
    );
  }
}
