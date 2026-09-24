import type { AiProvider } from "@repo/contracts";

export interface AiProviderConfig {
  apiKey: string;
  baseUrl?: string | null;
  model: string;
}

export interface AiProviderTestResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface AiProviderAdapter {
  readonly provider: AiProvider;
  test(config: AiProviderConfig): Promise<AiProviderTestResult>;
  streamText(
    config: AiProviderConfig,
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;
  embedTexts(
    config: AiProviderConfig,
    inputs: string[],
    dimensions: number,
  ): Promise<number[][]>;
}
