import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  ChatCitationDto,
  ChatRequestDto,
  ChatResponseDto,
} from "@repo/contracts";
import { Prisma } from "@repo/database";
import { AiCredentialsService } from "../ai-providers/ai-credentials.service";
import { PrismaService } from "../database/prisma.service";
import {
  VectorEvidencePaper,
  VectorSearchService,
} from "../vector/vector-search.service";

type ChatRoute = "STRUCTURED" | "SEMANTIC" | "HYBRID" | "UNSUPPORTED";
type EvidencePaper = Omit<VectorEvidencePaper, "score"> & { score?: number };
interface StreamPayload {
  token?: string;
  sources?: ChatCitationDto[];
  route?: ChatRoute;
  done?: boolean;
  error?: string;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiCredentials: AiCredentialsService,
    private readonly vectorSearch: VectorSearchService,
  ) {}

  private classifyQuestion(query: string): ChatRoute {
    const q = query.trim().toLowerCase();
    if (q.length < 4) return "UNSUPPORTED";
    const structured = [
      "how many",
      "most cited",
      "top papers",
      "highest cited",
      "total count",
      "ranking",
      "statistic",
    ].some((term) => q.includes(term));
    const semantic = [
      "about",
      "research on",
      "work on",
      "explain",
      "summarize",
      "topic",
    ].some((term) => q.includes(term));
    if (structured && semantic) return "HYBRID";
    return structured ? "STRUCTURED" : "SEMANTIC";
  }

  private extractYear(query: string): number | undefined {
    const match = query.match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : undefined;
  }

  private async retrieveEvidence(
    route: ChatRoute,
    query: string,
  ): Promise<EvidencePaper[]> {
    if (route === "UNSUPPORTED") return [];
    if (route === "SEMANTIC" || route === "HYBRID") {
      return this.vectorSearch.search(query, 5, this.extractYear(query));
    }
    const records = await this.prisma.paper.findMany({
      orderBy: { citedByCount: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        publicationYear: true,
        citedByCount: true,
        doi: true,
        landingPageUrl: true,
        abstract: true,
        primaryTopic: { select: { displayName: true } },
        authors: {
          select: { author: { select: { displayName: true } } },
          take: 10,
        },
      },
    });
    return records.map(({ authors, primaryTopic, ...paper }) => ({
      ...paper,
      primaryTopic: primaryTopic?.displayName ?? null,
      authors: authors.map(({ author }) => author.displayName),
    }));
  }

  private toSources(evidence: EvidencePaper[]): ChatCitationDto[] {
    return evidence.map((paper) => ({
      paperId: paper.id,
      title: paper.title,
      year: paper.publicationYear,
      citedByCount: paper.citedByCount,
      doi: paper.doi,
    }));
  }

  private buildPrompt(query: string, evidence: EvidencePaper[]): string {
    const context = evidence.length
      ? evidence
          .map((paper, index) =>
            [
              `[${index + 1}] ${paper.title} (${paper.publicationYear})`,
              paper.authors.length
                ? `Authors: ${paper.authors.join(", ")}`
                : null,
              `Citations: ${paper.citedByCount}`,
              paper.primaryTopic ? `Topic: ${paper.primaryTopic}` : null,
              paper.abstract || "Abstract unavailable.",
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n")
      : "No matching research evidence was found.";
    return [
      "You are a research assistant for University of Illinois Urbana-Champaign publications.",
      "Answer only from the evidence below. Do not invent facts or sources.",
      "Cite factual claims inline as [1], [2], etc. If evidence is insufficient, say so clearly.",
      "Keep the response concise and use the same language as the user's question.",
      `Question:\n${query}`,
      `Evidence:\n${context}`,
    ].join("\n\n");
  }

  async processQuestion(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now();
    const route = this.classifyQuestion(dto.query);
    const evidence = await this.retrieveEvidence(route, dto.query);
    const sources = this.toSources(evidence);
    let answer = "";
    const usedProvider = await this.aiCredentials.streamDefault(
      this.buildPrompt(dto.query, evidence),
      (token) => {
        answer += token;
      },
    );
    if (!usedProvider) {
      throw new ServiceUnavailableException(
        "No default AI credential is configured. Add one in AI provider settings first.",
      );
    }
    await this.logChatRequest(dto.query, route, answer, sources, startTime);
    return {
      query: dto.query,
      route,
      answer,
      sources,
      confidence: sources.length > 0 ? "high" : "low",
      latencyMs: Date.now() - startTime,
    };
  }

  async streamQuestion(
    dto: ChatRequestDto,
    onChunk: (payload: StreamPayload) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const route = this.classifyQuestion(dto.query);
      const evidence = await this.retrieveEvidence(route, dto.query);
      if (signal?.aborted) return;
      const sources = this.toSources(evidence);
      onChunk({ route, sources });
      let answer = "";
      const usedProvider = await this.aiCredentials.streamDefault(
        this.buildPrompt(dto.query, evidence),
        (token) => {
          answer += token;
          onChunk({ token });
        },
        signal,
      );
      if (!usedProvider) {
        throw new ServiceUnavailableException(
          "No default AI credential is configured. Add one in AI provider settings first.",
        );
      }
      if (signal?.aborted) return;
      onChunk({ done: true });
      await this.logChatRequest(dto.query, route, answer, sources, startTime);
    } catch (error) {
      if (!signal?.aborted) {
        onChunk({
          error: error instanceof Error ? error.message : "AI request failed.",
          done: true,
        });
      }
    }
  }

  private async logChatRequest(
    query: string,
    route: ChatRoute,
    response: string,
    sources: ChatCitationDto[],
    startTime: number,
  ): Promise<void> {
    try {
      await this.prisma.chatRequest.create({
        data: {
          query,
          route,
          response,
          citations: sources as unknown as Prisma.InputJsonValue,
          latencyMs: Date.now() - startTime,
        },
      });
    } catch {
      // Logging must not break a successful response.
    }
  }
}
