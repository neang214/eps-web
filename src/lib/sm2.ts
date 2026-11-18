// SM-2 spaced repetition (SuperMemo-2), starting ease 2.5, minimum ease 1.3.
export type Grade = "again" | "hard" | "good" | "easy";

export interface Card {
  id: string; // stable vocab id
  ease: number;
  interval: number; // days
  reps: number; // consecutive successful reviews
  due: number; // ms since epoch
  lapses: number;
  lastReviewed: number | null;
}

export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
const DAY_MS = 86_400_000;

// Buttons map to SM-2 quality scores (0-5).
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function newCard(id: string, now: number): Card {
  return { id, ease: START_EASE, interval: 0, reps: 0, due: now, lapses: 0, lastReviewed: null };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function review(card: Card, grade: Grade, now: number): Card {
  const q = QUALITY[grade];

  if (q < 3) {
    // Failed recall: restart repetitions, ease unchanged (as in the original SM-2).
    return { ...card, reps: 0, interval: 1, due: now + DAY_MS, lapses: card.lapses + 1, lastReviewed: now };
  }

  const reps = card.reps + 1;
  let interval: number;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(card.interval * card.ease);

  const ease = Math.max(MIN_EASE, round2(card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))));
  return { ...card, reps, interval, ease, due: now + interval * DAY_MS, lastReviewed: now };
}

export const isDue = (card: Card | undefined, now: number) => !card || card.due <= now;
