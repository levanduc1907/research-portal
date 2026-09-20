import { OpenAlexWorkRaw } from "./mapper";

export interface OpenAlexClientOptions {
  baseUrl?: string;
  email?: string;
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

export class OpenAlexClient {
  private readonly baseUrl: string;
  private readonly email?: string;

  constructor(options: OpenAlexClientOptions = {}) {
    this.baseUrl = options.baseUrl || "https://api.openalex.org";
    this.email = options.email || "research-portal@illinois.edu";
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
    const res = await fetch(url, { headers: this.buildHeaders() });
    if (!res.ok) {
      throw new Error(`OpenAlex institution fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async getWorks(params: {
    institutionId?: string;
    cursor?: string;
    perPage?: number;
    fromYear?: number;
    toYear?: number;
    search?: string;
  } = {}): Promise<OpenAlexWorksResponse> {
    const instId = (params.institutionId || "I157725225").replace("https://openalex.org/", "");
    const perPage = params.perPage || 100;
    const cursor = params.cursor || "*";

    const filterParts: string[] = [`institutions.id:${instId}`];
    if (params.fromYear) {
      filterParts.push(`from_publication_date:${params.fromYear}-01-01`);
    }
    if (params.toYear) {
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

    const res = await fetch(url.toString(), { headers: this.buildHeaders() });
    if (!res.ok) {
      throw new Error(`OpenAlex works query failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}
