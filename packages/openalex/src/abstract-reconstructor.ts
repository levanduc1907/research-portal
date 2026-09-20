/**
 * OpenAlex stores abstracts as an inverted index:
 * { "Word": [0, 15], "another": [1], ... }
 * This reconstructs the original linear abstract string.
 */
export function reconstructAbstract(
  invertedIndex?: Record<string, number[]> | null
): string | null {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return null;
  }

  const entries = Object.entries(invertedIndex);
  if (entries.length === 0) {
    return null;
  }

  let maxPosition = -1;
  for (const [, positions] of entries) {
    for (const pos of positions) {
      if (pos > maxPosition) {
        maxPosition = pos;
      }
    }
  }

  if (maxPosition < 0) {
    return null;
  }

  const words: string[] = new Array(maxPosition + 1).fill("");
  for (const [word, positions] of entries) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }

  return words.join(" ").replace(/\s+/g, " ").trim() || null;
}
