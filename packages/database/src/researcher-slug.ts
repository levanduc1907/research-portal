const CHARACTER_REPLACEMENTS: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  ø: "o",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
};

export function slugifyResearcherName(name: string): string {
  const transliterated = name
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(
      /[\u00df\u00e6\u00f8\u0142\u0111\u00f0\u00fe]/g,
      (character) => CHARACTER_REPLACEMENTS[character] || character,
    )
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    transliterated
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "researcher"
  );
}

export function researcherSlugSuffix(email: string | null): string | null {
  if (!email) return null;
  const localPart = email.split("@")[0]?.trim();
  return localPart ? slugifyResearcherName(localPart) : null;
}
