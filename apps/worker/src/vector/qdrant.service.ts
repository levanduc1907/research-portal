import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

export interface PaperVectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

@Injectable()
export class QdrantService {
  readonly collectionName: string;
  readonly vectorSize: number;
  private readonly client: QdrantClient;

  constructor(config: ConfigService) {
    this.collectionName =
      config.get<string>("QDRANT_COLLECTION") || "uiuc_papers_e5_v1";
    this.vectorSize = Number(config.get("LOCAL_EMBEDDING_DIMENSIONS") || 384);
    this.client = new QdrantClient({
      url: config.get<string>("QDRANT_URL") || "http://localhost:6333",
      apiKey: config.get<string>("QDRANT_API_KEY") || undefined,
    });
  }

  async ensureCollection(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (collection) => collection.name === this.collectionName,
    );
    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: { size: this.vectorSize, distance: "Cosine" },
        on_disk_payload: true,
      });
      return;
    }

    const collection = await this.client.getCollection(this.collectionName);
    const vectors = collection.config.params.vectors;
    if (vectors && "size" in vectors && vectors.size !== this.vectorSize) {
      throw new Error(
        `Qdrant collection ${this.collectionName} has ${vectors.size} dimensions, expected ${this.vectorSize}`,
      );
    }
  }

  async upsert(points: PaperVectorPoint[]): Promise<void> {
    if (!points.length) return;
    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }
}
