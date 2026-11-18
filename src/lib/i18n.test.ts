import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "../../locales/en.json";
import km from "../../locales/km.json";
import { INDUSTRY_TAGS } from "../types";
import { makeT } from "./i18n";

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === "string") out[prefix + k] = v;
    else Object.assign(out, flatten(v, `${prefix}${k}.`));
  }
  return out;
}

const EN = flatten(en as Tree);
const KM = flatten(km as Tree);
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("locale files", () => {
  it("English and Khmer have exactly the same keys", () => {
    expect(Object.keys(KM).sort()).toEqual(Object.keys(EN).sort());
  });

  it("no text is empty", () => {
    for (const [k, v] of [...Object.entries(EN), ...Object.entries(KM)]) expect(v.trim(), k).not.toBe("");
  });

  it("both languages use the same {placeholders}", () => {
    for (const k of Object.keys(EN)) expect(placeholders(KM[k]), k).toEqual(placeholders(EN[k]));
  });

  it("every literal t(\"key\") used in the code exists", () => {
    const missing: string[] = [];
    for (const file of sourceFiles(srcDir)) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/\bt\(\s*"([A-Za-z0-9_.-]+)"\s*[,)]/g)) {
        if (!(m[1] in EN)) missing.push(`${path.relative(srcDir, file)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("keys built at run time all resolve", () => {
    for (const tag of INDUSTRY_TAGS) expect(EN[`tags.${tag}`], tag).toBeTruthy();
    for (const type of ["WRONG_ANSWER", "TRANSLATION_PROBLEM", "AUDIO_PROBLEM", "OTHER"]) expect(EN[`report.type_${type}`], type).toBeTruthy();
    for (const step of [0, 1, 2]) expect(EN[`settings.font${step}`], String(step)).toBeTruthy();
    for (const g of ["again", "hard", "good", "easy"]) expect(EN[`vocab.${g}`], g).toBeTruthy();
    for (const l of ["km", "en"]) expect(EN[`languages.${l}`], l).toBeTruthy();
    for (const c of ["particle", "ending", "connector", "expression", "modifier"]) expect(EN[`grammar.cat.${c}`], c).toBeTruthy();
    for (const g of ["consonant", "double_consonant", "vowel", "compound_vowel", "batchim"]) {
      expect(EN[`hangul.group.${g}`], g).toBeTruthy();
      expect(EN[`hangul.groupHelp.${g}`], g).toBeTruthy();
    }
    for (const g of ["sino", "native", "counter", "usage"]) {
      expect(EN[`numbers.group.${g}`], g).toBeTruthy();
      expect(EN[`numbers.groupHelp.${g}`], g).toBeTruthy();
    }
  });

  it("run-time key families in the code are the ones checked above", () => {
    const families = new Set<string>();
    for (const file of sourceFiles(srcDir)) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/\bt\(\s*`([A-Za-z0-9_.-]+)\$\{/g)) families.add(m[1]);
      for (const m of text.matchAll(/\bt\(\s*"([A-Za-z0-9_.-]+)"\s*\+/g)) families.add(m[1]);
      for (const m of text.matchAll(/\]\(\s*"([A-Za-z0-9_.-]+)"\s*\+/g)) families.add(m[1]);
    }
    expect([...families].sort()).toEqual([
      "grammar.cat.", "hangul.group.", "hangul.groupHelp.", "languages.", "numbers.group.", "numbers.groupHelp.",
      "report.type_", "settings.font", "tags.", "vocab.",
    ]);
  });

  it("falls back to English, then to the key, when a translation is missing", () => {
    expect(makeT("km")("does.not.exist")).toBe("does.not.exist");
    expect(makeT("en")("results.outOf", { s: 75, m: 100 })).toBe("75 / 100");
  });
});

/** Letters (Latin, Khmer or Korean) written directly between JSX tags on one line, for example <p>Hello</p>. */
function literalJsxText(line: string): string[] {
  // The (?<![=-]) part skips arrow functions (=>) and TypeScript arrows (->).
  return [...line.matchAll(/(?<![=-])>([^<>{}=]*[A-Za-zក-៿가-힯][^<>{}=]*)</g)].map((m) => m[1].trim()).filter(Boolean);
}

describe("no hard-coded UI text", () => {
  it("the check itself catches English, Khmer and Korean text, and ignores code", () => {
    expect(literalJsxText("<p>Hello world</p>")).toEqual(["Hello world"]);
    expect(literalJsxText("<h1>សួស្តី</h1>")).toEqual(["សួស្តី"]);
    expect(literalJsxText("<b>안녕</b>")).toEqual(["안녕"]);
    expect(literalJsxText("<p>{t('home.title')}</p>")).toEqual([]);
    expect(literalJsxText("const [s, set] = useState<Set<number>>(() => new Set());")).toEqual([]);
    expect(literalJsxText("rules.some((s) => available[s] < rules.limit[s]);")).toEqual([]);
  });

  it("pages and components contain no literal words between tags", () => {
    const found: string[] = [];
    const files = [...sourceFiles(path.join(srcDir, "pages")), ...sourceFiles(path.join(srcDir, "components")), path.join(srcDir, "App.tsx")];
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      fs.readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const text of literalJsxText(line)) found.push(`${path.relative(srcDir, file)}:${i + 1}: ${text}`);
        });
    }
    expect(found).toEqual([]);
  });
});
