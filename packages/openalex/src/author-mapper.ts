export interface OpenAlexAuthorEntityRaw {
  id: string;
  display_name?: string | null;
  works_count?: number;
  cited_by_count?: number;
  ids?: { orcid?: string | null };
  display_name_alternatives?: string[];
  affiliations?: Array<{ institution?: { id?: string } }>;
  last_known_institutions?: Array<{ display_name?: string; type?: string }>;
  topics?: Array<{ display_name?: string; count?: number }>;
}

export interface NormalizedResearcher {
  openalexId: string;
  name: string;
  department: string | null;
  profileUrl: string;
  worksCount: number;
  citedByCount: number;
  keywords: string[];
}

export interface NormalizedAuthor {
  openalexId: string;
  displayName: string;
  orcid: string | null;
}

export function mapOpenAlexAuthorIdentity(
  raw: OpenAlexAuthorEntityRaw,
): NormalizedAuthor {
  return {
    openalexId: raw.id,
    displayName: raw.display_name?.trim() || "Unknown author",
    orcid: raw.ids?.orcid || null,
  };
}

export function mapOpenAlexAuthor(
  raw: OpenAlexAuthorEntityRaw,
): NormalizedResearcher {
  const keywords = (raw.topics || [])
    .map((topic) => topic.display_name?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);

  return {
    openalexId: raw.id,
    name: raw.display_name?.trim() || "Unknown researcher",
    department: keywords[0] || null,
    profileUrl: raw.id,
    worksCount: raw.works_count || 0,
    citedByCount: raw.cited_by_count || 0,
    keywords,
  };
}
