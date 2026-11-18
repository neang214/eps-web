// "I know this" marks for Hangul letters and number items, and quiz results for grammar patterns.
// Both live in the browser only (kv store) and travel in the backup file.
import { useCallback, useEffect, useState } from "react";
import { kvGet, kvSet } from "./db";

export type LearnedKind = "hangul" | "numbers";
export interface Learned {
  hangul: string[];
  numbers: string[];
}
export const emptyLearned = (): Learned => ({ hangul: [], numbers: [] });

/** Marks or unmarks one item. Returns a new object. */
export function toggled(l: Learned, kind: LearnedKind, id: string): Learned {
  const has = l[kind].includes(id);
  return { ...l, [kind]: has ? l[kind].filter((x) => x !== id) : [...l[kind], id] };
}

/** How many of these ids are marked. Ids that no longer exist in the content are not counted. */
export const learnedCount = (l: Learned, kind: LearnedKind, ids: string[]): number => {
  const set = new Set(l[kind]);
  return ids.filter((id) => set.has(id)).length;
};

export const isLearned = (l: Learned, kind: LearnedKind, id: string): boolean => l[kind].includes(id);

/** Accepts anything read from storage or a backup and returns a safe Learned object. */
export function cleanLearned(v: unknown): Learned {
  const out = emptyLearned();
  if (typeof v !== "object" || v === null) return out;
  const r = v as Record<string, unknown>;
  for (const k of ["hangul", "numbers"] as const) {
    if (Array.isArray(r[k])) out[k] = [...new Set(r[k].filter((x): x is string => typeof x === "string"))];
  }
  return out;
}

export function useLearned() {
  const [learned, setLearned] = useState<Learned>(emptyLearned());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void kvGet<unknown>("learned").then((v) => {
      if (!alive) return;
      setLearned(cleanLearned(v));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  const toggle = useCallback(
    (kind: LearnedKind, id: string) => {
      setLearned((cur) => {
        const next = toggled(cur, kind, id);
        void kvSet("learned", next);
        return next;
      });
    },
    [],
  );
  return { learned, loaded, toggle };
}

// ---- grammar quiz results ----
export interface QuizResult {
  correct: number;
  total: number;
  best: number; // best number of correct answers in one run
}
export type QuizResults = Record<string, QuizResult>;

/** Adds one finished run for a pattern. The best score is kept. */
export function withResult(all: QuizResults, patternId: string, correct: number, total: number): QuizResults {
  const prev = all[patternId];
  return { ...all, [patternId]: { correct, total, best: Math.max(prev?.best ?? 0, correct) } };
}

export function cleanResults(v: unknown): QuizResults {
  const out: QuizResults = {};
  if (typeof v !== "object" || v === null || Array.isArray(v)) return out;
  for (const [id, r] of Object.entries(v as Record<string, unknown>)) {
    if (typeof r !== "object" || r === null) continue;
    const { correct, total, best } = r as Record<string, unknown>;
    if (typeof correct === "number" && typeof total === "number" && typeof best === "number") out[id] = { correct, total, best };
  }
  return out;
}

export function useQuizResults() {
  const [results, setResults] = useState<QuizResults>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void kvGet<unknown>("grammarQuiz").then((v) => {
      if (!alive) return;
      setResults(cleanResults(v));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  const save = useCallback(async (patternId: string, correct: number, total: number) => {
    const cur = cleanResults(await kvGet<unknown>("grammarQuiz"));
    const next = withResult(cur, patternId, correct, total);
    await kvSet("grammarQuiz", next);
    setResults(next);
  }, []);
  return { results, loaded, save };
}
