import { Injectable } from "@nestjs/common";
import type {
  AiProviderAdapter,
  AiProviderConfig,
  AiProviderTestResult,
} from "./ai-provider.types";
import { consumeSse } from "./sse-parser";

@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  readonly provider = "OPENAI" as const;

  async test(config: AiProviderConfig): Promise<AiProviderTestResult> {
    const startedAt = Date.now();
    try {
      const response = await fetch(
        `${config.baseUrl || "https://api.openai.com/v1"}/models`,
        {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
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
    const response = await fetch(
      `${config.baseUrl || "https://api.openai.com/v1"}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          input: prompt,
          stream: true,
          store: false,
          max_output_tokens: 1_024,
        }),
        signal,
        redirect: "error",
      },
    );
    await consumeSse(response, (data) => {
      const event = JSON.parse(data) as { type?: string; delta?: string };
      if (event.type === "response.output_text.delta" && event.delta)
        onToken(event.delta);
    });
  }
}
