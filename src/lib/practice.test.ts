import { describe, expect, it } from "vitest";
import { SET_SIZE, afterAnswer, buildSets, restarted, setKey, setState } from "./practice";
import type { Question } from "../types";

const q = (id: string, section: "READING" | "LISTENING") => ({ id, section }) as Question;
const many = (p: string, section: "READING" | "LISTENING", n: number) =>
  Array.from({ length: n }, (_, i) => q(`${p}-${String(i + 1).padStart(4, "0")}`, section));

describe("practice sets", () => {
  it("cuts a section into sets of 25 in ID order", () => {
    const qs = [...many("L", "LISTENING", 10), ...many("R", "READING", 60)].reverse();
    const sets = buildSets(qs, "READING");
    expect(sets.map((s) => s.ids.length)).toEqual([25, 25, 10]);
    expect(sets[0].ids[0]).toBe("R-0001");
    expect(sets[2].ids.at(-1)).toBe("R-0060");
    expect(buildSets(qs, "LISTENING")).toHaveLength(1);
  });

  it("keeps old sets the same when new questions are added at the end", () => {
    const before = buildSets(many("R", "READING", 50), "READING");
    const after = buildSets(many("R", "READING", 80), "READING");
    expect(after[0].ids).toEqual(before[0].ids);
    expect(after[1].ids).toEqual(before[1].ids);
    expect(after).toHaveLength(4);
  });

  it("sorts IDs by number, so R-10000 comes after R-9999", () => {
    const sets = buildSets([q("R-10000", "READING"), q("R-9999", "READING")], "READING");
    expect(sets[0].ids).toEqual(["R-9999", "R-10000"]);
  });

  it("an empty section has no sets", () => {
    expect(buildSets(many("R", "READING", 5), "LISTENING")).toEqual([]);
  });

  it("tracks new, in progress and done", () => {
    expect(setState(undefined, SET_SIZE)).toBe("new");
    expect(setState({ position: 0, correct: 0, best: 20 }, SET_SIZE)).toBe("new");
    expect(setState({ position: 7, correct: 5, best: null }, SET_SIZE)).toBe("progress");
    expect(setState({ position: SET_SIZE, correct: 20, best: 20 }, SET_SIZE)).toBe("done");
  });

  it("saves the place after each answer and the best score on finishing", () => {
    let p = afterAnswer(undefined, 0, 1, 3);
    expect(p).toEqual({ position: 1, correct: 1, best: null });
    p = afterAnswer(p, 2, 2, 3);
    expect(p).toEqual({ position: 3, correct: 2, best: 2 });
    p = afterAnswer(restarted(p), 2, 1, 3); // a worse second run keeps the best
    expect(p.best).toBe(2);
    expect(restarted(p)).toEqual({ position: 0, correct: 0, best: 2 });
  });

  it("makes a stable key", () => {
    expect(setKey("READING", 3)).toBe("READING-3");
  });
});
