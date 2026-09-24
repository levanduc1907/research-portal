import type { FeatureExtractionPipeline } from "@huggingface/transformers";

export type EmbeddingPurpose = "query" | "document";

export interface TextEmbedder {
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[], purpose: EmbeddingPurpose): Promise<number[][]>;
}

export interface LocalTextEmbedderOptions {
  model?: string;
  dimensions?: number;
  cacheDir?: string;
}

export class LocalTextEmbedder implements TextEmbedder {
  readonly model: string;
  readonly dimensions: number;
  private readonly cacheDir?: string;
  private extractorPromise?: Promise<FeatureExtractionPipeline>;

  constructor(options: LocalTextEmbedderOptions = {}) {
    this.model = options.model || "Xenova/multilingual-e5-small";
    this.dimensions = options.dimensions || 384;
    this.cacheDir = options.cacheDir;
  }

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractorPromise) {
      this.extractorPromise = import("@huggingface/transformers").then(
        async ({ env, pipeline }) => {
          if (this.cacheDir) env.cacheDir = this.cacheDir;
          const createFeatureExtractor = pipeline as unknown as (
            task: "feature-extraction",
            model: string,
            options: { dtype: "q8" },
          ) => Promise<FeatureExtractionPipeline>;
          return createFeatureExtractor("feature-extraction", this.model, {
            dtype: "q8",
          });
        },
      );
    }
    return this.extractorPromise;
  }

  async embed(texts: string[], purpose: EmbeddingPurpose): Promise<number[][]> {
    if (!texts.length) return [];
    const prefix = purpose === "query" ? "query: " : "passage: ";
    const extractor = await this.getExtractor();
    const output = await extractor(
      texts.map((text) => `${prefix}${text}`),
      { pooling: "mean", normalize: true },
    );
    const vectors = output.tolist() as number[][];
    if (
      vectors.length !== texts.length ||
      vectors.some((vector) => vector.length !== this.dimensions)
    ) {
      throw new Error(
        `Local embedding model returned an invalid shape; expected ${texts.length}x${this.dimensions}`,
      );
    }
    return vectors;
  }
}
