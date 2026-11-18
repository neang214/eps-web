import { describe, expect, it } from "vitest";
import { listPapers, paperPicks, isPaperPack } from "./papers";
import type { Question } from "../types";

const q = (id: string, pack_id: string, section: "READING" | "LISTENING") => ({ id, pack_id, section }) as unknown as Question;
const rules = { questionsPerSection: { READING: 2, LISTENING: 2 } };
const qs = [
  q("R-0013", "mock-1", "READING"), q("R-0011", "mock-1", "READING"), q("R-0012", "mock-1", "READING"),
  q("L-0012", "mock-1", "LISTENING"), q("L-0011", "mock-1", "LISTENING"),
  q("R-0001", "sample-pack", "READING"),
];

describe("fixed papers", () => {
  it("only mock-* packs are papers", () => {
    expect(isPaperPack("mock-1")).toBe(true);
    expect(isPaperPack("sample-pack")).toBe(false);
    expect(listPapers(qs, rules).map((p) => p.packId)).toEqual(["mock-1"]);
  });
  it("caps the count by the rules", () => {
    expect(listPapers(qs, rules)[0].counts).toEqual({ READING: 2, LISTENING: 2 });
  });
  it("serves questions in ID order, never shuffled", () => {
    expect(paperPicks(qs, "mock-1", ["READING", "LISTENING"], rules)).toEqual({
      READING: ["R-0011", "R-0012"],
      LISTENING: ["L-0011", "L-0012"],
    });
  });
  it("leaves out sections that were not asked for", () => {
    expect(paperPicks(qs, "mock-1", ["LISTENING"], rules).READING).toEqual([]);
  });
});
