// Grammar quiz: no new content is needed. A question shows one example sentence of a pattern and the
// learner picks its meaning from four choices. The wrong choices are meanings of examples from other
// patterns (same category first), so they are real sentences and never the same text as the answer.
import type { GrammarPattern } from "../types";

export interface QuizQuestion {
  id: string; // `${patternId}-${exampleIndex}`
  patternId: string;
  ko: string;
  options: { km: string; en: string }[]; // 4 options
  correct: number; // index of the right option
}

/** Small seeded random numbers, so the same seed always gives the same quiz. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffled<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One question for example `index` of `pattern`. Returns null when there are not enough other sentences. */
export function makeQuestion(pattern: GrammarPattern, index: number, all: GrammarPattern[], seed: number): QuizQuestion | null {
  const ex = pattern.examples[index];
  if (!ex) return null;
  const rand = rng(seed ^ hash(`${pattern.id}-${index}`));
  const pool = all
    .filter((g) => g.id !== pattern.id)
    .flatMap((g) => g.examples.map((e) => ({ e, same: g.category === pattern.category })))
    .filter(({ e }) => e.en !== ex.en && e.km !== ex.km && e.ko !== ex.ko);
  const near = shuffled(pool.filter((p) => p.same), rand);
  const far = shuffled(pool.filter((p) => !p.same), rand);
  const picked: { km: string; en: string }[] = [];
  for (const { e } of [...near, ...far]) {
    if (picked.length === 3) break;
    if (picked.some((p) => p.en === e.en || p.km === e.km)) continue;
    picked.push({ km: e.km, en: e.en });
  }
  if (picked.length < 3) return null;
  const options = shuffled([{ km: ex.km, en: ex.en }, ...picked], rand);
  return { id: `${pattern.id}-${index}`, patternId: pattern.id, ko: ex.ko, options, correct: options.findIndex((o) => o.en === ex.en && o.km === ex.km) };
}

/** The quiz for one pattern: one question per example (normally 3). */
export function patternQuiz(pattern: GrammarPattern, all: GrammarPattern[], seed = 1): QuizQuestion[] {
  return pattern.examples
    .map((_, i) => makeQuestion(pattern, i, all, seed))
    .filter((q): q is QuizQuestion => q !== null);
}

/** A mixed quiz: `count` questions from different patterns (optionally one category only). */
export function mixedQuiz(all: GrammarPattern[], count: number, seed: number, category?: string): QuizQuestion[] {
  const rand = rng(seed);
  const pool = shuffled(all.filter((g) => !category || g.category === category), rand);
  const out: QuizQuestion[] = [];
  for (const g of pool) {
    if (out.length === count) break;
    const q = makeQuestion(g, Math.floor(rand() * g.examples.length), all, seed);
    if (q) out.push(q);
  }
  return out;
}
