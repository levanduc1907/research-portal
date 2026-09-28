import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  ChatCitationDto,
  ChatRequestDto,
  ChatResponseDto,
  ChatStreamErrorCode,
  ChatStreamChunkDto,
} from "@repo/contracts";
import { Prisma } from "@repo/database";
import { PrismaService } from "../database/prisma.service";
import {
  VectorEvidencePaper,
  VectorSearchService,
} from "../vector/vector-search.service";
import { ChatIntentClassifierService } from "./chat-intent-classifier.service";
import { ChatToolCall, ChatToolSelection } from "./chat-intent-classification";
import { ChatTraceService } from "./chat-trace.service";
import {
  ChatToolExecutorService,
  ChatToolHandlers,
} from "./chat-tool-executor.service";
import { ChatToolSelectorService } from "./chat-tool-selector.service";
import { ChatResponseGeneratorService } from "./chat-response-generator.service";
import { expandResearchTopicTerms } from "../../common/research-topic-aliases";
import {
  InstitutionService,
  UIUC_INSTITUTION_CONTEXT,
} from "../institution/institution.service";

type ChatRoute = ChatResponseDto["route"];
type EvidencePaper = Omit<VectorEvidencePaper, "score"> & {
  score?: number;
  openalexId?: string;
  publicationDate?: Date | string | null;
  landingPageUrl?: string | null;
  pdfUrl?: string | null;
  topics?: string[];
  authorDetails?: Array<{
    displayName: string;
    position: string;
    isCorresponding: boolean;
  }>;
};
type ChatStage =
  | "classification"
  | "tool_selection"
  | "tool_calling"
  | "response_generation"
  | "logging";
type ResearcherPaperMode = "latest" | "recent" | "oldest" | "most_cited";

interface ResolvedResearcher {
  name: string;
  authorId: string;
  authorDisplayName: string;
}

interface ConversationTurn {
  query: string;
  response: string;
  sources: ChatCitationDto[];
}

interface RetrievalResult {
  evidence: EvidencePaper[];
  facts: string[];
}

const MAX_HISTORY_TURNS = 6;

const PAPER_EVIDENCE_SELECT = {
  id: true,
  openalexId: true,
  title: true,
  publicationYear: true,
  publicationDate: true,
  citedByCount: true,
  doi: true,
  landingPageUrl: true,
  pdfUrl: true,
  abstract: true,
  primaryTopic: { select: { displayName: true } },
  topics: {
    orderBy: { score: "desc" as const },
    take: 5,
    select: { topic: { select: { displayName: true } } },
  },
  authors: {
    select: {
      authorPosition: true,
      isCorresponding: true,
      author: { select: { displayName: true } },
    },
    take: 25,
  },
} satisfies Prisma.PaperSelect;

type PaperEvidenceRecord = Prisma.PaperGetPayload<{
  select: typeof PAPER_EVIDENCE_SELECT;
}>;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorSearch: VectorSearchService,
    private readonly intentClassifier: ChatIntentClassifierService,
    private readonly toolSelector: ChatToolSelectorService,
    private readonly trace: ChatTraceService,
    private readonly toolExecutor: ChatToolExecutorService,
    private readonly responseGenerator: ChatResponseGeneratorService,
    private readonly institutionService: InstitutionService,
  ) {}

  private extractYear(query: string): number | undefined {
    const match = query.match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : undefined;
  }

  private normalizeText(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .toLowerCase();
  }

  private normalizeConversationId(value?: string): string | undefined {
    const conversationId = value?.trim();
    if (!conversationId || !/^[a-zA-Z0-9_-]{1,100}$/.test(conversationId)) {
      return undefined;
    }
    return conversationId;
  }

  private parseSources(value: unknown): ChatCitationDto[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const source = item as Record<string, unknown>;
      if (
        typeof source.paperId !== "string" ||
        typeof source.title !== "string" ||
        typeof source.year !== "number" ||
        typeof source.citedByCount !== "number"
      ) {
        return [];
      }
      return [
        {
          paperId: source.paperId,
          title: source.title,
          year: source.year,
          citedByCount: source.citedByCount,
          doi: typeof source.doi === "string" ? source.doi : null,
        },
      ];
    });
  }

  private async loadConversationHistory(
    conversationId?: string,
  ): Promise<ConversationTurn[]> {
    if (!conversationId) return [];
    const records = await this.prisma.chatRequest.findMany({
      where: { conversationId, response: { not: null } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_HISTORY_TURNS,
      select: {
        query: true,
        response: true,
        citations: true,
      },
    });

    return records.reverse().map((record) => ({
      query: record.query,
      response: record.response || "",
      sources: this.parseSources(record.citations),
    }));
  }

  private extractReferencedSourceNumber(query: string): number | undefined {
    const normalized = this.normalizeText(query);
    const numericMatch = normalized.match(
      /(?:project|paper|article|publication|source|du an|cong trinh|bai bao|bai)\s*(?:so|thu)?\s*(\d{1,2})\b/,
    );
    if (numericMatch) return Number(numericMatch[1]);

    const ordinalPatterns: Array<[RegExp, number]> = [
      [
        /(?:first|dau tien|thu nhat)\s+(?:project|paper|source|du an|cong trinh|bai)/,
        1,
      ],
      [
        /(?:project|paper|source|du an|cong trinh|bai)\s+(?:first|dau tien|thu nhat)/,
        1,
      ],
      [/(?:second|thu hai)\s+(?:project|paper|source|du an|cong trinh|bai)/, 2],
      [/(?:project|paper|source|du an|cong trinh|bai)\s+(?:second|thu hai)/, 2],
      [/(?:third|thu ba)\s+(?:project|paper|source|du an|cong trinh|bai)/, 3],
      [/(?:project|paper|source|du an|cong trinh|bai)\s+(?:third|thu ba)/, 3],
      [/(?:fourth|thu tu)\s+(?:project|paper|source|du an|cong trinh|bai)/, 4],
      [/(?:project|paper|source|du an|cong trinh|bai)\s+(?:fourth|thu tu)/, 4],
      [/(?:fifth|thu nam)\s+(?:project|paper|source|du an|cong trinh|bai)/, 5],
      [/(?:project|paper|source|du an|cong trinh|bai)\s+(?:fifth|thu nam)/, 5],
    ];
    return ordinalPatterns.find(([pattern]) => pattern.test(normalized))?.[1];
  }

  private resolveReferencedSource(
    query: string,
    history: ConversationTurn[],
  ): { source: ChatCitationDto; number: number } | undefined {
    const sourceNumber = this.extractReferencedSourceNumber(query);
    if (!sourceNumber || sourceNumber < 1) return undefined;

    return this.resolveSourceNumber(sourceNumber, history);
  }

  private resolveSourceNumber(
    sourceNumber: number,
    history: ConversationTurn[],
  ): { source: ChatCitationDto; number: number } | undefined {
    if (!Number.isInteger(sourceNumber) || sourceNumber < 1) return undefined;

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const source = history[index]?.sources[sourceNumber - 1];
      if (source) return { source, number: sourceNumber };
    }
    return undefined;
  }

  private isImplicitPaperFollowUp(query: string): boolean {
    const normalized = this.normalizeText(query);
    return (
      /\b(it|its)\b/.test(normalized) ||
      [
        "that paper",
        "this paper",
        "the paper",
        "that article",
        "this article",
        "the article",
        "that publication",
        "this publication",
        "summarize it",
        "coauthor",
        "co author",
        "bai do",
        "bai nay",
        "bai bao do",
        "cong trinh do",
        "tom tat no",
      ].some((term) => normalized.includes(term))
    );
  }

  private resolveImplicitReferencedSource(
    query: string,
    history: ConversationTurn[],
  ): ChatCitationDto | undefined {
    if (!this.isImplicitPaperFollowUp(query)) return undefined;

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const sources = history[index]?.sources ?? [];
      if (sources.length === 1) return sources[0];
      if (sources.length > 1) return undefined;
    }
    return undefined;
  }

  private mapPaperEvidence(record: PaperEvidenceRecord): EvidencePaper {
    const { authors, primaryTopic, topics, ...paper } = record;
    return {
      ...paper,
      primaryTopic: primaryTopic?.displayName ?? null,
      authors: authors.map(({ author }) => author.displayName),
      authorDetails: authors.map(
        ({ author, authorPosition, isCorresponding }) => ({
          displayName: author.displayName,
          position: authorPosition,
          isCorresponding,
        }),
      ),
      topics: topics.map(({ topic }) => topic.displayName),
    };
  }

  private async findPaperEvidence(
    paperId: string,
  ): Promise<EvidencePaper | undefined> {
    const paper = await this.prisma.paper.findUnique({
      where: { id: paperId },
      select: PAPER_EVIDENCE_SELECT,
    });
    return paper ? this.mapPaperEvidence(paper) : undefined;
  }

  private isFollowUpQuestion(query: string): boolean {
    const normalized = this.normalizeText(query);
    if (
      /\b(he|him|his|she|her|hers|they|them|their|theirs)\b/.test(normalized)
    ) {
      return true;
    }
    if (this.isLatestPaperQuestion(normalized)) return true;
    return [
      "that paper",
      "that project",
      "this paper",
      "the former",
      "the latter",
      "it ",
      "this researcher",
      "that researcher",
      "this author",
      "that author",
      "ong ay",
      "ba ay",
      "nguoi do",
      "bai do",
      "bai nay",
      "du an do",
      "cong trinh do",
      "tom tat lai",
      "noi tiep",
    ].some((term) => normalized.includes(term));
  }

  private contextualizeRetrievalQuery(
    query: string,
    history: ConversationTurn[],
  ): string {
    const previousTurn = history.at(-1);
    if (!previousTurn || !this.isFollowUpQuestion(query)) return query;
    return `${previousTurn.query}\nFollow-up: ${query}`;
  }

  private isCountQuestion(query: string): boolean {
    const normalized = this.normalizeText(query);
    return [
      "how many",
      "total count",
      "count of",
      "bao nhieu",
      "tong so",
      "co may",
      "may bai",
      "may paper",
      "may publication",
      "may cong trinh",
      "may an pham",
    ].some((term) => normalized.includes(term));
  }

  private isPublicationCountQuestion(query: string): boolean {
    if (!this.isCountQuestion(query)) return false;
    const normalized = this.normalizeText(query);
    return [
      "paper",
      "publication",
      "article",
      "work",
      "project",
      "bai bao",
      "bai viet",
      "cong trinh",
      "du an",
      "an pham",
      "cong bo",
      "nghien cuu",
      "research",
      "bai",
    ].some((term) => normalized.includes(term));
  }

  private isLatestPaperQuestion(query: string): boolean {
    const normalized = this.normalizeText(query);
    const mentionsPaper = [
      "paper",
      "publication",
      "article",
      "work",
      "bai bao",
      "bai viet",
      "cong trinh",
      "an pham",
    ].some((term) => normalized.includes(term));
    const asksForLatest = [
      "newest",
      "latest",
      "most recent",
      "recent paper",
      "last paper",
      "last publication",
      "last article",
      "last work",
      "moi nhat",
      "gan day nhat",
    ].some((term) => normalized.includes(term));
    return mentionsPaper && asksForLatest;
  }

  private researcherPaperMode(query: string): ResearcherPaperMode | null {
    const normalized = this.normalizeText(query);
    const mentionsPaper = [
      "paper",
      "publication",
      "article",
      "work",
      "bai bao",
      "bai viet",
      "cong trinh",
      "an pham",
    ].some((term) => normalized.includes(term));
    if (!mentionsPaper) return null;
    if (this.isPublicationCountQuestion(normalized)) return null;

    const plural = /\b(papers|publications|articles|works)\b/.test(normalized);
    if (
      [
        "most cited",
        "most citation",
        "highest cited",
        "highest citation",
        "top cited",
        "top citation",
        "top paper",
        "top publication",
        "nhieu trich dan nhat",
      ].some((term) => normalized.includes(term))
    ) {
      return "most_cited";
    }
    if (
      ["oldest", "earliest", "first paper", "cu nhat", "dau tien"].some(
        (term) => normalized.includes(term),
      )
    ) {
      return "oldest";
    }
    if (this.isLatestPaperQuestion(normalized)) {
      return plural ? "recent" : "latest";
    }
    if (
      [
        "recent papers",
        "recent publications",
        "list papers",
        "list publications",
        "show papers",
        "show publications",
        "papers by",
        "publications by",
        "papers from",
        "publications from",
        "what papers",
        "which papers",
        "cac bai bao",
        "danh sach bai",
      ].some((term) => normalized.includes(term))
    ) {
      return "recent";
    }
    if (plural && this.extractYear(normalized)) return "recent";
    return null;
  }

  private isResearcherProfileQuestion(query: string): boolean {
    const normalized = this.normalizeText(query);
    return [
      "department",
      "faculty",
      "job title",
      "position",
      "email",
      "contact",
      "orcid",
      "institution",
      "affiliation",
      "profile",
      "biography",
      "bio",
      "research area",
      "research interest",
      "what does he research",
      "what does she research",
      "what do they research",
      "where does he work",
      "where does she work",
      "where do they work",
      "who is",
      "tell me about",
      "expertise",
      "keyword",
      "citation",
      "khoa nao",
      "bo mon",
      "chuc danh",
      "lien he",
      "linh vuc nghien cuu",
      "nghien cuu gi",
      "lam viec o dau",
      "la ai",
      "chuyen mon",
      "trich dan",
    ].some((term) => normalized.includes(term));
  }

  private async findResearcherMentionedInQuery(
    query: string,
    requestId = "unary",
  ): Promise<ResolvedResearcher | null> {
    const normalizedQuery = this.normalizeText(query);
    const researchers = await this.prisma.researcher.findMany({
      where: { authorId: { not: null } },
      select: {
        name: true,
        authorId: true,
        author: { select: { displayName: true } },
      },
    });

    const candidates = researchers
      .flatMap((researcher) => {
        if (!researcher.authorId) return [];
        const normalizedName = this.normalizeText(
          researcher.name.replace(/^(dr|prof|professor)\.?\s+/i, ""),
        );
        const nameParts = normalizedName
          .split(" ")
          .filter((part) => part.length >= 2);
        const fullNameMatch = normalizedQuery.includes(normalizedName);
        const matchedParts = nameParts.filter((part) =>
          new RegExp(`\\b${part}\\b`).test(normalizedQuery),
        ).length;
        if (!fullNameMatch && matchedParts < Math.min(2, nameParts.length)) {
          return [];
        }
        return [
          {
            name: researcher.name,
            authorId: researcher.authorId,
            authorDisplayName:
              researcher.author?.displayName || researcher.name,
            score: fullNameMatch ? 1_000 + normalizedName.length : matchedParts,
          },
        ];
      })
      .sort((a, b) => b.score - a.score);

    this.trace.log(requestId, "entity_resolution.researcher_candidates", {
      query,
      normalizedQuery,
      scannedResearchers: researchers.length,
      candidates,
    });

    if (!candidates.length) {
      this.trace.log(requestId, "entity_resolution.researcher_result", {
        status: "not_found",
      });
      return null;
    }
    if (
      candidates.length > 1 &&
      candidates[0]?.score === candidates[1]?.score &&
      candidates[0].score < 1_000
    ) {
      this.trace.log(requestId, "entity_resolution.researcher_result", {
        status: "ambiguous",
        tiedCandidates: candidates.slice(0, 2),
      });
      return null;
    }
    const resolved = {
      name: candidates[0]!.name,
      authorId: candidates[0]!.authorId,
      authorDisplayName: candidates[0]!.authorDisplayName,
    };
    this.trace.log(requestId, "entity_resolution.researcher_result", {
      status: "resolved",
      researcher: resolved,
    });
    return resolved;
  }

  private async resolveResearcherFromContext(
    query: string,
    history: ConversationTurn[],
    requestId = "unary",
  ): Promise<ResolvedResearcher | null> {
    const directlyMentioned = await this.findResearcherMentionedInQuery(
      query,
      requestId,
    );
    if (directlyMentioned) return directlyMentioned;
    if (!this.isFollowUpQuestion(query)) return null;

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const turn = history[index];
      if (!turn) continue;

      const fromPreviousQuery = await this.findResearcherMentionedInQuery(
        turn.query,
        requestId,
      );
      if (fromPreviousQuery) {
        this.trace.log(requestId, "entity_resolution.conversation_reference", {
          source: "previous_query",
          historyIndex: index,
          researcher: fromPreviousQuery,
        });
        return fromPreviousQuery;
      }

      const fromPreviousAnswer = await this.findResearcherMentionedInQuery(
        turn.response,
        requestId,
      );
      if (fromPreviousAnswer) {
        this.trace.log(requestId, "entity_resolution.conversation_reference", {
          source: "previous_answer",
          historyIndex: index,
          researcher: fromPreviousAnswer,
        });
        return fromPreviousAnswer;
      }
    }
    return null;
  }

  private extractTopicTerms(query: string, researcherName: string): string[] {
    const normalizedQuery = this.normalizeText(query);
    const knownTopics: Array<{ patterns: string[]; terms: string[] }> = [
      {
        patterns: ["quantum physics", "quantum mechanics", "vat ly luong tu"],
        terms: ["quantum"],
      },
      {
        patterns: ["artificial intelligence", "tri tue nhan tao"],
        terms: ["artificial intelligence"],
      },
      {
        patterns: ["machine learning", "hoc may"],
        terms: ["machine learning"],
      },
      {
        patterns: ["climate change", "bien doi khi hau"],
        terms: ["climate change"],
      },
    ];
    const knownTopic = knownTopics.find(({ patterns }) =>
      patterns.some((pattern) => normalizedQuery.includes(pattern)),
    );
    if (knownTopic) return knownTopic.terms;

    const nameParts = new Set(
      this.normalizeText(researcherName).split(" ").filter(Boolean),
    );
    const stopWords = new Set([
      "about",
      "article",
      "articles",
      "are",
      "bao",
      "bai",
      "by",
      "co",
      "cong",
      "count",
      "cua",
      "do",
      "does",
      "du",
      "for",
      "has",
      "have",
      "how",
      "la",
      "many",
      "mot",
      "nghien",
      "nhieu",
      "nhung",
      "ong",
      "the",
      "what",
      "which",
      "work",
      "works",
      "paper",
      "papers",
      "project",
      "projects",
      "publication",
      "publications",
      "research",
      "so",
      "tong",
      "trinh",
      "ve",
    ]);
    return [
      ...new Set(
        normalizedQuery
          .split(" ")
          .filter(
            (term) =>
              term.length >= 3 && !stopWords.has(term) && !nameParts.has(term),
          ),
      ),
    ].slice(0, 4);
  }

  private async retrieveStructuredCount(
    query: string,
    history: ConversationTurn[],
    flow?: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult | null> {
    if (
      flow?.intent !== "PUBLICATION_COUNT" &&
      !this.isPublicationCountQuestion(query)
    ) {
      return null;
    }
    const researcher = await this.resolveResearcherFromContext(
      query,
      history,
      requestId,
    );
    if (!researcher) {
      return {
        evidence: [],
        facts: [
          "The publication-count question refers to a researcher who could not be resolved from the current conversation. Ask the user to name the researcher; do not substitute global publications.",
        ],
      };
    }

    const topicTerms = flow
      ? flow.topic
        ? [flow.topic]
        : []
      : this.extractTopicTerms(query, researcher.name);
    const topicFilters: Prisma.PaperWhereInput[] = topicTerms.map((term) => ({
      OR: [
        { title: { contains: term } },
        { abstract: { contains: term } },
        { primaryTopic: { is: { displayName: { contains: term } } } },
        {
          topics: {
            some: { topic: { displayName: { contains: term } } },
          },
        },
      ],
    }));
    const publicationYear = flow?.year
      ? flow.year
      : flow?.yearFrom || flow?.yearTo
        ? {
            ...(flow.yearFrom ? { gte: flow.yearFrom } : {}),
            ...(flow.yearTo ? { lte: flow.yearTo } : {}),
          }
        : undefined;
    const usesIndexedPaperFilters = Boolean(
      topicFilters.length || publicationYear,
    );
    const count = usesIndexedPaperFilters
      ? await this.prisma.paper.count({
          where: {
            authors: { some: { authorId: researcher.authorId } },
            ...(topicFilters.length ? { AND: topicFilters } : {}),
            ...(publicationYear ? { publicationYear } : {}),
          },
        })
      : (
          await this.prisma.researcher.findUnique({
            where: { authorId: researcher.authorId },
            select: { worksCount: true },
          })
        )?.worksCount || 0;
    const filtersDescription = [
      topicTerms.length ? `topic "${topicTerms.join(", ")}"` : null,
      flow?.year ? `year ${flow.year}` : null,
      flow?.yearFrom ? `from ${flow.yearFrom}` : null,
      flow?.yearTo ? `through ${flow.yearTo}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    const result = {
      evidence: [],
      facts: [
        `Database result: ${researcher.name} has ${count} OpenAlex publication(s)${filtersDescription ? ` matching ${filtersDescription}` : ""}. For an unfiltered total, this is the canonical OpenAlex works count; filtered counts use publications currently indexed in this portal. Treat the user's word "project" as "publication" because this portal currently stores publications, not research projects.`,
      ],
    };
    this.trace.log(requestId, "database.publication_count", {
      researcher,
      query,
      filters: {
        topicTerms,
        publicationYear,
        usesIndexedPaperFilters,
      },
      count,
      result,
    });
    return result;
  }

  private async retrieveResearcherPapers(
    query: string,
    history: ConversationTurn[],
    flow?: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult | null> {
    const mode = this.researcherPaperMode(query);
    if (!mode) return null;
    const researcher = await this.resolveResearcherFromContext(
      query,
      history,
      requestId,
    );
    if (!researcher) {
      return {
        evidence: [],
        facts: [
          "The requested researcher could not be resolved from the current conversation. Ask the user to name the researcher; do not return unrelated global publications.",
        ],
      };
    }

    const normalized = this.normalizeText(query);
    const wantsMultiple =
      mode === "recent" ||
      /\b(papers|publications|articles|works)\b/.test(normalized) ||
      normalized.includes("cac bai") ||
      normalized.includes("danh sach");
    const year = flow?.year ?? this.extractYear(query);
    const publicationYear = year
      ? year
      : flow?.yearFrom || flow?.yearTo
        ? {
            ...(flow.yearFrom ? { gte: flow.yearFrom } : {}),
            ...(flow.yearTo ? { lte: flow.yearTo } : {}),
          }
        : undefined;
    const orderBy: Prisma.PaperOrderByWithRelationInput[] =
      mode === "oldest"
        ? [{ publicationDate: "asc" }, { createdAt: "asc" }]
        : mode === "most_cited"
          ? [{ citedByCount: "desc" }, { publicationDate: "desc" }]
          : [{ publicationDate: "desc" }, { createdAt: "desc" }];
    const records = await this.prisma.paper.findMany({
      where: {
        authors: { some: { authorId: researcher.authorId } },
        ...(publicationYear ? { publicationYear } : {}),
      },
      orderBy,
      take: wantsMultiple ? (flow?.limit ?? 5) : 1,
      select: PAPER_EVIDENCE_SELECT,
    });
    if (!records.length) {
      return {
        evidence: [],
        facts: [
          `Database result: no indexed publications${year ? ` from ${year}` : ""} were found for ${researcher.name}.`,
        ],
      };
    }

    const modeDescription: Record<ResearcherPaperMode, string> = {
      latest: "newest",
      recent: "most recent",
      oldest: "oldest",
      most_cited: "most cited",
    };
    const resultSummary = records
      .map(
        (record, index) =>
          `${index + 1}. "${record.title}" (${record.publicationDate.toISOString().slice(0, 10)}, ${record.citedByCount} citation(s))`,
      )
      .join("; ");
    const result = {
      evidence: records.map((record) => this.mapPaperEvidence(record)),
      facts: [
        `Database result: ${modeDescription[mode]} indexed publication${records.length === 1 ? "" : "s"} by ${researcher.name}${year ? ` in ${year}` : ""}: ${resultSummary}.`,
      ],
    };
    this.trace.log(requestId, "database.researcher_papers", {
      researcher,
      mode,
      filters: { publicationYear },
      orderBy,
      limit: wantsMultiple ? (flow?.limit ?? 5) : 1,
      records: result.evidence,
      facts: result.facts,
    });
    return result;
  }

  private async retrieveResearcherProfile(
    query: string,
    history: ConversationTurn[],
    requestId = "unary",
  ): Promise<RetrievalResult | null> {
    const resolved = await this.resolveResearcherFromContext(
      query,
      history,
      requestId,
    );
    if (!resolved) {
      return {
        evidence: [],
        facts: [
          "The researcher named in this profile question could not be resolved to a researcher in the database. State that clearly; do not use or cite unrelated publications.",
        ],
      };
    }

    const [researcher, linkedPublicationCount, paperTopics] = await Promise.all(
      [
        this.prisma.researcher.findUnique({
          where: { authorId: resolved.authorId },
          select: {
            name: true,
            email: true,
            department: true,
            title: true,
            bio: true,
            profileUrl: true,
            worksCount: true,
            citedByCount: true,
            keywords: {
              orderBy: { keyword: "asc" },
              take: 20,
              select: { keyword: true },
            },
            author: {
              select: {
                displayName: true,
                openalexId: true,
                orcid: true,
                affiliations: {
                  where: { isCurrent: true },
                  take: 3,
                  select: {
                    institution: { select: { displayName: true } },
                  },
                },
              },
            },
          },
        }),
        this.prisma.paper.count({
          where: { authors: { some: { authorId: resolved.authorId } } },
        }),
        this.prisma.paperTopic.findMany({
          where: {
            paper: { authors: { some: { authorId: resolved.authorId } } },
          },
          orderBy: { score: "desc" },
          take: 1_500,
          select: {
            score: true,
            topic: { select: { displayName: true } },
          },
        }),
      ],
    );
    if (!researcher) {
      return {
        evidence: [],
        facts: [
          "The resolved author is not linked to a researcher profile. State that the requested profile data is unavailable; do not use unrelated publications.",
        ],
      };
    }

    const topicScores = new Map<string, { count: number; score: number }>();
    for (const paperTopic of paperTopics) {
      const name = paperTopic.topic.displayName.trim();
      if (!name) continue;
      const current = topicScores.get(name) ?? { count: 0, score: 0 };
      current.count += 1;
      current.score += paperTopic.score;
      topicScores.set(name, current);
    }
    const inferredResearchAreas = [...topicScores.entries()]
      .sort(
        ([, left], [, right]) =>
          right.count - left.count || right.score - left.score,
      )
      .slice(0, 8)
      .map(([name, stats]) => `${name} (${stats.count} linked papers)`);

    const fields = [
      `name=${researcher.name}`,
      researcher.title ? `title=${researcher.title}` : null,
      researcher.department ? `department=${researcher.department}` : null,
      researcher.email ? `email=${researcher.email}` : null,
      researcher.author?.affiliations.length
        ? `institution=${researcher.author.affiliations
            .map(({ institution }) => institution.displayName)
            .join(", ")}`
        : null,
      researcher.author?.orcid ? `ORCID=${researcher.author.orcid}` : null,
      researcher.author?.openalexId
        ? `OpenAlex author ID=${researcher.author.openalexId}`
        : null,
      researcher.keywords.length
        ? `research keywords=${researcher.keywords.map(({ keyword }) => keyword).join(", ")}`
        : null,
      inferredResearchAreas.length
        ? `research areas inferred from linked OpenAlex paper topics=${inferredResearchAreas.join(", ")}`
        : null,
      researcher.bio ? `bio=${researcher.bio}` : null,
      researcher.profileUrl ? `profile URL=${researcher.profileUrl}` : null,
      `OpenAlex works count=${researcher.worksCount}`,
      `OpenAlex cited-by count=${researcher.citedByCount}`,
      `publications currently linked in this portal=${linkedPublicationCount}`,
    ].filter((field): field is string => Boolean(field));

    const result = {
      evidence: [],
      facts: [
        `Researcher profile from the database: ${fields.join("; ")}. Do not confuse OpenAlex totals with the number of records currently imported into this portal.`,
      ],
    };
    this.trace.log(requestId, "database.researcher_profile", {
      resolved,
      researcher,
      linkedPublicationCount,
      inferredResearchAreas,
      facts: result.facts,
    });
    return result;
  }

  private async retrieveResearchTrends(
    flow?: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const latest = await this.prisma.paper.aggregate({
      _max: { publicationYear: true },
    });
    const latestYear =
      flow?.yearTo ?? flow?.year ?? latest._max.publicationYear;
    if (!latestYear) {
      return {
        evidence: [],
        facts: [
          "There are no indexed publication years available for trend analysis.",
        ],
      };
    }

    const recentFrom = flow?.yearFrom ?? latestYear - 2;
    const windowYears = Math.max(1, latestYear - recentFrom + 1);
    const previousFrom = recentFrom - windowYears;
    const previousTo = recentFrom - 1;
    const grouped = await this.prisma.paper.groupBy({
      by: ["primaryTopicId", "publicationYear"],
      where: {
        primaryTopicId: { not: null },
        publicationYear: { gte: previousFrom, lte: latestYear },
      },
      _count: { _all: true },
    });
    const topicIds = [
      ...new Set(
        grouped
          .map((row) => row.primaryTopicId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const topics = await this.prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true, displayName: true },
    });
    const names = new Map(topics.map((topic) => [topic.id, topic.displayName]));
    const totals = new Map<string, { recent: number; previous: number }>();
    for (const row of grouped) {
      if (!row.primaryTopicId) continue;
      const current = totals.get(row.primaryTopicId) ?? {
        recent: 0,
        previous: 0,
      };
      if (row.publicationYear >= recentFrom) current.recent += row._count._all;
      else current.previous += row._count._all;
      totals.set(row.primaryTopicId, current);
    }
    const trends = [...totals.entries()]
      .filter(([, value]) => value.recent >= 3 && value.previous >= 2)
      .map(([topicId, value]) => ({
        name: names.get(topicId) ?? topicId,
        ...value,
        growth: value.recent - value.previous,
        growthPercent: Math.round(
          ((value.recent - value.previous) / value.previous) * 100,
        ),
      }))
      .filter((trend) => trend.growth > 0)
      .sort(
        (left, right) =>
          right.growth - left.growth ||
          right.growthPercent - left.growthPercent,
      )
      .slice(0, flow?.limit ?? 10);

    const facts = trends.length
      ? [
          `Database trend analysis compares primary-topic publication counts in ${recentFrom}-${latestYear} against ${previousFrom}-${previousTo}. Fast-growing areas: ${trends
            .map(
              (trend, index) =>
                `${index + 1}. ${trend.name}: ${trend.recent} recent vs ${trend.previous} previous (${trend.growth >= 0 ? "+" : ""}${trend.growth}, ${trend.growthPercent >= 0 ? "+" : ""}${trend.growthPercent}%)`,
            )
            .join(
              "; ",
            )}. Explain that this measures growth in indexed publication volume, not research quality or funding.`,
        ]
      : [
          `No primary research topic had enough indexed publications to establish positive growth between ${previousFrom}-${previousTo} and ${recentFrom}-${latestYear}.`,
        ];
    this.trace.log(requestId, "database.research_trends", {
      latestYear,
      recentFrom,
      previousFrom,
      previousTo,
      trends,
    });
    return { evidence: [], facts };
  }

  private async retrieveTopPublications(
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const latest = await this.prisma.paper.aggregate({
      _max: { publicationYear: true },
    });
    const latestYear = latest._max.publicationYear;
    const yearFilter =
      flow.year ??
      (flow.yearFrom || flow.yearTo
        ? {
            ...(flow.yearFrom ? { gte: flow.yearFrom } : {}),
            ...(flow.yearTo ? { lte: flow.yearTo } : {}),
          }
        : latestYear
          ? { gte: latestYear - 2 }
          : undefined);
    const papers = await this.prisma.paper.findMany({
      where: yearFilter ? { publicationYear: yearFilter } : undefined,
      orderBy:
        flow.intent === "RECENT_PUBLICATIONS" || flow.sort === "DATE_DESC"
          ? [{ publicationDate: "desc" }, { citedByCount: "desc" }]
          : [{ citedByCount: "desc" }, { publicationDate: "desc" }],
      take: flow.limit,
      select: PAPER_EVIDENCE_SELECT,
    });
    const evidence = papers.map((paper) => this.mapPaperEvidence(paper));
    this.trace.log(requestId, "database.top_publications", {
      yearFilter,
      evidence,
    });
    return {
      evidence,
      facts: evidence.length
        ? [
            flow.intent === "RECENT_PUBLICATIONS"
              ? "These are the newest indexed publications in the requested period."
              : "These are the most-cited indexed publications in the requested recent period.",
          ]
        : ["No indexed publications matched the requested period."],
    };
  }

  private async retrieveResearchersByTopic(
    query: string,
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const subject = flow.topic || flow.semanticQuery || query;
    const terms = expandResearchTopicTerms(subject);
    const topicWhere: Prisma.PaperWhereInput = {
      OR: terms.flatMap((term) => [
        { title: { contains: term } },
        { abstract: { contains: term } },
        { primaryTopic: { is: { displayName: { contains: term } } } },
        { topics: { some: { topic: { displayName: { contains: term } } } } },
      ]),
    };
    const grouped = await this.prisma.paperAuthor.groupBy({
      by: ["authorId"],
      where: { paper: topicWhere },
      _count: { _all: true },
      orderBy: { _count: { authorId: "desc" } },
      take: 50,
    });
    const authors = await this.prisma.author.findMany({
      where: {
        id: { in: grouped.map((row) => row.authorId) },
        researcher: { isNot: null },
      },
      select: {
        id: true,
        displayName: true,
        researcher: {
          select: { name: true, title: true, department: true, slug: true },
        },
      },
    });
    const counts = new Map(
      grouped.map((row) => [row.authorId, row._count._all]),
    );
    const researchers = authors
      .map((author) => ({
        name: author.researcher?.name || author.displayName,
        title: author.researcher?.title,
        department: author.researcher?.department,
        slug: author.researcher?.slug,
        matchingPapers: counts.get(author.id) ?? 0,
      }))
      .sort((left, right) => right.matchingPapers - left.matchingPapers)
      .slice(0, flow.limit);
    this.trace.log(requestId, "database.researchers_by_topic", {
      subject,
      terms,
      researchers,
    });
    return {
      evidence: [],
      facts: researchers.length
        ? [
            `Researchers with indexed publications matching "${subject}": ${researchers
              .map(
                (researcher, index) =>
                  `${index + 1}. ${researcher.name}${researcher.title ? `, ${researcher.title}` : ""}${researcher.department ? ` (${researcher.department})` : ""}: ${researcher.matchingPapers} matching indexed publication(s), profile slug=${researcher.slug}`,
              )
              .join(
                "; ",
              )}. This ranking is based on matching indexed publications, not a formal claim of expertise.`,
          ]
        : [
            `No researcher with indexed publications matching "${subject}" was found.`,
          ],
    };
  }

  private async retrievePaperDetails(
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const title = flow.paperTitle?.trim();
    if (!title) {
      return {
        evidence: [],
        facts: [
          "No paper title or prior source reference was provided. Ask the user which paper they mean.",
        ],
      };
    }
    const record = await this.prisma.paper.findFirst({
      where: { title: { contains: title } },
      orderBy: [{ citedByCount: "desc" }, { publicationDate: "desc" }],
      select: PAPER_EVIDENCE_SELECT,
    });
    if (!record) {
      return {
        evidence: [],
        facts: [`No indexed paper matching the title "${title}" was found.`],
      };
    }
    const evidence = this.mapPaperEvidence(record);
    const facts = [
      `Paper metadata: title="${record.title}"; publication date=${record.publicationDate.toISOString().slice(0, 10)}; citations=${record.citedByCount}; authors=${evidence.authors.join(", ") || "unavailable"}; primary topic=${evidence.primaryTopic || "unavailable"}; topics=${evidence.topics?.join(", ") || "unavailable"}; DOI=${record.doi || "unavailable"}; landing page=${record.landingPageUrl || "unavailable"}; PDF=${record.pdfUrl || "unavailable"}.`,
    ];
    this.trace.log(requestId, "database.paper_details", {
      requestedTitle: title,
      paper: evidence,
    });
    return { evidence: [evidence], facts };
  }

  private async retrieveResearcherCoauthors(
    query: string,
    history: ConversationTurn[],
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const researcher = await this.resolveResearcherFromContext(
      this.buildRetrievalQuery(query, flow),
      history,
      requestId,
    );
    if (!researcher) {
      return {
        evidence: [],
        facts: ["The researcher could not be resolved for the coauthor query."],
      };
    }
    const grouped = await this.prisma.paperAuthor.groupBy({
      by: ["authorId"],
      where: {
        authorId: { not: researcher.authorId },
        paper: { authors: { some: { authorId: researcher.authorId } } },
      },
      _count: { _all: true },
      orderBy: { _count: { authorId: "desc" } },
      take: Math.max(flow.limit * 3, 20),
    });
    const authors = await this.prisma.author.findMany({
      where: { id: { in: grouped.map((row) => row.authorId) } },
      select: {
        id: true,
        displayName: true,
        affiliations: {
          where: { isCurrent: true },
          take: 3,
          select: { institution: { select: { displayName: true } } },
        },
        researcher: { select: { slug: true, department: true } },
      },
    });
    const counts = new Map(
      grouped.map((row) => [row.authorId, row._count._all]),
    );
    const ranked = authors
      .map((author) => ({
        ...author,
        sharedPapers: counts.get(author.id) ?? 0,
      }))
      .sort((left, right) => right.sharedPapers - left.sharedPapers)
      .slice(0, flow.limit);
    this.trace.log(requestId, "database.researcher_coauthors", {
      researcher,
      coauthors: ranked,
    });
    return {
      evidence: [],
      facts: ranked.length
        ? [
            `Top indexed coauthors of ${researcher.name}: ${ranked
              .map(
                (author, index) =>
                  `${index + 1}. ${author.displayName}: ${author.sharedPapers} shared paper(s)${author.researcher?.department ? `, ${author.researcher.department}` : author.affiliations.length ? `, ${author.affiliations.map(({ institution }) => institution.displayName).join(", ")}` : ""}`,
              )
              .join("; ")}.`,
          ]
        : [`No indexed coauthors were found for ${researcher.name}.`],
    };
  }

  private async retrieveResearcherPublicationTrend(
    query: string,
    history: ConversationTurn[],
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const researcher = await this.resolveResearcherFromContext(
      this.buildRetrievalQuery(query, flow),
      history,
      requestId,
    );
    if (!researcher) {
      return {
        evidence: [],
        facts: [
          "The researcher could not be resolved for the publication-trend query.",
        ],
      };
    }
    const rows = await this.prisma.paper.groupBy({
      by: ["publicationYear"],
      where: {
        authors: { some: { authorId: researcher.authorId } },
        ...(flow.year
          ? { publicationYear: flow.year }
          : flow.yearFrom || flow.yearTo
            ? {
                publicationYear: {
                  ...(flow.yearFrom ? { gte: flow.yearFrom } : {}),
                  ...(flow.yearTo ? { lte: flow.yearTo } : {}),
                },
              }
            : {}),
      },
      _count: { _all: true },
      _sum: { citedByCount: true },
      orderBy: { publicationYear: "asc" },
    });
    this.trace.log(requestId, "database.researcher_publication_trend", {
      researcher,
      rows,
    });
    return {
      evidence: [],
      facts: rows.length
        ? [
            `Indexed publication trend for ${researcher.name}: ${rows
              .map(
                (row) =>
                  `${row.publicationYear}: ${row._count._all} paper(s), ${row._sum.citedByCount ?? 0} citation(s)`,
              )
              .join("; ")}.`,
          ]
        : [`No indexed publication trend was found for ${researcher.name}.`],
    };
  }

  private async retrieveInstitutionOverview(
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const [institution, indexedPapers, researchers, authors, topics] =
      await Promise.all([
        this.institutionService.getInstitution(),
        this.prisma.paper.count(),
        this.prisma.researcher.count(),
        this.prisma.author.count(),
        this.prisma.topic.count(),
      ]);
    const location = UIUC_INSTITUTION_CONTEXT.location;
    const facts = [
      `Institution identity: ${institution.displayName}${institution.acronym ? ` (${institution.acronym})` : ""} is a ${UIUC_INSTITUTION_CONTEXT.classification} founded in ${UIUC_INSTITUTION_CONTEXT.foundedYear}, located in ${location || UIUC_INSTITUTION_CONTEXT.location}; homepage=${institution.homepageUrl ?? "https://illinois.edu"}; ROR=${institution.ror ?? "unavailable"}; OpenAlex ID=${institution.openalexId}.`,
      `Institution metrics: OpenAlex works count=${institution.worksCount}; OpenAlex cited-by count=${institution.citedByCount}; h-index=${institution.hIndex ?? "unavailable"}; i10-index=${institution.i10Index ?? "unavailable"}; two-year mean citedness=${institution.twoYearMeanCite ?? "unavailable"}; locally indexed papers=${indexedPapers}; researcher profiles=${researchers}; authors=${authors}; indexed topics=${topics}.`,
    ];
    this.trace.log(requestId, "database.institution_overview", {
      institution,
      indexedPapers,
      researchers,
      authors,
      topics,
    });
    return { evidence: [], facts };
  }

  private async retrieveInstitutionResearchAreas(
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const limit = Math.min(Math.max(flow.limit, 5), 10);
    const [areas, papersWithPrimaryTopic] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ fieldName: string; publicationCount: bigint }>
      >(Prisma.sql`
        SELECT
          COALESCE(
            NULLIF(TRIM(t.field_name), ''),
            NULLIF(TRIM(t.domain_name), ''),
            t.display_name
          ) AS fieldName,
          COUNT(*) AS publicationCount
        FROM papers p
        INNER JOIN topics t ON t.id = p.primary_topic_id
        WHERE p.primary_topic_id IS NOT NULL
        GROUP BY fieldName
        ORDER BY publicationCount DESC
        LIMIT ${limit}
      `),
      this.prisma.paper.count({
        where: { primaryTopicId: { not: null } },
      }),
    ]);
    const rankedAreas = areas.map((area) => ({
      name: area.fieldName,
      publicationCount: Number(area.publicationCount),
    }));
    this.trace.log(requestId, "database.institution_research_areas", {
      papersWithPrimaryTopic,
      areas: rankedAreas,
    });
    return {
      evidence: [],
      facts: rankedAreas.length
        ? [
            `The main University of Illinois Urbana-Champaign research areas by locally indexed publication volume are: ${rankedAreas
              .map(
                (area, index) =>
                  `${index + 1}. ${area.name} (${area.publicationCount.toLocaleString()} publications)`,
              )
              .join(
                "; ",
              )}. This ranking is based on ${papersWithPrimaryTopic.toLocaleString()} locally indexed papers with an OpenAlex primary topic; it measures publication volume, not research quality or funding.`,
          ]
        : [
            "No locally indexed papers have primary-topic metadata, so the institution's main research areas cannot be ranked yet.",
          ],
    };
  }

  private async retrieveTopResearchers(
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const byCitations = flow.sort === "CITATIONS_DESC";
    const researchers = await this.prisma.researcher.findMany({
      where: { authorId: { not: null } },
      orderBy: byCitations
        ? [{ citedByCount: "desc" }, { worksCount: "desc" }]
        : [{ worksCount: "desc" }, { citedByCount: "desc" }],
      take: flow.limit,
      select: {
        name: true,
        slug: true,
        title: true,
        department: true,
        worksCount: true,
        citedByCount: true,
      },
    });
    this.trace.log(requestId, "database.top_researchers", {
      ranking: byCitations ? "citations" : "works",
      researchers,
    });
    return {
      evidence: [],
      facts: researchers.length
        ? [
            `Top researchers by OpenAlex ${byCitations ? "cited-by count" : "works count"}: ${researchers
              .map(
                (researcher, index) =>
                  `${index + 1}. ${researcher.name}: ${researcher.worksCount} works, ${researcher.citedByCount} citations${researcher.department ? `, ${researcher.department}` : ""}, profile slug=${researcher.slug}`,
              )
              .join("; ")}.`,
          ]
        : ["No linked researchers were found."],
    };
  }

  private async retrieveTopicOverview(
    query: string,
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const subject = flow.topic?.trim() || flow.semanticQuery?.trim();
    if (!subject) {
      return {
        evidence: [],
        facts: [
          "No research topic was provided. Ask the user to name a topic.",
        ],
      };
    }
    const terms = expandResearchTopicTerms(subject);
    const where: Prisma.PaperWhereInput = {
      OR: terms.flatMap((term) => [
        { title: { contains: term } },
        { abstract: { contains: term } },
        { primaryTopic: { is: { displayName: { contains: term } } } },
        { topics: { some: { topic: { displayName: { contains: term } } } } },
      ]),
      ...(flow.year
        ? { publicationYear: flow.year }
        : flow.yearFrom || flow.yearTo
          ? {
              publicationYear: {
                ...(flow.yearFrom ? { gte: flow.yearFrom } : {}),
                ...(flow.yearTo ? { lte: flow.yearTo } : {}),
              },
            }
          : {}),
    };
    const [count, yearly, papers] = await Promise.all([
      this.prisma.paper.count({ where }),
      this.prisma.paper.groupBy({
        by: ["publicationYear"],
        where,
        _count: { _all: true },
        orderBy: { publicationYear: "asc" },
      }),
      this.prisma.paper.findMany({
        where,
        orderBy:
          flow.sort === "DATE_DESC"
            ? [{ publicationDate: "desc" }]
            : [{ citedByCount: "desc" }, { publicationDate: "desc" }],
        take: flow.limit,
        select: PAPER_EVIDENCE_SELECT,
      }),
    ]);
    const evidence = papers.map((paper) => this.mapPaperEvidence(paper));
    this.trace.log(requestId, "database.topic_overview", {
      subject,
      terms,
      count,
      yearly,
      evidence,
    });
    return {
      evidence: flow.intent === "TOPIC_TRENDS" ? [] : evidence,
      facts: [
        `Topic analysis for "${subject}": ${count} matching indexed publication(s). Publications by year: ${yearly.map((row) => `${row.publicationYear}=${row._count._all}`).join(", ") || "none"}.`,
      ],
    };
  }

  private async retrieveDepartmentOverview(
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    const department = flow.department?.trim();
    if (!department) {
      return {
        evidence: [],
        facts: [
          "No department was identified. Ask the user to provide the department name.",
        ],
      };
    }
    const researchers = await this.prisma.researcher.findMany({
      where: { department: { contains: department } },
      orderBy: [{ worksCount: "desc" }, { citedByCount: "desc" }],
      select: {
        name: true,
        slug: true,
        title: true,
        department: true,
        authorId: true,
        worksCount: true,
        citedByCount: true,
      },
    });
    const authorIds = researchers.flatMap((researcher) =>
      researcher.authorId ? [researcher.authorId] : [],
    );
    const paperWhere: Prisma.PaperWhereInput = {
      authors: { some: { authorId: { in: authorIds } } },
    };
    const [paperCount, yearly, papers] = authorIds.length
      ? await Promise.all([
          this.prisma.paper.count({ where: paperWhere }),
          this.prisma.paper.groupBy({
            by: ["publicationYear"],
            where: paperWhere,
            _count: { _all: true },
            orderBy: { publicationYear: "asc" },
          }),
          this.prisma.paper.findMany({
            where: paperWhere,
            orderBy:
              flow.sort === "CITATIONS_DESC"
                ? [{ citedByCount: "desc" }, { publicationDate: "desc" }]
                : [{ publicationDate: "desc" }],
            take: flow.limit,
            select: PAPER_EVIDENCE_SELECT,
          }),
        ])
      : [0, [], []];
    const evidence = papers.map((paper) => this.mapPaperEvidence(paper));
    this.trace.log(requestId, "database.department_overview", {
      requestedDepartment: department,
      researchers,
      paperCount,
      yearly,
      evidence,
    });
    return {
      evidence,
      facts: researchers.length
        ? [
            `Department analysis for "${department}": ${researchers.length} researcher profile(s), ${paperCount} unique indexed paper(s). Researchers: ${researchers
              .slice(0, flow.limit)
              .map(
                (researcher, index) =>
                  `${index + 1}. ${researcher.name}: ${researcher.worksCount} OpenAlex works, ${researcher.citedByCount} citations, profile slug=${researcher.slug}`,
              )
              .join(
                "; ",
              )}. Publications by year: ${yearly.map((row) => `${row.publicationYear}=${row._count._all}`).join(", ") || "none"}.`,
          ]
        : [`No researcher profile matched department "${department}".`],
    };
  }

  private flowForTool(
    flow: ChatToolSelection,
    call: ChatToolCall,
    intent: ChatToolSelection["intent"],
  ): ChatToolSelection {
    return {
      ...flow,
      intent,
      authorName: call.arguments.authorName,
      usePreviousAuthor: call.arguments.usePreviousAuthor,
      paperTitle: call.arguments.paperTitle,
      sourceNumber: call.arguments.sourceNumber,
      topic: call.arguments.topic,
      department: call.arguments.department,
      semanticQuery: call.arguments.semanticQuery,
      year: call.arguments.year,
      yearFrom: call.arguments.yearFrom,
      yearTo: call.arguments.yearTo,
      sort: call.arguments.sort,
      limit: call.arguments.limit,
      toolCalls: [],
      route: flow.route,
    };
  }

  private async executeTools(
    query: string,
    history: ConversationTurn[],
    flow: ChatToolSelection,
    requestId: string,
  ): Promise<RetrievalResult> {
    const handlers: ChatToolHandlers<EvidencePaper> = {
      get_researcher_profile: async (call) => {
        const toolFlow = this.flowForTool(flow, call, "RESEARCHER_PROFILE");
        const result = await this.retrieveResearcherProfile(
          this.buildRetrievalQuery(query, toolFlow),
          history,
          requestId,
        );
        return result ?? { evidence: [], facts: [] };
      },
      count_researcher_publications: async (call) => {
        const toolFlow = this.flowForTool(flow, call, "PUBLICATION_COUNT");
        const result = await this.retrieveStructuredCount(
          this.buildRetrievalQuery(query, toolFlow),
          history,
          toolFlow,
          requestId,
        );
        return result ?? { evidence: [], facts: [] };
      },
      list_researcher_publications: async (call) => {
        const intent =
          flow.intent === "LATEST_PUBLICATION"
            ? "LATEST_PUBLICATION"
            : "LIST_PUBLICATIONS";
        const toolFlow = this.flowForTool(flow, call, intent);
        const result = await this.retrieveResearcherPapers(
          this.buildRetrievalQuery(query, toolFlow),
          history,
          toolFlow,
          requestId,
        );
        return result ?? { evidence: [], facts: [] };
      },
      analyze_research_trends: async (call) =>
        this.retrieveResearchTrends(
          this.flowForTool(flow, call, "RESEARCH_TRENDS"),
          requestId,
        ),
      list_top_publications: async (call) =>
        this.retrieveTopPublications(
          this.flowForTool(
            flow,
            call,
            flow.intent === "RECENT_PUBLICATIONS"
              ? "RECENT_PUBLICATIONS"
              : "TOP_PUBLICATIONS",
          ),
          requestId,
        ),
      find_researchers_by_topic: async (call) =>
        this.retrieveResearchersByTopic(
          query,
          this.flowForTool(flow, call, "RESEARCHERS_BY_TOPIC"),
          requestId,
        ),
      get_paper_details: async (call) =>
        this.retrievePaperDetails(
          this.flowForTool(flow, call, flow.intent),
          requestId,
        ),
      list_researcher_coauthors: async (call) =>
        this.retrieveResearcherCoauthors(
          query,
          history,
          this.flowForTool(flow, call, "RESEARCHER_COAUTHORS"),
          requestId,
        ),
      analyze_researcher_publication_trend: async (call) =>
        this.retrieveResearcherPublicationTrend(
          query,
          history,
          this.flowForTool(flow, call, "RESEARCHER_PUBLICATION_TREND"),
          requestId,
        ),
      get_institution_overview: async () =>
        this.retrieveInstitutionOverview(requestId),
      get_institution_research_areas: async (call) =>
        this.retrieveInstitutionResearchAreas(
          this.flowForTool(flow, call, "INSTITUTION_RESEARCH_AREAS"),
          requestId,
        ),
      list_top_researchers: async (call) =>
        this.retrieveTopResearchers(
          this.flowForTool(flow, call, "TOP_RESEARCHERS"),
          requestId,
        ),
      analyze_topic: async (call) =>
        this.retrieveTopicOverview(
          query,
          this.flowForTool(flow, call, flow.intent),
          requestId,
        ),
      analyze_department: async (call) =>
        this.retrieveDepartmentOverview(
          this.flowForTool(flow, call, flow.intent),
          requestId,
        ),
      semantic_search_papers: async (call) => {
        const toolFlow = this.flowForTool(flow, call, "SEMANTIC_SEARCH");
        const retrievalQuery =
          toolFlow.semanticQuery ||
          toolFlow.topic ||
          toolFlow.paperTitle ||
          this.contextualizeRetrievalQuery(query, history);
        const resolvedResearcher =
          toolFlow.authorName || toolFlow.usePreviousAuthor
            ? await this.resolveResearcherFromContext(
                this.buildRetrievalQuery(query, toolFlow),
                history,
                requestId,
              )
            : null;
        return {
          evidence: await this.vectorSearch.search(retrievalQuery, {
            limit: toolFlow.limit,
            year: toolFlow.year ?? undefined,
            yearFrom: toolFlow.yearFrom ?? undefined,
            yearTo: toolFlow.yearTo ?? undefined,
            authorName: resolvedResearcher?.authorDisplayName,
            traceId: requestId,
          }),
          facts: [],
        };
      },
    };
    return this.toolExecutor.execute(requestId, flow.toolCalls, handlers);
  }

  private async retrieveEvidence(
    route: ChatRoute,
    query: string,
    history: ConversationTurn[],
    flow: ChatToolSelection,
    requestId = "unary",
  ): Promise<RetrievalResult> {
    if (route === "UNSUPPORTED") return { evidence: [], facts: [] };

    const retrievalQuery = this.buildRetrievalQuery(query, flow);
    this.trace.log(requestId, "retrieval.input", {
      route,
      originalQuery: query,
      retrievalQuery,
      flow,
    });

    const referenced = flow.sourceNumber
      ? this.resolveSourceNumber(flow.sourceNumber, history)
      : this.resolveReferencedSource(query, history);
    if (referenced) {
      const paper = await this.findPaperEvidence(referenced.source.paperId);
      if (paper) {
        this.trace.log(requestId, "retrieval.explicit_source_reference", {
          reference: referenced,
          paper,
        });
        return {
          evidence: [paper],
          facts: [
            `Resolved "item ${referenced.number}" to paper ID ${paper.id}: ${paper.title}.`,
          ],
        };
      }
    }

    const implicitReference = this.resolveImplicitReferencedSource(
      query,
      history,
    );
    if (implicitReference) {
      const paper = await this.findPaperEvidence(implicitReference.paperId);
      if (paper) {
        this.trace.log(requestId, "retrieval.implicit_source_reference", {
          source: implicitReference,
          paper,
        });
        return {
          evidence: [paper],
          facts: [
            `Resolved the follow-up reference to paper ID ${paper.id}: ${paper.title}.`,
          ],
        };
      }
    }

    const hasPaperDetailsTool = flow.toolCalls.some(
      (call) => call.name === "get_paper_details",
    );
    if (
      flow.paperTitle &&
      flow.intent !== "RELATED_PUBLICATIONS" &&
      !hasPaperDetailsTool
    ) {
      const paper = await this.prisma.paper.findFirst({
        where: { title: { contains: flow.paperTitle } },
        orderBy: [{ citedByCount: "desc" }, { publicationDate: "desc" }],
        select: PAPER_EVIDENCE_SELECT,
      });
      if (paper) {
        this.trace.log(requestId, "database.paper_title_match", {
          requestedTitle: flow.paperTitle,
          paper: this.mapPaperEvidence(paper),
        });
        return {
          evidence: [this.mapPaperEvidence(paper)],
          facts: [
            `Resolved the classified paper title to paper ID ${paper.id}: ${paper.title}.`,
          ],
        };
      }
    }

    if (flow.toolCalls.length) {
      return this.executeTools(query, history, flow, requestId);
    }

    const researcherPapers = [
      "LATEST_PUBLICATION",
      "LIST_PUBLICATIONS",
    ].includes(flow.intent)
      ? await this.retrieveResearcherPapers(
          retrievalQuery,
          history,
          flow,
          requestId,
        )
      : null;
    if (researcherPapers) return researcherPapers;

    if (flow.intent === "RESEARCH_TRENDS") {
      return this.retrieveResearchTrends(flow, requestId);
    }
    if (flow.intent === "TOP_PUBLICATIONS") {
      return this.retrieveTopPublications(flow, requestId);
    }
    if (flow.intent === "RESEARCHERS_BY_TOPIC") {
      return this.retrieveResearchersByTopic(query, flow, requestId);
    }

    if (route === "STRUCTURED" || route === "HYBRID") {
      const structuredResult =
        flow.intent === "PUBLICATION_COUNT"
          ? await this.retrieveStructuredCount(
              retrievalQuery,
              history,
              flow,
              requestId,
            )
          : null;
      const profileResult = ["CITATION_COUNT", "RESEARCHER_PROFILE"].includes(
        flow.intent,
      )
        ? await this.retrieveResearcherProfile(
            retrievalQuery,
            history,
            requestId,
          )
        : null;
      if (structuredResult && profileResult) {
        return {
          evidence: structuredResult.evidence,
          facts: [...structuredResult.facts, ...profileResult.facts],
        };
      }
      if (structuredResult) return structuredResult;
      if (profileResult) return profileResult;
    }

    if (route === "SEMANTIC" || route === "HYBRID") {
      const retrievalQuery =
        flow.semanticQuery ||
        flow.topic ||
        this.contextualizeRetrievalQuery(query, history);
      const resolvedResearcher =
        flow.authorName || flow.usePreviousAuthor
          ? await this.resolveResearcherFromContext(
              retrievalQuery,
              history,
              requestId,
            )
          : null;
      return {
        evidence: await this.vectorSearch.search(retrievalQuery, {
          limit: flow.limit,
          year: flow.year ?? undefined,
          yearFrom: flow.yearFrom ?? undefined,
          yearTo: flow.yearTo ?? undefined,
          authorName: resolvedResearcher?.authorDisplayName,
          traceId: requestId,
        }),
        facts: [],
      };
    }

    return {
      evidence: [],
      facts: [
        "No retrieval strategy produced relevant evidence for this question. Do not cite unrelated global publications.",
      ],
    };
  }

  private buildRetrievalQuery(
    originalQuery: string,
    flow: ChatToolSelection,
  ): string {
    const author = flow.authorName?.trim();
    const topic = flow.topic?.trim();
    const year = flow.year ? ` in ${flow.year}` : "";
    const yearRange =
      flow.yearFrom || flow.yearTo
        ? ` from ${flow.yearFrom ?? "the earliest year"} to ${flow.yearTo ?? "the present"}`
        : "";
    const subject = author || originalQuery;
    const topicClause = topic ? ` about ${topic}` : "";

    switch (flow.intent) {
      case "PUBLICATION_COUNT":
        return `how many papers does ${subject} have${topicClause}${year}${yearRange}`;
      case "CITATION_COUNT":
        return `citation count and researcher profile for ${subject}`;
      case "LATEST_PUBLICATION":
        return `latest paper by ${subject}${topicClause}${year}${yearRange}`;
      case "LIST_PUBLICATIONS": {
        const order =
          flow.sort === "CITATIONS_DESC"
            ? "most cited"
            : flow.sort === "DATE_ASC"
              ? "oldest"
              : "recent";
        return `${order} papers by ${subject}${topicClause}${year}${yearRange}`;
      }
      case "RESEARCHER_PROFILE":
        return `researcher profile for ${subject}`;
      default:
        return [originalQuery, author, topic].filter(Boolean).join(" ");
    }
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

  async processQuestion(
    dto: ChatRequestDto,
    signal?: AbortSignal,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();
    const requestId = randomUUID();
    const conversationId = this.normalizeConversationId(dto.conversationId);
    this.trace.log(requestId, "request.received", {
      transport: "unary",
      query: dto.query,
      conversationId,
    });
    const history = await this.loadConversationHistory(conversationId);
    this.trace.log(requestId, "conversation.history_loaded", {
      conversationId,
      turnCount: history.length,
      history,
    });
    const classification = await this.intentClassifier.classify(
      dto.query,
      history,
      signal,
      requestId,
    );
    const selection = this.toolSelector.select(classification, requestId);
    const route = selection.route;
    const { evidence, facts } = await this.retrieveEvidence(
      route,
      dto.query,
      history,
      selection,
      requestId,
    );
    const retrievedSources = this.toSources(evidence);
    this.trace.log(requestId, "retrieval.completed", {
      route,
      evidence,
      facts,
      sources: retrievedSources,
    });
    if (route === "UNSUPPORTED") {
      const answer = this.responseGenerator.unsupportedAnswer(dto.query);
      this.trace.log(requestId, "response_generation.unsupported", { answer });
      await this.logChatRequest(
        dto.query,
        route,
        answer,
        retrievedSources,
        startTime,
        requestId,
        conversationId,
      );
      return {
        query: dto.query,
        route,
        answer,
        sources: [],
        confidence: "low",
        latencyMs: Date.now() - startTime,
      };
    }
    const answer = await this.responseGenerator.generate(
      dto.query,
      evidence,
      history,
      facts,
      requestId,
      signal,
    );
    const sources = this.responseGenerator.selectCitedSources(
      answer,
      retrievedSources,
    );
    await this.logChatRequest(
      dto.query,
      route,
      answer,
      sources,
      startTime,
      requestId,
      conversationId,
    );
    return {
      query: dto.query,
      route,
      answer,
      sources,
      confidence: sources.length > 0 || facts.length > 0 ? "high" : "low",
      latencyMs: Date.now() - startTime,
    };
  }

  async streamQuestion(
    dto: ChatRequestDto,
    onChunk: (payload: ChatStreamChunkDto) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const startTime = Date.now();
    const requestId = randomUUID();
    const conversationId = this.normalizeConversationId(dto.conversationId);
    let route: ChatRoute | undefined;
    let stage: ChatStage = "classification";

    this.logger.log(`Chat stream started requestId=${requestId}`);
    this.trace.log(requestId, "request.received", {
      transport: "sse",
      query: dto.query,
      conversationId,
    });
    try {
      onChunk({ status: "thinking", requestId });
      this.trace.log(requestId, "stream.status", { status: "thinking" });
      const history = await this.loadConversationHistory(conversationId);
      this.trace.log(requestId, "conversation.history_loaded", {
        conversationId,
        turnCount: history.length,
        history,
      });
      const classification = await this.intentClassifier.classify(
        dto.query,
        history,
        signal,
        requestId,
      );
      stage = "tool_selection";
      const selection = this.toolSelector.select(classification, requestId);
      route = selection.route;
      this.logger.log(
        `Chat tool selection requestId=${requestId} intent=${classification.intent} tools=${selection.toolCalls.map((call) => call.name).join(",")} route=${route}`,
      );
      stage = "tool_calling";
      const { evidence, facts } = await this.retrieveEvidence(
        route,
        dto.query,
        history,
        selection,
        requestId,
      );
      if (signal?.aborted) return;
      const retrievedSources = this.toSources(evidence);
      this.trace.log(requestId, "retrieval.completed", {
        route,
        evidence,
        facts,
        sources: retrievedSources,
      });
      onChunk({ status: "generating", requestId, route });
      this.trace.log(requestId, "stream.status", {
        status: "generating",
        route,
        sources: retrievedSources,
      });

      if (route === "UNSUPPORTED") {
        const answer = this.responseGenerator.unsupportedAnswer(dto.query);
        this.trace.log(requestId, "response_generation.unsupported", {
          answer,
        });
        onChunk({ status: "generating", requestId, token: answer });
        onChunk({ status: "completed", requestId, done: true });
        stage = "logging";
        await this.logChatRequest(
          dto.query,
          route,
          answer,
          [],
          startTime,
          requestId,
          conversationId,
        );
        this.logger.log(
          `Chat stream completed requestId=${requestId} route=${route} sources=0 latencyMs=${Date.now() - startTime}`,
        );
        return;
      }

      stage = "response_generation";
      const answer = await this.responseGenerator.generate(
        dto.query,
        evidence,
        history,
        facts,
        requestId,
        signal,
        (token) => {
          onChunk({ status: "generating", requestId, token });
        },
      );
      if (signal?.aborted) return;
      const sources = this.responseGenerator.selectCitedSources(
        answer,
        retrievedSources,
      );
      onChunk({ status: "completed", requestId, done: true, sources });
      this.trace.log(requestId, "stream.status", {
        status: "completed",
        done: true,
      });
      stage = "logging";
      await this.logChatRequest(
        dto.query,
        route,
        answer,
        sources,
        startTime,
        requestId,
        conversationId,
      );
      this.logger.log(
        `Chat stream completed requestId=${requestId} route=${route} sources=${sources.length} latencyMs=${Date.now() - startTime}`,
      );
    } catch (error) {
      if (!signal?.aborted) {
        const normalizedError =
          error instanceof Error ? error : new Error("Unknown chat error");
        const clientError = this.toClientError(normalizedError, stage);
        this.logger.error(
          `Chat stream failed requestId=${requestId} stage=${stage} route=${route ?? "UNKNOWN"} latencyMs=${Date.now() - startTime}: ${normalizedError.message}`,
          normalizedError.stack,
        );
        this.trace.log(requestId, "request.failed", {
          stage,
          route,
          error: normalizedError.message,
          stack: normalizedError.stack,
          clientError,
          latencyMs: Date.now() - startTime,
        });
        onChunk({
          status: "error",
          requestId,
          error: clientError.message,
          errorCode: clientError.code,
          done: true,
        });
      }
    }
  }

  private toClientError(
    error: Error,
    stage: ChatStage,
  ): { code: ChatStreamErrorCode; message: string } {
    const message = error.message.toLowerCase();

    if (message.includes("no default ai credential")) {
      return {
        code: "AI_NOT_CONFIGURED",
        message:
          "No AI provider is configured. Add an active default credential in AI provider settings.",
      };
    }
    if (
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("resource_exhausted") ||
      message.includes("provider returned 429")
    ) {
      return {
        code: "AI_QUOTA_EXCEEDED",
        message:
          "The AI provider quota has been exceeded. Please try again later or check the configured plan.",
      };
    }
    if (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("permission denied") ||
      message.includes("provider returned 401") ||
      message.includes("provider returned 403")
    ) {
      return {
        code: "AI_AUTH_FAILED",
        message:
          "The AI provider rejected the configured credential. Check the API key in AI provider settings.",
      };
    }
    if (
      stage === "response_generation" &&
      (message.includes("model") || message.includes("provider returned 404"))
    ) {
      return {
        code: "AI_MODEL_UNAVAILABLE",
        message:
          "The configured AI model is unavailable. Check the selected chat model.",
      };
    }
    if (stage === "tool_calling") {
      return {
        code: "VECTOR_SEARCH_FAILED",
        message:
          "Research evidence could not be retrieved. Check the Qdrant connection and try again.",
      };
    }
    if (stage === "response_generation") {
      return {
        code: "AI_PROVIDER_FAILED",
        message:
          "The AI provider could not generate a response. Please try again.",
      };
    }
    return {
      code: "CHAT_FAILED",
      message: "The research assistant could not complete this request.",
    };
  }

  private async logChatRequest(
    query: string,
    route: ChatRoute,
    response: string,
    sources: ChatCitationDto[],
    startTime: number,
    requestId?: string,
    conversationId?: string,
  ): Promise<void> {
    try {
      const record = await this.prisma.chatRequest.create({
        data: {
          conversationId,
          query,
          route,
          response,
          citations: sources as unknown as Prisma.InputJsonValue,
          latencyMs: Date.now() - startTime,
        },
      });
      this.trace.log(requestId ?? "unary", "persistence.chat_request_saved", {
        record,
      });
    } catch (error) {
      // Logging must not break a successful response.
      const message =
        error instanceof Error ? error.message : "Unknown database error";
      this.logger.warn(
        `Chat history write failed requestId=${requestId ?? "unary"}: ${message}`,
      );
    }
  }
}
