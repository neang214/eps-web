import { describe, expect, it } from "vitest";
import { mixedQuiz, patternQuiz } from "./grammarQuiz";
import type { GrammarPattern } from "../types";

const g = (id: string, category: string): GrammarPattern =>
  ({
    id,
    category,
    pattern: id,
    examples: [0, 1, 2].map((i) => ({ ko: `${id} 문장 ${i}`, km: `${id} ខ្មែរ ${i}`, en: `${id} english ${i}` })),
    level: 1,
  }) as unknown as GrammarPattern;

const all = ["a", "b", "c", "d", "e", "f"].map((x, i) => g(`G-${x}`, i < 3 ? "particle" : "ending"));

describe("grammar quiz", () => {
  it("makes one question per example with 4 different options and one right answer", () => {
    const qs = patternQuiz(all[0], all, 7);
    expect(qs).toHaveLength(3);
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.en)).size).toBe(4);
      const right = q.options[q.correct];
      expect(right.en).toContain("G-a");
      expect(q.options.filter((o) => o.en.includes("G-a"))).toHaveLength(1);
    }
  });
  it("is the same for the same seed and different for another seed", () => {
    expect(patternQuiz(all[1], all, 5)).toEqual(patternQuiz(all[1], all, 5));
    expect(JSON.stringify(patternQuiz(all[1], all, 5))).not.toBe(JSON.stringify(patternQuiz(all[1], all, 99)));
  });
  it("prefers wrong choices from the same category", () => {
    const q = patternQuiz(all[0], all, 3)[0];
    const wrong = q.options.filter((_, i) => i !== q.correct);
    expect(wrong.every((o) => /G-(b|c)/.test(o.en))).toBe(true);
  });
  it("returns nothing when there are not enough other sentences", () => {
    expect(patternQuiz(all[0], [all[0]], 1)).toEqual([]);
  });
  it("mixed quiz uses different patterns and can be limited to a category", () => {
    const q = mixedQuiz(all, 4, 11);
    expect(q).toHaveLength(4);
    expect(new Set(q.map((x) => x.patternId)).size).toBe(4);
    expect(mixedQuiz(all, 10, 11, "ending").every((x) => ["G-d", "G-e", "G-f"].includes(x.patternId))).toBe(true);
  });
});
