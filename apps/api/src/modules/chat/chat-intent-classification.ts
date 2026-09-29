import type { ChatResponseDto } from "@repo/contracts";

export const CHAT_INTENTS = [
  "PUBLICATION_COUNT",
  "CITATION_COUNT",
  "LATEST_PUBLICATION",
  "LIST_PUBLICATIONS",
  "RESEARCHER_PROFILE",
  "RESEARCHER_CONTACT",
  "RESEARCHER_AFFILIATION",
  "RESEARCHER_RESEARCH_AREAS",
  "RESEARCHER_COAUTHORS",
  "RESEARCHER_PUBLICATION_TREND",
  "PAPER_SUMMARY",
  "PAPER_DETAILS",
  "PAPER_AUTHORS",
  "PAPER_CITATION_COUNT",
  "PAPER_TOPICS",
  "PAPER_LINKS",
  "RELATED_PUBLICATIONS",
  "RESEARCH_TRENDS",
  "TOP_PUBLICATIONS",
  "RECENT_PUBLICATIONS",
  "RESEARCHERS_BY_TOPIC",
  "TOP_RESEARCHERS",
  "TOPIC_OVERVIEW",
  "TOPIC_PUBLICATIONS",
  "TOPIC_TRENDS",
  "DEPARTMENT_OVERVIEW",
  "DEPARTMENT_RESEARCHERS",
  "DEPARTMENT_PUBLICATIONS",
  "DEPARTMENT_TRENDS",
  "INSTITUTION_OVERVIEW",
  "INSTITUTION_RESEARCH_AREAS",
  "INSTITUTION_PUBLICATION_COUNT",
  "INSTITUTION_CITATION_COUNT",
  "SEMANTIC_SEARCH",
  "RESEARCHER_SUMMARY",
  "UNSUPPORTED",
] as const;

export const RETRIEVAL_STRATEGIES = ["DATABASE", "VECTOR", "HYBRID"] as const;

export type ChatIntent = (typeof CHAT_INTENTS)[number];
export type RetrievalStrategy = (typeof RETRIEVAL_STRATEGIES)[number];

export const CHAT_TOOL_NAMES = [
  "get_researcher_profile",
  "count_researcher_publications",
  "list_researcher_publications",
  "analyze_research_trends",
  "list_top_publications",
  "find_researchers_by_topic",
  "get_paper_details",
  "list_researcher_coauthors",
  "analyze_researcher_publication_trend",
  "get_institution_overview",
  "get_institution_research_areas",
  "list_top_researchers",
  "analyze_topic",
  "analyze_department",
  "semantic_search_papers",
] as const;

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];

export interface ChatToolCall {
  id: string;
  name: ChatToolName;
  arguments: {
    authorName: string | null;
    usePreviousAuthor: boolean;
    paperTitle: string | null;
    sourceNumber: number | null;
    topic: string | null;
    department: string | null;
    semanticQuery: string | null;
    year: number | null;
    yearFrom: number | null;
    yearTo: number | null;
    sort: ChatIntentClassification["sort"];
    limit: number;
  };
}

export interface ChatIntentClassification {
  intent: ChatIntent;
  secondaryIntents: ChatIntent[];
  retrieval: RetrievalStrategy;
  language: "en" | "vi";
  authorName: string | null;
  usePreviousAuthor: boolean;
  paperTitle: string | null;
  sourceNumber: number | null;
  topic: string | null;
  department: string | null;
  semanticQuery: string | null;
  year: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  sort: "DATE_ASC" | "DATE_DESC" | "CITATIONS_DESC" | "RELEVANCE" | null;
  limit: number;
}

export interface ChatToolSelection extends ChatIntentClassification {
  toolCalls: ChatToolCall[];
  route: ChatResponseDto["route"];
}

const DATABASE_INTENTS = new Set<ChatIntent>([
  "PUBLICATION_COUNT",
  "CITATION_COUNT",
  "LATEST_PUBLICATION",
  "LIST_PUBLICATIONS",
  "RESEARCHER_PROFILE",
  "RESEARCHER_CONTACT",
  "RESEARCHER_AFFILIATION",
  "RESEARCHER_RESEARCH_AREAS",
  "RESEARCHER_COAUTHORS",
  "RESEARCHER_PUBLICATION_TREND",
  "PAPER_DETAILS",
  "PAPER_AUTHORS",
  "PAPER_CITATION_COUNT",
  "PAPER_TOPICS",
  "PAPER_LINKS",
  "RESEARCH_TRENDS",
  "TOP_PUBLICATIONS",
  "RECENT_PUBLICATIONS",
  "RESEARCHERS_BY_TOPIC",
  "TOP_RESEARCHERS",
  "TOPIC_OVERVIEW",
  "TOPIC_PUBLICATIONS",
  "TOPIC_TRENDS",
  "DEPARTMENT_OVERVIEW",
  "DEPARTMENT_RESEARCHERS",
  "DEPARTMENT_PUBLICATIONS",
  "DEPARTMENT_TRENDS",
  "INSTITUTION_OVERVIEW",
  "INSTITUTION_RESEARCH_AREAS",
  "INSTITUTION_PUBLICATION_COUNT",
  "INSTITUTION_CITATION_COUNT",
]);

export function parseIntentClassification(
  raw: string,
): ChatIntentClassification | null {
  const json = extractJsonObject(raw);
  if (!json) return null;

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!isOneOf(input.intent, CHAT_INTENTS)) return null;

  const intent = input.intent;
  const requestedRetrieval = isOneOf(input.retrieval, RETRIEVAL_STRATEGIES)
    ? input.retrieval
    : "HYBRID";
  const retrieval = DATABASE_INTENTS.has(intent)
    ? "DATABASE"
    : intent === "UNSUPPORTED"
      ? "DATABASE"
      : requestedRetrieval;

  return {
    intent,
    secondaryIntents: Array.isArray(input.secondaryIntents)
      ? input.secondaryIntents
          .filter((value): value is ChatIntent => isOneOf(value, CHAT_INTENTS))
          .filter((value) => value !== intent && value !== "UNSUPPORTED")
          .slice(0, 3)
      : [],
    retrieval,
    language: input.language === "vi" ? "vi" : "en",
    authorName: boundedString(input.authorName, 200),
    usePreviousAuthor: input.usePreviousAuthor === true,
    paperTitle: boundedString(input.paperTitle, 500),
    sourceNumber: boundedInteger(input.sourceNumber, 1, 20),
    topic: sanitizedTopic(input.topic),
    department: boundedString(input.department, 300),
    semanticQuery: boundedString(input.semanticQuery, 500),
    year: boundedInteger(input.year, 1900, 2100),
    yearFrom: boundedInteger(input.yearFrom, 1900, 2100),
    yearTo: boundedInteger(input.yearTo, 1900, 2100),
    sort: isOneOf(input.sort, [
      "DATE_ASC",
      "DATE_DESC",
      "CITATIONS_DESC",
      "RELEVANCE",
    ] as const)
      ? input.sort
      : null,
    limit: boundedInteger(input.limit, 1, 50) ?? 5,
  };
}

export function toolCallsForClassification(
  classification: ChatIntentClassification,
): ChatToolCall[] {
  const nameByIntent: Partial<Record<ChatIntent, ChatToolName>> = {
    PUBLICATION_COUNT: "count_researcher_publications",
    CITATION_COUNT: "get_researcher_profile",
    LATEST_PUBLICATION: "list_researcher_publications",
    LIST_PUBLICATIONS: "list_researcher_publications",
    RESEARCHER_PROFILE: "get_researcher_profile",
    RESEARCHER_SUMMARY: "get_researcher_profile",
    RESEARCHER_CONTACT: "get_researcher_profile",
    RESEARCHER_AFFILIATION: "get_researcher_profile",
    RESEARCHER_RESEARCH_AREAS: "get_researcher_profile",
    RESEARCHER_COAUTHORS: "list_researcher_coauthors",
    RESEARCHER_PUBLICATION_TREND: "analyze_researcher_publication_trend",
    PAPER_DETAILS: "get_paper_details",
    PAPER_AUTHORS: "get_paper_details",
    PAPER_CITATION_COUNT: "get_paper_details",
    PAPER_TOPICS: "get_paper_details",
    PAPER_LINKS: "get_paper_details",
    RESEARCH_TRENDS: "analyze_research_trends",
    TOP_PUBLICATIONS: "list_top_publications",
    RECENT_PUBLICATIONS: "list_top_publications",
    RESEARCHERS_BY_TOPIC: "find_researchers_by_topic",
    TOP_RESEARCHERS: "list_top_researchers",
    TOPIC_OVERVIEW: "analyze_topic",
    TOPIC_PUBLICATIONS: "analyze_topic",
    TOPIC_TRENDS: "analyze_topic",
    DEPARTMENT_OVERVIEW: "analyze_department",
    DEPARTMENT_RESEARCHERS: "analyze_department",
    DEPARTMENT_PUBLICATIONS: "analyze_department",
    DEPARTMENT_TRENDS: "analyze_department",
    INSTITUTION_OVERVIEW: "get_institution_overview",
    INSTITUTION_RESEARCH_AREAS: "get_institution_research_areas",
    INSTITUTION_PUBLICATION_COUNT: "get_institution_overview",
    INSTITUTION_CITATION_COUNT: "get_institution_overview",
    PAPER_SUMMARY: "semantic_search_papers",
    RELATED_PUBLICATIONS: "semantic_search_papers",
    SEMANTIC_SEARCH: "semantic_search_papers",
  };
  return [classification.intent, ...classification.secondaryIntents]
    .map((intent) => nameByIntent[intent])
    .filter((name): name is ChatToolName => Boolean(name))
    .filter((name, index, names) => names.indexOf(name) === index)
    .slice(0, 4)
    .map((name, index) => ({
      id: `call-${index + 1}`,
      name,
      arguments: {
        authorName: classification.authorName,
        usePreviousAuthor: classification.usePreviousAuthor,
        paperTitle: classification.paperTitle,
        sourceNumber: classification.sourceNumber,
        topic: classification.topic,
        department: classification.department,
        semanticQuery: classification.semanticQuery,
        year: classification.year,
        yearFrom: classification.yearFrom,
        yearTo: classification.yearTo,
        sort: classification.sort,
        limit: classification.limit,
      },
    }));
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function sanitizedTopic(value: unknown): string | null {
  const topic = boundedString(value, 300);
  if (!topic) return null;
  const normalized = topic
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
  const nonTopics = new Set([
    "may",
    "bao nhieu",
    "tong so",
    "paper",
    "papers",
    "publication",
    "publications",
    "article",
    "articles",
    "work",
    "works",
    "research",
    "bai",
    "bai bao",
    "bai viet",
    "cong trinh",
    "an pham",
  ]);
  return nonTopics.has(normalized) ? null : topic;
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= minimum && value <= maximum ? value : null;
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}
