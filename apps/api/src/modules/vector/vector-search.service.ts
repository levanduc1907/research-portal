import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { AiCredentialsService } from "../ai-providers/ai-credentials.service";

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

@Injectable()
export class VectorSearchService {
  private readonly client: QdrantClient;
  private readonly collectionName: string;
  private readonly embeddingModel: string;
  private readonly embeddingDimensions: number;
  private readonly scoreThreshold: number;

  constructor(
    config: ConfigService,
    private readonly aiCredentials: AiCredentialsService,
  ) {
    this.collectionName = config.get("QDRANT_COLLECTION", "uiuc_papers_v1");
    this.embeddingModel = config.get(
      "AI_EMBEDDING_MODEL",
      "text-embedding-3-small",
    );
    this.embeddingDimensions = Number(
      config.get("AI_EMBEDDING_DIMENSIONS", "1536"),
    );
    this.scoreThreshold = Number(config.get("QDRANT_SCORE_THRESHOLD", "0.2"));
    this.client = new QdrantClient({
      url: config.get("QDRANT_URL", "http://localhost:6333"),
      apiKey: config.get<string>("QDRANT_API_KEY") || undefined,
      checkCompatibility: false,
    });
  }

  async search(
    query: string,
    limit = 5,
    year?: number,
  ): Promise<VectorEvidencePaper[]> {
    const [vector] = await this.aiCredentials.embedDefault(
      [query],
      this.embeddingModel,
      this.embeddingDimensions,
    );
    if (!vector || vector.length !== this.embeddingDimensions) {
      throw new ServiceUnavailableException(
        `Embedding provider returned ${vector?.length ?? 0} dimensions; expected ${this.embeddingDimensions}.`,
      );
    }

    try {
      const result = await this.client.query(this.collectionName, {
        query: vector,
        limit,
        with_payload: true,
        score_threshold: this.scoreThreshold,
        ...(year
          ? {
              filter: {
                must: [{ key: "publicationYear", match: { value: year } }],
              },
            }
          : {}),
      });

      return result.points.flatMap((point) => {
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
    } catch (error) {
      throw new ServiceUnavailableException(
        `Vector search is unavailable: ${error instanceof Error ? error.message : "unknown Qdrant error"}`,
      );
    }
  }
}
