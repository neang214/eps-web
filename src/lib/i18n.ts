import en from "../../locales/en.json";
import km from "../../locales/km.json";
import type { Lang } from "../types";

type Tree = { [k: string]: string | Tree };
const LOCALES: Record<Lang, Tree> = { en: en as Tree, km: km as Tree };

function lookup(tree: Tree, key: string): string | undefined {
  let cur: string | Tree | undefined = tree;
  for (const part of key.split(".")) {
    if (cur == null || typeof cur === "string") return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(lang: Lang): TFn {
  return (key, vars) => {
    let s = lookup(LOCALES[lang], key) ?? lookup(LOCALES.en, key) ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
}

/** Picks the Khmer or English variant of a content field, e.g. pick(q, "explanation", lang). */
export function pick<T extends object>(obj: T, base: string, lang: Lang): string {
  const rec = obj as Record<string, unknown>;
  const v = rec[`${base}_${lang}`] ?? rec[lang];
  return typeof v === "string" ? v : "";
}

export const OTHER_LANG: Record<Lang, Lang> = { km: "en", en: "km" };
export const LOCALE_TREES = LOCALES;
