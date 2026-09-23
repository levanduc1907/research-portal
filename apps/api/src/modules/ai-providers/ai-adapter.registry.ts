import { Injectable } from "@nestjs/common";
import type { AiProvider } from "@repo/contracts";
import type { AiProviderAdapter } from "./ai-provider.types";
import { GeminiAdapter } from "./gemini.adapter";
import { OpenAiAdapter } from "./openai.adapter";
import { OpenAiCompatibleAdapter } from "./openai-compatible.adapter";

@Injectable()
export class AiAdapterRegistry {
  private readonly adapters: Map<AiProvider, AiProviderAdapter>;

  constructor(
    openAi: OpenAiAdapter,
    gemini: GeminiAdapter,
    compatible: OpenAiCompatibleAdapter,
  ) {
    this.adapters = new Map(
      [openAi, gemini, compatible].map((adapter) => [
        adapter.provider,
        adapter,
      ]),
    );
  }

  get(provider: AiProvider): AiProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Unsupported AI provider: ${provider}`);
    return adapter;
  }
}
