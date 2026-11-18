// Practice sets: a section's questions, in ID order, cut into fixed sets (Set 1, Set 2, ...).
// New questions are added at the END of the ID order, so existing sets never change.
import type { Question, Section } from "../types";

export const SET_SIZE = 25;

export interface PracticeSet {
  n: number; // 1-based
  ids: string[];
}

export interface SetProgress {
  position: number; // questions finished in the current run
  correct: number; // correct answers in the current run
  best: number | null; // best score of a finished run
}

export const setKey = (section: Section, n: number) => `${section}-${n}`;

export function buildSets(questions: Question[], section: Section, size = SET_SIZE): PracticeSet[] {
  const ids = questions
    .filter((q) => q.section === section)
    .map((q) => q.id)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sets: PracticeSet[] = [];
  for (let i = 0; i < ids.length; i += size) sets.push({ n: sets.length + 1, ids: ids.slice(i, i + size) });
  return sets;
}

export type SetState = "new" | "progress" | "done";

export function setState(p: SetProgress | undefined, size: number): SetState {
  if (!p || p.position <= 0) return "new";
  return p.position >= size ? "done" : "progress";
}

/** Progress after the learner answers question `index` (0-based) of a set of `size` questions. */
export function afterAnswer(prev: SetProgress | undefined, index: number, correctSoFar: number, size: number): SetProgress {
  const position = index + 1;
  const best = prev?.best ?? null;
  return { position, correct: correctSoFar, best: position >= size ? Math.max(best ?? 0, correctSoFar) : best };
}

/** Start the set again from question 1. The best score is kept. */
export const restarted = (prev: SetProgress | undefined): SetProgress => ({ position: 0, correct: 0, best: prev?.best ?? null });
