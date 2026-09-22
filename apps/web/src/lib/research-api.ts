import {
  InstitutionDto,
  AnalyticsStatsDto,
  PublicationYearTrendDto,
  TopicTrendDto,
  PaperDto,
  PaperListQueryDto,
  PaginatedResult,
  ResearcherDto,
  ChatResponseDto,
  ChatCitationDto,
} from "@repo/contracts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  } catch (err) {
    console.warn(`Fetch error for ${path}:`, err);
    throw err;
  }
}

export interface StreamChunkPayload {
  token?: string;
  route?: string;
  sources?: ChatCitationDto[];
  done?: boolean;
}

export const researchApi = {
  async getInstitution(): Promise<InstitutionDto> {
    return fetchJson<InstitutionDto>("/v1/institution");
  },

  async getStats(): Promise<AnalyticsStatsDto> {
    return fetchJson<AnalyticsStatsDto>("/v1/stats");
  },

  async getTrends(): Promise<PublicationYearTrendDto[]> {
    return fetchJson<PublicationYearTrendDto[]>("/v1/trends");
  },

  async getTopics(): Promise<TopicTrendDto[]> {
    return fetchJson<TopicTrendDto[]>("/v1/topics");
  },

  async getPapers(query: PaperListQueryDto = {}): Promise<PaginatedResult<PaperDto>> {
    const params = new URLSearchParams();
    if (query.query) params.set("query", query.query);
    if (query.topic) params.set("topic", query.topic);
    if (query.year) params.set("year", String(query.year));
    if (query.sort) params.set("sort", query.sort);
    if (query.order) params.set("order", query.order);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));

    const qs = params.toString();
    return fetchJson<PaginatedResult<PaperDto>>(`/v1/papers${qs ? `?${qs}` : ""}`);
  },

  async getPaper(id: string): Promise<PaperDto> {
    return fetchJson<PaperDto>(`/v1/papers/${encodeURIComponent(id)}`);
  },

  async getResearchers(params: {
    query?: string;
    department?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResult<ResearcherDto>> {
    const qs = new URLSearchParams();
    if (params.query) qs.set("query", params.query);
    if (params.department) qs.set("department", params.department);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));

    const qString = qs.toString();
    return fetchJson<PaginatedResult<ResearcherDto>>(`/v1/researchers${qString ? `?${qString}` : ""}`);
  },

  async askAssistant(query: string): Promise<ChatResponseDto> {
    return fetchJson<ChatResponseDto>("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ query }),
      cache: "no-store",
    });
  },

  async *streamAssistant(
    query: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunkPayload> {
    const res = await fetch(`${API_BASE_URL}/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`Streaming failed: ${res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        const line = block.trim();
        if (line.startsWith("data: ")) {
          try {
            const data: StreamChunkPayload = JSON.parse(line.slice(6));
            yield data;
          } catch {
            // ignore JSON parse error for malformed SSE chunks
          }
        }
      }
    }
  },
};
