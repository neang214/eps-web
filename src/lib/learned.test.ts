import { describe, expect, it } from "vitest";
import { cleanLearned, cleanResults, emptyLearned, isLearned, learnedCount, toggled, withResult } from "./learned";

describe("learned marks", () => {
  it("marks and unmarks without changing the old object", () => {
    const a = emptyLearned();
    const b = toggled(a, "hangul", "H-0001");
    expect(a.hangul).toEqual([]);
    expect(isLearned(b, "hangul", "H-0001")).toBe(true);
    expect(isLearned(b, "numbers", "H-0001")).toBe(false);
    expect(toggled(b, "hangul", "H-0001").hangul).toEqual([]);
  });
  it("counts only ids that still exist", () => {
    const l = { hangul: ["H-0001", "H-0002", "H-OLD"], numbers: [] };
    expect(learnedCount(l, "hangul", ["H-0001", "H-0002", "H-0003"])).toBe(2);
  });
  it("cleans anything read from storage or a backup", () => {
    expect(cleanLearned(null)).toEqual(emptyLearned());
    expect(cleanLearned({ hangul: ["a", 3, "a"], numbers: "x" })).toEqual({ hangul: ["a"], numbers: [] });
  });
});

describe("grammar quiz results", () => {
  it("keeps the best score", () => {
    let r = withResult({}, "G-0001", 3, 3);
    r = withResult(r, "G-0001", 1, 3);
    expect(r["G-0001"]).toEqual({ correct: 1, total: 3, best: 3 });
  });
  it("drops broken records", () => {
    expect(cleanResults({ a: { correct: 1, total: 3, best: 2 }, b: { correct: "x" }, c: 5 })).toEqual({ a: { correct: 1, total: 3, best: 2 } });
    expect(cleanResults([])).toEqual({});
  });
});
