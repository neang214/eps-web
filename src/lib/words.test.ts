import { describe, expect, it } from "vitest";
import { groupByIndustry, industryOrder, pageCount, searchWords, WORD_PAGE, wordsOf } from "./words";
import type { Card } from "./sm2";
import type { VocabItem } from "../types";

const w = (id: string, tags: string[], korean = id, km = "ក", en = id) => ({ id, industry_tags: tags, korean, km, en }) as unknown as VocabItem;
const vocab = [w("a", ["general"], "안전", "សុវត្ថិភាព", "safety"), w("b", ["metals", "workplace-safety"]), w("c", ["general", "food"])];

describe("words by industry", () => {
  it("lists general first, then the others in the fixed order", () => {
    expect(industryOrder()[0]).toBe("general");
    expect(industryOrder()).toHaveLength(9);
  });
  it("counts a word in every industry it has", () => {
    const g = Object.fromEntries(groupByIndustry(vocab, new Map(), 0).map((x) => [x.tag, x.words.length]));
    expect(g).toEqual({ general: 2, chemicals: 0, metals: 1, food: 1, electronics: 0, "workplace-safety": 1, construction: 0, agriculture: 0, fishery: 0 });
  });
  it("keeps empty industries so they can show 'coming soon'", () => {
    expect(groupByIndustry(vocab, new Map(), 0).find((x) => x.tag === "chemicals")?.words).toEqual([]);
  });
  it("counts reviewed and due words", () => {
    const card = { id: "a", due: 10_000 } as unknown as Card; // not due until time 10000
    const general = groupByIndustry(vocab, new Map([["a", card]]), 5_000).find((x) => x.tag === "general")!;
    expect(general.reviewed).toBe(1);
    expect(general.due).toBe(1); // only "c" (never reviewed) is due
  });
  it("returns everything for 'all'", () => {
    expect(wordsOf(vocab, "all")).toHaveLength(3);
    expect(wordsOf(vocab, "metals").map((x) => x.id)).toEqual(["b"]);
  });
  it("searches Korean, Khmer and English", () => {
    expect(searchWords(vocab, "안").map((x) => x.id)).toEqual(["a"]);
    expect(searchWords(vocab, "SAFE").map((x) => x.id)).toEqual(["a"]);
    expect(searchWords(vocab, "សុវ").map((x) => x.id)).toEqual(["a"]);
    expect(searchWords(vocab, "  ")).toHaveLength(3);
  });
});

describe("word list paging", () => {
  it("has 50 words per page", () => {
    expect(WORD_PAGE).toBe(50);
  });
  it("counts pages, always at least one", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(50)).toBe(1);
    expect(pageCount(51)).toBe(2);
    expect(pageCount(2369)).toBe(48);
  });
});
