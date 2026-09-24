import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LocalTextEmbedder, TextEmbedder } from "@repo/embeddings";

@Injectable()
export class EmbeddingProviderService {
  readonly model: string;
  readonly dimensions: number;
  private readonly embedder: TextEmbedder;

  constructor(config: ConfigService) {
    this.model = config.get(
      "LOCAL_EMBEDDING_MODEL",
      "Xenova/multilingual-e5-small",
    );
    this.dimensions = Number(config.get("LOCAL_EMBEDDING_DIMENSIONS", "384"));
    this.embedder = new LocalTextEmbedder({
      model: this.model,
      dimensions: this.dimensions,
      cacheDir: config.get("LOCAL_EMBEDDING_CACHE_DIR", ".cache/models"),
    });
  }

  isConfigured(): boolean {
    return true;
  }

  embedDocuments(inputs: string[]): Promise<number[][]> {
    return this.embedder.embed(inputs, "document");
  }

  embedQuery(query: string): Promise<number[]> {
    return this.embedder.embed([query], "query").then(([vector]) => {
      if (!vector) throw new Error("Local model returned no query embedding");
      return vector;
    });
  }
}
