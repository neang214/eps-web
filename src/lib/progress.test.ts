import { afterEach, describe, expect, it } from "vitest";
import { EXPORT_VERSION, parseProgress, type ProgressFile } from "./progress";
import { wifiBlocked } from "./packs";

const valid = (): ProgressFile => ({
  app: "eps-study",
  version: EXPORT_VERSION,
  exportedAt: "2026-10-15T00:00:00.000Z",
  installId: "11111111-1111-4111-8111-111111111111",
  settings: null,
  cards: [{ id: "V-0001", ease: 2.5, interval: 1, reps: 1, due: 1, lapses: 0, lastReviewed: 1 }],
  attempts: [{ id: "a1", total: 75 }],
  mistakes: [{ questionId: "R-0001", streak: 1, addedAt: 1, lastAt: 1 }],
  flags: [{ questionId: "L-0001", at: 1 }],
  lessons: [{ unitId: "U-01", completedAt: 1, correct: 5, total: 5 }],
});

describe("progress file", () => {
  it("accepts a file that was exported by the app", () => {
    expect(parseProgress(JSON.stringify(valid()))).not.toBeNull();
  });

  it("accepts practice sets, and still accepts files from older versions without them", () => {
    const withSets = { ...valid(), practiceSets: { "READING-1": { position: 3, correct: 2, best: null } } };
    expect(parseProgress(JSON.stringify(withSets))).not.toBeNull();
    expect(parseProgress(JSON.stringify(valid()))).not.toBeNull();
    expect(parseProgress(JSON.stringify({ ...valid(), practiceSets: [1] }))).toBeNull();
  });

  it("accepts learned marks and grammar quiz scores, and rejects broken ones", () => {
    const extra = { ...valid(), learned: { hangul: ["H-0001"], numbers: [] }, grammarQuiz: { "G-0001": { correct: 2, total: 3, best: 3 } } };
    expect(parseProgress(JSON.stringify(extra))).not.toBeNull();
    expect(parseProgress(JSON.stringify({ ...valid(), learned: [] }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...valid(), grammarQuiz: "x" }))).toBeNull();
  });

  it("rejects text that is not JSON", () => {
    expect(parseProgress("not json")).toBeNull();
    expect(parseProgress("[]")).toBeNull();
    expect(parseProgress("null")).toBeNull();
  });

  it("rejects another app's file and newer file versions", () => {
    expect(parseProgress(JSON.stringify({ ...valid(), app: "other" }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...valid(), version: EXPORT_VERSION + 1 }))).toBeNull();
  });

  it("rejects a file with a missing list or a record without its stable ID", () => {
    const missing: Record<string, unknown> = { ...valid() };
    delete missing.mistakes;
    expect(parseProgress(JSON.stringify(missing))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...valid(), cards: [{ ease: 2.5 }] }))).toBeNull();
    expect(parseProgress(JSON.stringify({ ...valid(), lessons: [{ unitId: 5 }] }))).toBeNull();
  });
});

describe("download over Wi-Fi only", () => {
  const nav = globalThis.navigator as unknown as { connection?: unknown };
  afterEach(() => {
    delete nav.connection;
  });
  const setType = (type: string | undefined) =>
    Object.defineProperty(nav, "connection", { value: type === undefined ? undefined : { type }, configurable: true });

  it("never blocks when the setting is off", () => {
    setType("cellular");
    expect(wifiBlocked(false)).toBe(false);
  });

  it("blocks on mobile data, allows Wi-Fi and Ethernet", () => {
    setType("cellular");
    expect(wifiBlocked(true)).toBe(true);
    setType("wifi");
    expect(wifiBlocked(true)).toBe(false);
    setType("ethernet");
    expect(wifiBlocked(true)).toBe(false);
  });

  it("does not block when the browser cannot tell the connection type", () => {
    setType(undefined);
    expect(wifiBlocked(true)).toBe(false);
  });
});
