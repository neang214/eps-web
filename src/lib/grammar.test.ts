import { describe, expect, it } from "vitest";
import type { GrammarPattern } from "../types";
import { filterGrammar } from "./grammar";

const make = (over: Partial<GrammarPattern>): GrammarPattern => ({
  id: "G-0001",
  pack_id: "grammar-1",
  level: 1,
  category: "ending",
  pattern: "-(으)세요",
  title_km: "សូម",
  title_en: "Please / honorific ending",
  form_km: "x",
  form_en: "x",
  explanation_km: "x",
  explanation_en: "x",
  examples: [
    { ko: "안전모를 쓰세요.", km: "a", en: "a" },
    { ko: "여기에 앉으세요.", km: "b", en: "b" },
    { ko: "어디에 가세요?", km: "c", en: "c" },
  ],
  status: "PUBLISHED",
  is_sample: false,
  ...over,
});

const items = [
  make({ id: "G-0001" }),
  make({ id: "G-0002", level: 1, category: "particle", pattern: "이/가", title_en: "Subject marker", title_km: "តួបញ្ជាក់ប្រធាន", examples: [{ ko: "비가 와요.", km: "a", en: "a" }, { ko: "기계가 고장 났어요.", km: "b", en: "b" }, { ko: "사장님이 오셨어요.", km: "c", en: "c" }] }),
  make({ id: "G-0003", level: 2, category: "connector", pattern: "-(으)면", title_en: "If / when", title_km: "បើ", examples: [{ ko: "비가 오면 쉬어요.", km: "a", en: "a" }, { ko: "모르면 물어보세요.", km: "b", en: "b" }, { ko: "시간이 있으면 가요.", km: "c", en: "c" }] }),
  make({ id: "G-0004", level: 3, category: "expression", pattern: "-(으)ㄹ 뻔하다", title_en: "Almost did", title_km: "ស្ទើរតែ", examples: [{ ko: "넘어질 뻔했어요.", km: "a", en: "a" }, { ko: "늦을 뻔했어요.", km: "b", en: "b" }, { ko: "잃어버릴 뻔했어요.", km: "c", en: "c" }] }),
];
const all = { query: "", level: "all" as const, category: "all" as const };
const ids = (r: GrammarPattern[]) => r.map((g) => g.id);

describe("filterGrammar", () => {
  it("returns everything with no filter, in the same order", () => {
    expect(ids(filterGrammar(items, all))).toEqual(["G-0001", "G-0002", "G-0003", "G-0004"]);
  });

  it("filters by level", () => {
    expect(ids(filterGrammar(items, { ...all, level: 1 }))).toEqual(["G-0001", "G-0002"]);
    expect(ids(filterGrammar(items, { ...all, level: 3 }))).toEqual(["G-0004"]);
  });

  it("filters by type", () => {
    expect(ids(filterGrammar(items, { ...all, category: "particle" }))).toEqual(["G-0002"]);
  });

  it("combines level, type and search", () => {
    expect(ids(filterGrammar(items, { query: "세요", level: 1, category: "ending" }))).toEqual(["G-0001"]);
    expect(filterGrammar(items, { query: "세요", level: 2, category: "ending" })).toEqual([]);
  });

  it("finds a pattern without typing its brackets or dash", () => {
    expect(ids(filterGrammar(items, { ...all, query: "으세요" }))).toEqual(["G-0001"]);
    expect(ids(filterGrammar(items, { ...all, query: "(으)면" }))).toEqual(["G-0003"]);
    expect(ids(filterGrammar(items, { ...all, query: "뻔하다" }))).toEqual(["G-0004"]);
  });

  it("searches English and Khmer titles, ignoring case", () => {
    expect(ids(filterGrammar(items, { ...all, query: "SUBJECT" }))).toEqual(["G-0002"]);
    expect(ids(filterGrammar(items, { ...all, query: "បើ" }))).toEqual(["G-0003"]);
  });

  it("searches the Korean example sentences", () => {
    expect(ids(filterGrammar(items, { ...all, query: "고장" }))).toEqual(["G-0002"]);
  });

  it("returns an empty list when nothing matches, and ignores spaces around the search", () => {
    expect(filterGrammar(items, { ...all, query: "zzz" })).toEqual([]);
    expect(ids(filterGrammar(items, { ...all, query: "  when  " }))).toEqual(["G-0003"]);
  });

  it("does not match everything when the search is only punctuation", () => {
    expect(filterGrammar(items, { ...all, query: "()" })).toEqual([]);
  });
});
