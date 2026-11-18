import { useCallback, useEffect, useState } from "react";
import { dbAll, kvGet, type StoreName } from "./db";

/** Loads every record of an IndexedDB store, with a refresh function. */
export function useStore<T>(store: StoreName) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    setItems(await dbAll<T>(store));
    setLoaded(true);
  }, [store]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { items, loaded, refresh };
}

export function useKv<T>(key: string) {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    setValue(await kvGet<T>(key));
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { value, loaded, refresh };
}

export interface AttemptRecord {
  id: string;
  startedAt: number;
  finishedAt: number;
  total: number;
  maxTotal: number; // from the exam rules at the time of the attempt (sections x sectionMaxPoints)
  sectionMax: number;
  timeUsedMs: number;
  questionCount: number;
  fullCount: number;
  sections: { section: "READING" | "LISTENING"; questionIds: string[]; total: number; correct: number; wrong: number; unanswered: number; score: number; timeUsedMs: number }[];
  answers: Record<string, number>;
}

export interface MistakeRecord {
  questionId: string;
  streak: number;
  addedAt: number;
  lastAt: number;
}
export interface FlagRecord {
  questionId: string;
  at: number;
}
export interface LessonRecord {
  unitId: string;
  completedAt: number;
  correct: number;
  total: number;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
