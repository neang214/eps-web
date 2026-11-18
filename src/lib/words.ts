// Groups words by industry tag for the Words screen.
import { INDUSTRY_TAGS, type VocabItem } from "../types";
import { isDue, type Card } from "./sm2";

export interface IndustryGroup {
  tag: string;
  words: VocabItem[];
  due: number; // words due for review now (new words count as due)
  reviewed: number; // words that have been reviewed at least once
}

/** "general" first because it is the biggest group; the others keep the order of INDUSTRY_TAGS. */
export const industryOrder = (): string[] => ["general", ...INDUSTRY_TAGS.filter((t) => t !== "general")];

export function wordsOf(vocab: VocabItem[], tag: string): VocabItem[] {
  return tag === "all" ? vocab : vocab.filter((v) => v.industry_tags.includes(tag));
}

/** Every industry gets a group, even an empty one. A word with several tags is counted in each of them. */
export function groupByIndustry(vocab: VocabItem[], cardById: Map<string, Card>, now: number): IndustryGroup[] {
  return industryOrder().map((tag) => {
    const words = wordsOf(vocab, tag);
    return {
      tag,
      words,
      due: words.filter((w) => isDue(cardById.get(w.id), now)).length,
      reviewed: words.filter((w) => cardById.has(w.id)).length,
    };
  });
}

const norm = (s: string) => s.normalize("NFC").toLowerCase();

/** Search by Korean, Khmer or English. An empty search matches every word. */
export function searchWords(words: VocabItem[], query: string): VocabItem[] {
  const needle = norm(query.trim());
  if (!needle) return words;
  return words.filter((v) => [v.korean, v.km, v.en].some((f) => norm(f).includes(needle)));
}

/** Word lists show this many words per page. */
export const WORD_PAGE = 50;

/** How many pages a list of this size has (at least 1). */
export const pageCount = (total: number): number => Math.max(1, Math.ceil(total / WORD_PAGE));
