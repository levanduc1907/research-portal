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
