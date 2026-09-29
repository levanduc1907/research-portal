export interface ResearchTopicAliasGroup {
  canonical: string;
  aliases: readonly string[];
}

export const RESEARCH_TOPIC_ALIAS_GROUPS: readonly ResearchTopicAliasGroup[] = [
  {
    canonical: "Explainable AI",
    aliases: [
      "XAI",
      "explainable artificial intelligence",
      "interpretable AI",
      "interpretable machine learning",
      "model interpretability",
    ],
  },
  {
    canonical: "Artificial Intelligence",
    aliases: ["AI", "machine intelligence", "trí tuệ nhân tạo"],
  },
  {
    canonical: "Large Language Models",
    aliases: [
      "LLM",
      "LLMs",
      "large language model",
      "foundation language model",
      "language foundation model",
    ],
  },
  {
    canonical: "Generative AI",
    aliases: [
      "GenAI",
      "generative artificial intelligence",
      "foundation models",
    ],
  },
  {
    canonical: "Natural Language Processing",
    aliases: ["NLP", "computational linguistics", "language processing"],
  },
  {
    canonical: "Machine Learning",
    aliases: ["ML", "statistical learning", "học máy"],
  },
  {
    canonical: "Deep Learning",
    aliases: ["DL", "neural networks", "neural network", "học sâu"],
  },
  {
    canonical: "Computer Vision",
    aliases: [
      "CV",
      "visual recognition",
      "image recognition",
      "machine vision",
    ],
  },
  {
    canonical: "Human-Computer Interaction",
    aliases: ["HCI", "human computer interaction", "user experience research"],
  },
  {
    canonical: "Extended Reality",
    aliases: ["XR", "mixed reality", "immersive technology"],
  },
  { canonical: "Virtual Reality", aliases: ["VR", "virtual environments"] },
  { canonical: "Augmented Reality", aliases: ["AR", "augmented environments"] },
  {
    canonical: "Information Retrieval",
    aliases: ["IR", "search engines", "document retrieval", "knowledge search"],
  },
  {
    canonical: "Data Mining",
    aliases: ["knowledge discovery", "pattern mining", "web mining"],
  },
  {
    canonical: "Data Management",
    aliases: ["databases", "database systems", "DBMS", "database management"],
  },
  {
    canonical: "Knowledge Graphs",
    aliases: ["KG", "knowledge graph", "semantic networks", "linked data"],
  },
  {
    canonical: "Robotics",
    aliases: ["robots", "robot learning", "autonomous systems"],
  },
  {
    canonical: "Cybersecurity",
    aliases: ["computer security", "information security", "cyber security"],
  },
  {
    canonical: "Privacy",
    aliases: ["data privacy", "privacy preserving", "privacy-preserving"],
  },
  {
    canonical: "Distributed Systems",
    aliases: ["distributed computing", "cloud systems", "cloud computing"],
  },
  {
    canonical: "High Performance Computing",
    aliases: ["HPC", "supercomputing", "parallel computing"],
  },
  {
    canonical: "Internet of Things",
    aliases: ["IoT", "connected devices", "sensor networks"],
  },
  {
    canonical: "Quantum Computing",
    aliases: [
      "quantum information",
      "quantum computation",
      "máy tính lượng tử",
    ],
  },
  {
    canonical: "Quantum Physics",
    aliases: ["quantum mechanics", "quantum science", "vật lý lượng tử"],
  },
  {
    canonical: "Climate Change",
    aliases: ["climate science", "global warming", "biến đổi khí hậu"],
  },
  {
    canonical: "Sustainability",
    aliases: [
      "sustainable systems",
      "sustainable development",
      "green technology",
    ],
  },
  {
    canonical: "Bioinformatics",
    aliases: ["computational biology", "biological data science"],
  },
  {
    canonical: "Genomics",
    aliases: ["genome science", "genome analysis", "genetics and genomics"],
  },
  {
    canonical: "Neuroscience",
    aliases: ["brain science", "cognitive neuroscience", "neural science"],
  },
  {
    canonical: "Biomedical Engineering",
    aliases: ["BME", "bioengineering", "medical engineering"],
  },
  {
    canonical: "Materials Science",
    aliases: [
      "materials engineering",
      "advanced materials",
      "material science",
    ],
  },
  {
    canonical: "Agricultural Technology",
    aliases: ["AgTech", "precision agriculture", "digital agriculture"],
  },
  {
    canonical: "Geographic Information Systems",
    aliases: ["GIS", "geospatial analysis", "spatial information systems"],
  },
] as const;

export function normalizeResearchSearchTerm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function containsTerm(query: string, term: string): boolean {
  return (
    query === term ||
    query.includes(` ${term} `) ||
    query.startsWith(`${term} `) ||
    query.endsWith(` ${term}`)
  );
}

export function findResearchTopicAliasGroups(
  value: string,
  allowPartialMatch = false,
): ResearchTopicAliasGroup[] {
  const normalizedQuery = normalizeResearchSearchTerm(value);
  if (!normalizedQuery) return [...RESEARCH_TOPIC_ALIAS_GROUPS];

  return RESEARCH_TOPIC_ALIAS_GROUPS.filter((group) =>
    [group.canonical, ...group.aliases].some((term) => {
      const normalizedTerm = normalizeResearchSearchTerm(term);
      return (
        normalizedQuery === normalizedTerm ||
        (allowPartialMatch &&
          (containsTerm(normalizedQuery, normalizedTerm) ||
            normalizedTerm.includes(normalizedQuery)))
      );
    }),
  );
}

export function expandResearchTopicTerms(value: string): string[] {
  const query = value.trim();
  if (!query) return [];
  const expanded = new Set<string>([query]);
  const matchingGroups = findResearchTopicAliasGroups(query);

  // Only an exact canonical topic or exact alias expands. A specialist phrase
  // such as "explainable AI" must never inherit every generic "AI" alias.
  for (const group of matchingGroups) {
    expanded.add(group.canonical);
    group.aliases.forEach((alias) => expanded.add(alias));
  }

  const uniqueTerms = new Map<string, string>();
  for (const term of expanded) {
    const normalized = normalizeResearchSearchTerm(term);
    if (normalized && !uniqueTerms.has(normalized)) {
      uniqueTerms.set(normalized, term);
    }
  }
  return [...uniqueTerms.values()].slice(0, 20);
}

export function findBestResearchTopicMatch(text: string): string | null {
  const normalizedQuery = normalizeResearchSearchTerm(text);
  if (!normalizedQuery) return null;

  let bestCanonical: string | null = null;
  let bestMatchLen = 0;

  for (const group of RESEARCH_TOPIC_ALIAS_GROUPS) {
    for (const term of [group.canonical, ...group.aliases]) {
      const normalizedTerm = normalizeResearchSearchTerm(term);
      if (normalizedTerm && containsTerm(normalizedQuery, normalizedTerm)) {
        if (normalizedTerm.length > bestMatchLen) {
          bestMatchLen = normalizedTerm.length;
          bestCanonical = group.canonical;
        }
      }
    }
  }

  return bestCanonical;
}
