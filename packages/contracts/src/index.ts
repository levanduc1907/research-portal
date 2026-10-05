export interface InstitutionDto {
  id: string;
  openalexId: string;
  displayName: string;
  acronym: string | null;
  ror: string | null;
  countryCode: string | null;
  type: string | null;
  homepageUrl: string | null;
  imageUrl: string | null;
  worksCount: number;
  citedByCount: number;
  hIndex: number | null;
  i10Index: number | null;
  twoYearMeanCite: number | null;
  geo?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface PaperAuthorDto {
  id: string;
  openalexId: string;
  displayName: string;
  authorPosition: string;
}

export interface PaperTopicDto {
  id: string;
  openalexId: string;
  displayName: string;
  domainName?: string | null;
  fieldName?: string | null;
  score: number;
  isPrimary: boolean;
}

export interface PaperDto {
  id: string;
  openalexId: string;
  doi: string | null;
  title: string;
  publicationDate: string;
  publicationYear: number;
  citedByCount: number;
  abstract: string | null;
  landingPageUrl: string | null;
  pdfUrl: string | null;
  primaryTopic?: {
    id: string;
    displayName: string;
  } | null;
  authors: PaperAuthorDto[];
  topics: PaperTopicDto[];
}

export interface PaperListQueryDto {
  query?: string;
  topic?: string;
  year?: number;
  sort?: "citations" | "date" | "relevance";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ResearcherDto {
  id: string;
  slug: string;
  openalexId?: string | null;
  name: string;
  email: string | null;
  department: string | null;
  title: string | null;
  bio: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
  worksCount: number;
  citedByCount: number;
  keywords: string[];
  /** Total topics available. List responses may only include a small preview. */
  topicCount?: number;
}

export interface ResearcherPaperDto {
  id: string;
  openalexId: string;
  title: string;
  publicationDate: string;
  publicationYear: number;
  citedByCount: number;
  doi: string | null;
  landingPageUrl: string | null;
  authorPosition: string;
  isCorresponding: boolean;
  primaryTopic: {
    id: string;
    displayName: string;
  } | null;
}

export interface AnalyticsStatsDto {
  totalPapers: number;
  totalCitations: number;
  totalResearchers: number;
  totalTopics: number;
  hIndex: number;
  i10Index: number;
}

export interface TopicTrendDto {
  topicId: string;
  displayName: string;
  count: number;
  percentage: number;
}

export interface PublicationYearTrendDto {
  year: number;
  count: number;
  citedCount: number;
}

export interface ChatRequestDto {
  query: string;
  conversationId?: string;
}

export interface ChatCitationDto {
  paperId: string;
  title: string;
  year: number;
  citedByCount: number;
  doi: string | null;
}

export interface ChatResponseDto {
  query: string;
  route: "STRUCTURED" | "SEMANTIC" | "HYBRID" | "UNSUPPORTED";
  answer: string;
  sources: ChatCitationDto[];
  confidence: "high" | "medium" | "low";
  latencyMs: number;
}

export type ChatStreamStatus =
  | "thinking"
  | "generating"
  | "completed"
  | "error";

export type ChatStreamErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_AUTH_FAILED"
  | "AI_MODEL_UNAVAILABLE"
  | "VECTOR_SEARCH_FAILED"
  | "AI_PROVIDER_FAILED"
  | "CHAT_TIMEOUT"
  | "CHAT_FAILED";

export interface ChatStreamChunkDto {
  status: ChatStreamStatus;
  requestId?: string;
  token?: string;
  error?: string;
  errorCode?: ChatStreamErrorCode;
  route?: ChatResponseDto["route"];
  sources?: ChatCitationDto[];
  done?: boolean;
}

export type AiProvider = "OPENAI" | "GEMINI" | "OPENAI_COMPATIBLE";

export interface AiCredentialDto {
  id: string;
  name: string;
  provider: AiProvider;
  keyHint: string;
  baseUrl: string | null;
  defaultModel: string;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastTestStatus: "success" | "failed" | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiCredentialDto {
  name: string;
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateAiCredentialDto {
  name?: string;
  apiKey?: string;
  baseUrl?: string | null;
  defaultModel?: string;
  isActive?: boolean;
  isDefault?: boolean;
}
