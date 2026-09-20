import { reconstructAbstract } from "./abstract-reconstructor";

export interface OpenAlexAuthorRaw {
  author: {
    id: string;
    display_name: string;
    orcid?: string;
  };
  author_position?: string;
  is_corresponding?: boolean;
}

export interface OpenAlexTopicRaw {
  id: string;
  display_name: string;
  score?: number;
  subfield?: { id: string; display_name: string };
  field?: { id: string; display_name: string };
  domain?: { id: string; display_name: string };
}

export interface OpenAlexWorkRaw {
  id: string;
  doi?: string | null;
  title?: string | null;
  publication_date?: string;
  publication_year?: number;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: {
    landing_page_url?: string;
    pdf_url?: string;
  } | null;
  primary_topic?: OpenAlexTopicRaw | null;
  topics?: OpenAlexTopicRaw[];
  authorships?: OpenAlexAuthorRaw[];
}

export interface NormalizedWork {
  paper: {
    openalexId: string;
    doi: string | null;
    title: string;
    publicationDate: Date;
    publicationYear: number;
    citedByCount: number;
    abstract: string | null;
    landingPageUrl: string | null;
    pdfUrl: string | null;
  };
  authors: {
    openalexId: string;
    displayName: string;
    orcid: string | null;
    position: string;
    isCorresponding: boolean;
  }[];
  topics: {
    openalexId: string;
    displayName: string;
    score: number;
    isPrimary: boolean;
    subfieldId: string | null;
    subfieldName: string | null;
    fieldId: string | null;
    fieldName: string | null;
    domainId: string | null;
    domainName: string | null;
  }[];
}

export function mapOpenAlexWork(raw: OpenAlexWorkRaw): NormalizedWork {
  const openalexId = raw.id;
  const title = raw.title || "Untitled Research Publication";
  const publicationDate = raw.publication_date
    ? new Date(raw.publication_date)
    : new Date(`${raw.publication_year || 2025}-01-01`);
  const publicationYear = raw.publication_year || publicationDate.getFullYear();
  const citedByCount = raw.cited_by_count || 0;
  const abstract = reconstructAbstract(raw.abstract_inverted_index);

  const landingPageUrl = raw.primary_location?.landing_page_url || raw.doi || null;
  const pdfUrl = raw.primary_location?.pdf_url || null;

  const authors = (raw.authorships || []).map((a) => ({
    openalexId: a.author.id,
    displayName: a.author.display_name || "Unknown Author",
    orcid: a.author.orcid || null,
    position: a.author_position || "middle",
    isCorresponding: Boolean(a.is_corresponding),
  }));

  const primaryTopicId = raw.primary_topic?.id;
  const topicsMap = new Map<string, NormalizedWork["topics"][number]>();

  if (raw.primary_topic) {
    topicsMap.set(raw.primary_topic.id, {
      openalexId: raw.primary_topic.id,
      displayName: raw.primary_topic.display_name,
      score: raw.primary_topic.score || 1.0,
      isPrimary: true,
      subfieldId: raw.primary_topic.subfield?.id || null,
      subfieldName: raw.primary_topic.subfield?.display_name || null,
      fieldId: raw.primary_topic.field?.id || null,
      fieldName: raw.primary_topic.field?.display_name || null,
      domainId: raw.primary_topic.domain?.id || null,
      domainName: raw.primary_topic.domain?.display_name || null,
    });
  }

  for (const t of raw.topics || []) {
    if (!topicsMap.has(t.id)) {
      topicsMap.set(t.id, {
        openalexId: t.id,
        displayName: t.display_name,
        score: t.score || 0.5,
        isPrimary: t.id === primaryTopicId,
        subfieldId: t.subfield?.id || null,
        subfieldName: t.subfield?.display_name || null,
        fieldId: t.field?.id || null,
        fieldName: t.field?.display_name || null,
        domainId: t.domain?.id || null,
        domainName: t.domain?.display_name || null,
      });
    }
  }

  return {
    paper: {
      openalexId,
      doi: raw.doi || null,
      title,
      publicationDate,
      publicationYear,
      citedByCount,
      abstract,
      landingPageUrl,
      pdfUrl,
    },
    authors,
    topics: Array.from(topicsMap.values()),
  };
}
