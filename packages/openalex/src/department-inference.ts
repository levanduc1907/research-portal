interface DepartmentDefinition {
  name: string;
  aliases: string[];
}

const DEPARTMENTS: DepartmentDefinition[] = [
  {
    name: "Agricultural & Biological Engineering",
    aliases: ["agricultural engineering", "biological engineering"],
  },
  {
    name: "Electrical & Computer Engineering",
    aliases: ["electrical engineering", "computer engineering"],
  },
  {
    name: "Mechanical Science & Engineering",
    aliases: ["mechanical engineering", "mechanical science"],
  },
  {
    name: "Civil & Environmental Engineering",
    aliases: ["civil engineering", "environmental engineering"],
  },
  {
    name: "Chemical & Biomolecular Engineering",
    aliases: ["chemical engineering", "biomolecular engineering"],
  },
  {
    name: "Industrial & Systems Engineering",
    aliases: ["industrial engineering", "systems engineering"],
  },
  {
    name: "Materials Science & Engineering",
    aliases: ["materials science", "materials engineering"],
  },
  {
    name: "Bioengineering",
    aliases: ["bioengineering", "biomedical engineering"],
  },
  { name: "Aerospace Engineering", aliases: ["aerospace engineering"] },
  { name: "Computer Science", aliases: ["computer science"] },
  { name: "Mathematics", aliases: ["mathematics"] },
  { name: "Statistics", aliases: ["statistics"] },
  { name: "Physics", aliases: ["physics"] },
  { name: "Chemistry", aliases: ["chemistry"] },
  { name: "Biochemistry", aliases: ["biochemistry"] },
  { name: "Microbiology", aliases: ["microbiology"] },
  {
    name: "Molecular & Cellular Biology",
    aliases: ["molecular biology", "cell biology"],
  },
  { name: "Crop Sciences", aliases: ["crop science", "crop sciences"] },
  { name: "Animal Sciences", aliases: ["animal science", "animal sciences"] },
  {
    name: "Food Science & Human Nutrition",
    aliases: ["food science", "human nutrition"],
  },
  { name: "Kinesiology", aliases: ["kinesiology"] },
  { name: "Psychology", aliases: ["psychology"] },
  { name: "Economics", aliases: ["economics"] },
  { name: "Political Science", aliases: ["political science"] },
  { name: "Sociology", aliases: ["sociology"] },
  { name: "Anthropology", aliases: ["anthropology"] },
  { name: "Geography", aliases: ["geography"] },
  { name: "Geology", aliases: ["geology"] },
  { name: "Linguistics", aliases: ["linguistics"] },
  { name: "Education", aliases: ["education"] },
  { name: "Architecture", aliases: ["architecture"] },
  { name: "Medicine", aliases: ["medicine"] },
  { name: "Neuroscience", aliases: ["neuroscience"] },
  { name: "Communication", aliases: ["communication"] },
  { name: "History", aliases: ["history"] },
  { name: "Philosophy", aliases: ["philosophy"] },
];

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

export function inferResearcherDepartment(
  title: string | null | undefined,
  keywords: string[],
): string | null {
  const normalizedTitle = normalize(title || "");

  for (const department of DEPARTMENTS) {
    if (
      department.aliases.some((alias) =>
        normalizedTitle.includes(normalize(alias)),
      )
    ) {
      return department.name;
    }
  }

  const normalizedKeywords = new Set(keywords.map(normalize));
  for (const department of DEPARTMENTS) {
    if (
      department.aliases.some((alias) =>
        normalizedKeywords.has(normalize(alias)),
      )
    ) {
      return department.name;
    }
  }

  return null;
}
