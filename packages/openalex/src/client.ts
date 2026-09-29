import { OpenAlexWorkRaw } from "./mapper";
import { OpenAlexAuthorEntityRaw } from "./author-mapper";

export interface OpenAlexClientOptions {
  baseUrl?: string;
  email?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface OpenAlexWorksResponse {
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number | null;
    per_page: number;
    next_cursor?: string | null;
  };
  results: OpenAlexWorkRaw[];
}

export interface OpenAlexAuthorsResponse {
  meta: OpenAlexWorksResponse["meta"];
  results: OpenAlexAuthorEntityRaw[];
}

export interface OpenAlexTopicGroup {
  key: string;
  key_display_name: string;
  count: number;
}

interface OpenAlexTopicGroupsResponse {
  meta: OpenAlexWorksResponse["meta"] & {
    groups_count?: number | null;
  };
  group_by: OpenAlexTopicGroup[];
}

export class OpenAlexClient {
  private readonly baseUrl: string;
  private readonly email?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(options: OpenAlexClientOptions = {}) {
    this.baseUrl = options.baseUrl || "https://api.openalex.org";
    this.email = options.email || "ichikunana197@gmail.com";
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs || 30_000;
    this.maxRetries = options.maxRetries ?? 4;
  }

  private async request<T>(url: string, label: string): Promise<T> {
    let lastError: Error | undefined;
    const requestUrl = new URL(url);
    if (this.apiKey && !requestUrl.searchParams.has("api_key")) {
      requestUrl.searchParams.set("api_key", this.apiKey);
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(requestUrl, {
          headers: this.buildHeaders(),
          signal: controller.signal,
        });

        if (response.ok) return (await response.json()) as T;

        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable) {
          throw new Error(
            `${label} failed: ${response.status} ${response.statusText}`,
          );
        }
        if (attempt === this.maxRetries)
          throw new Error(
            `${label} failed after retries: ${response.status} ${response.statusText}`,
          );

        const retryAfter = Number(response.headers.get("retry-after"));
        if (response.status === 429 && retryAfter > 60) {
          throw new Error(
            this.apiKey
              ? `${label} daily budget is exhausted for the configured OPENALEX_API_KEY; retry after ${retryAfter}s`
              : `${label} anonymous rate limit budget is exhausted; retry after ${retryAfter}s or configure OPENALEX_API_KEY`,
          );
        }
        const delayMs =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1_000
            : Math.min(1_000 * 2 ** attempt, 15_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === this.maxRetries) throw lastError;
        if (lastError.message.includes("rate limit budget is exhausted")) {
          throw lastError;
        }
        if (
          /failed: 4\d\d/.test(lastError.message) &&
          !/failed: 429/.test(lastError.message)
        )
          throw lastError;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1_000 * 2 ** attempt, 15_000)),
        );
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error(`${label} failed`);
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": `UIUCResearchPortal/1.0 (mailto:${this.email})`,
    };
    return headers;
  }

  async getInstitution(institutionId: string = "I157725225"): Promise<any> {
    const cleanId = institutionId.replace("https://openalex.org/", "");
    const url = `${this.baseUrl}/institutions/${cleanId}?mailto=${encodeURIComponent(this.email || "")}`;
    return this.request(url, "OpenAlex institution fetch");
  }

  async getWorks(
    params: {
      institutionId?: string | null;
      authorId?: string;
      cursor?: string;
      perPage?: number;
      fromYear?: number;
      toYear?: number;
      fromDate?: string;
      toDate?: string;
      search?: string;
      rawAuthorName?: string;
    } = {},
  ): Promise<OpenAlexWorksResponse> {
    const perPage = Math.min(params.perPage || 100, 100);
    const cursor = params.cursor || "*";

    const filterParts: string[] = [];
    if (params.authorId) {
      const authorId = params.authorId.replace("https://openalex.org/", "");
      filterParts.push(`authorships.author.id:${authorId}`);
    } else if (params.institutionId !== null) {
      const institutionId = (params.institutionId || "I157725225").replace(
        "https://openalex.org/",
        "",
      );
      filterParts.push(`authorships.institutions.id:${institutionId}`);
    }
    if (params.fromDate) {
      filterParts.push(`from_publication_date:${params.fromDate}`);
    } else if (params.fromYear) {
      filterParts.push(`from_publication_date:${params.fromYear}-01-01`);
    }

    if (params.toDate) {
      filterParts.push(`to_publication_date:${params.toDate}`);
    } else if (params.toYear) {
      filterParts.push(`to_publication_date:${params.toYear}-12-31`);
    }
    if (params.rawAuthorName) {
      filterParts.push(`raw_author_name.search:${params.rawAuthorName}`);
    }

    const url = new URL(`${this.baseUrl}/works`);
    if (filterParts.length) {
      url.searchParams.set("filter", filterParts.join(","));
    }
    url.searchParams.set("per_page", perPage.toString());
    url.searchParams.set("cursor", cursor);
    url.searchParams.set("mailto", this.email || "");

    if (params.search) {
      url.searchParams.set("search", params.search);
    }

    return this.request<OpenAlexWorksResponse>(
      url.toString(),
      "OpenAlex works query",
    );
  }

  async getAuthors(
    params: {
      institutionId?: string | null;
      cursor?: string;
      perPage?: number;
      search?: string;
    } = {},
  ): Promise<OpenAlexAuthorsResponse> {
    const url = new URL(`${this.baseUrl}/authors`);
    if (params.institutionId !== null) {
      const institutionId = (params.institutionId || "I157725225").replace(
        "https://openalex.org/",
        "",
      );
      url.searchParams.set(
        "filter",
        `affiliations.institution.id:${institutionId}`,
      );
    }
    url.searchParams.set(
      "per_page",
      String(Math.min(params.perPage || 100, 100)),
    );
    url.searchParams.set("cursor", params.cursor || "*");
    url.searchParams.set("sort", "works_count:desc");
    url.searchParams.set("mailto", this.email || "");
    if (params.search) url.searchParams.set("search", params.search);

    return this.request<OpenAlexAuthorsResponse>(
      url.toString(),
      "OpenAlex authors query",
    );
  }

  async getAuthorsByIds(
    authorIds: string[],
  ): Promise<OpenAlexAuthorEntityRaw[]> {
    const cleanIds = [
      ...new Set(
        authorIds
          .map((id) => id.replace("https://openalex.org/", "").trim())
          .filter(Boolean),
      ),
    ];
    const authors: OpenAlexAuthorEntityRaw[] = [];

    for (let index = 0; index < cleanIds.length; index += 100) {
      const batch = cleanIds.slice(index, index + 100);
      const url = new URL(`${this.baseUrl}/authors`);
      url.searchParams.set("filter", `openalex_id:${batch.join("|")}`);
      url.searchParams.set("per_page", "100");
      url.searchParams.set("mailto", this.email || "");
      const response = await this.request<OpenAlexAuthorsResponse>(
        url.toString(),
        "OpenAlex authors batch query",
      );
      authors.push(...response.results);
    }

    return authors;
  }

  async getAuthor(authorId: string): Promise<OpenAlexAuthorEntityRaw> {
    const cleanId = authorId.replace("https://openalex.org/", "");
    const url = new URL(
      `${this.baseUrl}/authors/${encodeURIComponent(cleanId)}`,
    );
    url.searchParams.set("mailto", this.email || "");
    return this.request<OpenAlexAuthorEntityRaw>(
      url.toString(),
      "OpenAlex author fetch",
    );
  }

  async getAuthorTopics(authorId: string): Promise<OpenAlexTopicGroup[]> {
    const cleanId = authorId.replace("https://openalex.org/", "");
    const topics = new Map<string, OpenAlexTopicGroup>();
    let cursor: string | null = "*";

    while (cursor) {
      const url = new URL(`${this.baseUrl}/works`);
      url.searchParams.set("filter", `authorships.author.id:${cleanId}`);
      url.searchParams.set("group_by", "topics.id");
      url.searchParams.set("per_page", "100");
      url.searchParams.set("cursor", cursor);
      url.searchParams.set("mailto", this.email || "");

      const response = await this.request<OpenAlexTopicGroupsResponse>(
        url.toString(),
        "OpenAlex author topics query",
      );
      for (const topic of response.group_by || []) {
        if (!topic.key || !topic.key_display_name) continue;
        topics.set(topic.key, topic);
      }

      const nextCursor = response.meta.next_cursor || null;
      if (nextCursor === cursor) {
        throw new Error("OpenAlex returned a repeated author topics cursor");
      }
      cursor = nextCursor;
    }

    return [...topics.values()].sort(
      (left, right) =>
        right.count - left.count || left.key.localeCompare(right.key),
    );
  }
}
