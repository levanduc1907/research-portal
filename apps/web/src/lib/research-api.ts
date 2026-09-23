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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  async getPapers(
    query: PaperListQueryDto = {},
  ): Promise<PaginatedResult<PaperDto>> {
    const params = new URLSearchParams();
    if (query.query) params.set("query", query.query);
    if (query.topic) params.set("topic", query.topic);
    if (query.year) params.set("year", String(query.year));
    if (query.sort) params.set("sort", query.sort);
    if (query.order) params.set("order", query.order);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));

    const qs = params.toString();
    return fetchJson<PaginatedResult<PaperDto>>(
      `/v1/papers${qs ? `?${qs}` : ""}`,
    );
  },

  async getPaper(id: string): Promise<PaperDto> {
    return fetchJson<PaperDto>(`/v1/papers/${encodeURIComponent(id)}`);
  },

  async getResearcher(id: string): Promise<ResearcherDto> {
    return fetchJson<ResearcherDto>(
      `/v1/researchers/${encodeURIComponent(id)}`,
    );
  },

  async getResearchers(
    params: {
      query?: string;
      department?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<PaginatedResult<ResearcherDto>> {
    const qs = new URLSearchParams();
    if (params.query) qs.set("query", params.query);
    if (params.department) qs.set("department", params.department);
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));

    const qString = qs.toString();
    return fetchJson<PaginatedResult<ResearcherDto>>(
      `/v1/researchers${qString ? `?${qString}` : ""}`,
    );
  },

  async getResearcherDepartments(): Promise<string[]> {
    return fetchJson<string[]>("/v1/researchers/departments");
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
    signal?: AbortSignal,
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

    const parseEvent = (block: string): StreamChunkPayload | null => {
      const payload = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!payload) return null;
      try {
        return JSON.parse(payload) as StreamChunkPayload;
      } catch {
        return null;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        const trailingEvent = parseEvent(buffer.trim());
        if (trailingEvent) yield trailingEvent;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.search(/\r?\n\r?\n/);
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0];
        buffer = buffer.slice(boundary + (separator?.length ?? 2));
        const event = parseEvent(block);
        if (event) yield event;
        boundary = buffer.search(/\r?\n\r?\n/);
      }
    }
  },
};
