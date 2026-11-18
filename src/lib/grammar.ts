import type { GrammarCategory, GrammarPattern } from "../types";

export type LevelFilter = "all" | 1 | 2 | 3;
export type CategoryFilter = "all" | GrammarCategory;

export interface GrammarFilter {
  query: string;
  level: LevelFilter;
  category: CategoryFilter;
}

const norm = (s: string) => s.normalize("NFC").toLowerCase();
/** Drops the punctuation used in pattern names, so "으세요" finds "-(으)세요". */
const bare = (s: string) => norm(s).replace(/[()\-–·~/+\s]/g, "");

/** Filters grammar patterns by level, type and a search text (Korean pattern, Khmer or English title, Korean examples). */
export function filterGrammar(items: GrammarPattern[], { query, level, category }: GrammarFilter): GrammarPattern[] {
  const needle = norm(query.trim());
  const bareNeedle = bare(query);
  return items.filter((g) => {
    if (level !== "all" && g.level !== level) return false;
    if (category !== "all" && g.category !== category) return false;
    if (!needle) return true;
    if ([g.title_km, g.title_en, ...g.examples.map((e) => e.ko)].some((f) => norm(f).includes(needle))) return true;
    return bareNeedle !== "" && bare(g.pattern).includes(bareNeedle);
  });
}
