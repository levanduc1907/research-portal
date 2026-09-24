import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string };
}

interface GeminiEmbeddingResponse {
  embeddings?: Array<{ values?: number[] }>;
  error?: { message?: string };
}

@Injectable()
export class EmbeddingProviderService {
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly provider: "openai" | "gemini";

  constructor(config: ConfigService) {
    this.provider =
      config.get<string>("EMBEDDING_PROVIDER") === "gemini"
        ? "gemini"
        : "openai";
    this.apiKey =
      this.provider === "gemini"
        ? config.get<string>("GEMINI_API_KEY")
        : config.get<string>("EMBEDDING_API_KEY");
    this.baseUrl = (
      config.get<string>("EMBEDDING_BASE_URL") || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    this.model =
      config.get<string>("EMBEDDING_MODEL") || "text-embedding-3-small";
    this.dimensions = Number(config.get("EMBEDDING_DIMENSIONS") || 1536);
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async embed(inputs: string[]): Promise<number[][]> {
    if (!inputs.length) return [];
    if (!this.apiKey) {
      throw new Error(
        "EMBEDDING_API_KEY is not configured. Add it before running vector sync.",
      );
    }

    if (this.provider === "gemini") return this.embedWithGemini(inputs);

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: inputs,
        encoding_format: "float",
        dimensions: this.dimensions,
      }),
    });
    const body = (await response.json()) as EmbeddingResponse;
    if (!response.ok) {
      throw new Error(
        body.error?.message || `Embedding provider returned ${response.status}`,
      );
    }

    const vectors = [...(body.data || [])]
      .sort((left, right) => (left.index || 0) - (right.index || 0))
      .map((item) => item.embedding || []);
    if (
      vectors.length !== inputs.length ||
      vectors.some((vector) => vector.length !== this.dimensions)
    ) {
      throw new Error("Embedding provider returned an invalid vector batch");
    }
    return vectors;
  }

  private async embedWithGemini(inputs: string[]): Promise<number[][]> {
    const modelName = this.model.replace(/^models\//, "");
    const response = await fetch(
      `${this.baseUrl}/models/${encodeURIComponent(modelName)}:batchEmbedContents`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": this.apiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: inputs.map((text) => ({
            model: `models/${modelName}`,
            content: { parts: [{ text }] },
            outputDimensionality: this.dimensions,
          })),
        }),
      },
    );
    const body = (await response.json()) as GeminiEmbeddingResponse;
    if (!response.ok) {
      throw new Error(
        body.error?.message || `Gemini embedding returned ${response.status}`,
      );
    }
    const vectors = (body.embeddings || []).map((item) => item.values || []);
    if (
      vectors.length !== inputs.length ||
      vectors.some((vector) => vector.length !== this.dimensions)
    ) {
      throw new Error("Gemini returned an invalid embedding batch");
    }
    return vectors;
  }
}
