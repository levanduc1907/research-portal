import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { LocalTextEmbedder, TextEmbedder } from "@repo/embeddings";

export interface VectorEvidencePaper {
  id: string;
  title: string;
  publicationYear: number;
  citedByCount: number;
  doi: string | null;
  landingPageUrl: string | null;
  abstract: string | null;
  primaryTopic: string | null;
  authors: string[];
  score: number;
}

export interface VectorSearchOptions {
  limit?: number;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  authorName?: string;
  traceId?: string;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly client: QdrantClient;
  private readonly collectionName: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimensions: number;
  private readonly scoreThreshold: number;
  private readonly embedder: TextEmbedder;
  private readonly traceEnabled: boolean;

  constructor(config: ConfigService) {
    this.traceEnabled =
      config.get<string>("CHAT_TRACE_ENABLED", "false") === "true";
    this.collectionName = config.get("QDRANT_COLLECTION", "uiuc_papers_e5_v1");
    this.embeddingModel = config.get(
      "LOCAL_EMBEDDING_MODEL",
      "Xenova/multilingual-e5-small",
    );
    this.embeddingDimensions = Number(
      config.get("LOCAL_EMBEDDING_DIMENSIONS", "384"),
    );
    this.scoreThreshold = Number(config.get("QDRANT_SCORE_THRESHOLD", "0.2"));
    this.client = new QdrantClient({
      url: config.get("QDRANT_URL", "http://localhost:6333"),
      apiKey: config.get<string>("QDRANT_API_KEY") || undefined,
      checkCompatibility: false,
    });
    this.embedder = new LocalTextEmbedder({
      model: this.embeddingModel,
      dimensions: this.embeddingDimensions,
      cacheDir: config.get("LOCAL_EMBEDDING_CACHE_DIR", ".cache/models"),
    });
  }

  async search(
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorEvidencePaper[]> {
    const limit = Math.min(Math.max(options.limit ?? 5, 1), 10);
    const [vector] = await this.embedder.embed([query], "query");
    if (!vector || vector.length !== this.embeddingDimensions) {
      throw new ServiceUnavailableException(
        `Embedding provider returned ${vector?.length ?? 0} dimensions; expected ${this.embeddingDimensions}.`,
      );
    }
    this.traceSearchInput(options.traceId, query, vector, options);

    try {
      const must: Array<Record<string, unknown>> = [];
      if (options.year) {
        must.push({
          key: "publicationYear",
          match: { value: options.year },
        });
      } else if (options.yearFrom || options.yearTo) {
        must.push({
          key: "publicationYear",
          range: {
            ...(options.yearFrom ? { gte: options.yearFrom } : {}),
            ...(options.yearTo ? { lte: options.yearTo } : {}),
          },
        });
      }
      if (options.authorName) {
        must.push({
          key: "authors",
          match: { value: options.authorName },
        });
      }

      const result = await this.client.query(this.collectionName, {
        query: vector,
        limit,
        with_payload: true,
        score_threshold: this.scoreThreshold,
        ...(must.length ? { filter: { must } } : {}),
      });

      const papers = result.points.flatMap((point) => {
        const payload = point.payload;
        if (!payload || typeof payload.title !== "string") return [];
        return [
          {
            id: String(payload.paperId ?? point.id),
            title: payload.title,
            publicationYear: Number(payload.publicationYear ?? 0),
            citedByCount: Number(payload.citedByCount ?? 0),
            doi: typeof payload.doi === "string" ? payload.doi : null,
            landingPageUrl:
              typeof payload.landingPageUrl === "string"
                ? payload.landingPageUrl
                : null,
            abstract:
              typeof payload.abstract === "string" ? payload.abstract : null,
            primaryTopic:
              typeof payload.primaryTopic === "string"
                ? payload.primaryTopic
                : null,
            authors: Array.isArray(payload.authors)
              ? payload.authors.filter(
                  (author): author is string => typeof author === "string",
                )
              : [],
            score: point.score,
          },
        ];
      });
      return papers;
    } catch (error) {
      throw new ServiceUnavailableException(
        `Vector search is unavailable: ${error instanceof Error ? error.message : "unknown Qdrant error"}`,
      );
    }
  }

  private traceSearchInput(
    requestId: string | undefined,
    query: string,
    vector: number[],
    options: VectorSearchOptions,
  ): void {
    if (!this.traceEnabled || !requestId) return;
    const divider = "=".repeat(96);
    const filters = [
      options.authorName ? `author=${options.authorName}` : null,
      options.year ? `year=${options.year}` : null,
      options.yearFrom ? `yearFrom=${options.yearFrom}` : null,
      options.yearTo ? `yearTo=${options.yearTo}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const data = {
      query,
      model: this.embeddingModel,
      vectorDimensions: vector.length,
      vectorPreview: vector.slice(0, 16),
      filters: filters || null,
    };
    this.logger.log(
      [
        "",
        divider,
        ">>> STEP 2 - SEARCH QUERY AND EMBEDDING VECTOR <<<",
        divider,
        `REQUEST ID: ${requestId}`,
        "",
        JSON.stringify(data, null, 2),
        divider,
      ].join("\n"),
    );
  }
}
