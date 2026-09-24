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

  async embedTexts(
    config: AiProviderConfig,
    inputs: string[],
    dimensions: number,
  ): Promise<number[][]> {
    const baseUrl =
      config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const modelName = config.model.replace(/^models\//, "");
    const response = await fetch(
      `${baseUrl}/models/${encodeURIComponent(modelName)}:batchEmbedContents`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: inputs.map((text) => ({
            model: `models/${modelName}`,
            content: { parts: [{ text }] },
            outputDimensionality: dimensions,
          })),
        }),
      },
    );
    const body = (await response.json()) as {
      embeddings?: Array<{ values?: number[] }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        body.error?.message || `Gemini embedding returned ${response.status}`,
      );
    }
    return (body.embeddings || []).map((item) => item.values || []);
  }
}
