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

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
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
            `${label} rate limit budget is exhausted; retry after ${retryAfter}s or configure OPENALEX_API_KEY`,
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
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  async getInstitution(institutionId: string = "I157725225"): Promise<any> {
    const cleanId = institutionId.replace("https://openalex.org/", "");
    const url = `${this.baseUrl}/institutions/${cleanId}?mailto=${encodeURIComponent(this.email || "")}`;
    return this.request(url, "OpenAlex institution fetch");
  }

  async getWorks(
    params: {
      institutionId?: string;
      cursor?: string;
      perPage?: number;
      fromYear?: number;
      toYear?: number;
      fromDate?: string;
      toDate?: string;
      search?: string;
    } = {},
  ): Promise<OpenAlexWorksResponse> {
    const instId = (params.institutionId || "I157725225").replace(
      "https://openalex.org/",
      "",
    );
    const perPage = Math.min(params.perPage || 200, 200);
    const cursor = params.cursor || "*";

    const filterParts: string[] = [`institutions.id:${instId}`];
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

    const url = new URL(`${this.baseUrl}/works`);
    url.searchParams.set("filter", filterParts.join(","));
    url.searchParams.set("per-page", perPage.toString());
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
      institutionId?: string;
      cursor?: string;
      perPage?: number;
      search?: string;
    } = {},
  ): Promise<OpenAlexAuthorsResponse> {
    const instId = (params.institutionId || "I157725225").replace(
      "https://openalex.org/",
      "",
    );
    const url = new URL(`${this.baseUrl}/authors`);
    url.searchParams.set("filter", `affiliations.institution.id:${instId}`);
    url.searchParams.set(
      "per-page",
      String(Math.min(params.perPage || 200, 200)),
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
}
