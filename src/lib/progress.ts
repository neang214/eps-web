import { dbAll, dbClear, dbPut, kvGet, kvSet, type StoreName } from "./db";
import { cleanLearned, cleanResults } from "./learned";
import type { Settings } from "../types";

const PROGRESS_STORES: StoreName[] = ["cards", "attempts", "mistakes", "flags", "lessons"];
export const EXPORT_VERSION = 1;

export interface ProgressFile {
  app: "eps-study";
  version: number;
  exportedAt: string;
  installId: string | null;
  settings: Settings | null;
  cards: unknown[];
  attempts: unknown[];
  mistakes: unknown[];
  flags: unknown[];
  lessons: unknown[];
  practiceSets?: Record<string, unknown>; // missing in files from older versions
  learned?: Record<string, unknown>; // Hangul / Numbers "I know this" marks (missing in older files)
  grammarQuiz?: Record<string, unknown>; // best grammar quiz score per pattern (missing in older files)
}

export async function exportProgress(): Promise<ProgressFile> {
  const data: Record<string, unknown[]> = {};
  for (const s of PROGRESS_STORES) data[s] = await dbAll(s);
  return {
    app: "eps-study",
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    installId: (await kvGet<string>("installId")) ?? null,
    settings: (await kvGet<Settings>("settings")) ?? null,
    cards: data.cards, attempts: data.attempts, mistakes: data.mistakes, flags: data.flags, lessons: data.lessons,
    practiceSets: (await kvGet<Record<string, unknown>>("practiceSets")) ?? {},
    learned: (await kvGet<Record<string, unknown>>("learned")) ?? {},
    grammarQuiz: (await kvGet<Record<string, unknown>>("grammarQuiz")) ?? {},
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseProgress(text: string): ProgressFile | null {
  try {
    const j: unknown = JSON.parse(text);
    if (!isObj(j) || j.app !== "eps-study" || typeof j.version !== "number" || j.version > EXPORT_VERSION) return null;
    for (const k of PROGRESS_STORES) if (!Array.isArray(j[k])) return null;
    for (const k of ["practiceSets", "learned", "grammarQuiz"]) if (j[k] !== undefined && !isObj(j[k])) return null;
    // Each record needs its stable id so progress survives content updates.
    const need: Record<string, string> = { cards: "id", attempts: "id", mistakes: "questionId", flags: "questionId", lessons: "unitId" };
    for (const k of PROGRESS_STORES) {
      for (const rec of j[k] as unknown[]) if (!isObj(rec) || typeof rec[need[k]] !== "string") return null;
    }
    return j as unknown as ProgressFile;
  } catch {
    return null;
  }
}

/** Replaces progress on this device with the file's contents. Settings and install ID are kept as they are. */
export async function importProgress(file: ProgressFile): Promise<void> {
  for (const s of PROGRESS_STORES) {
    await dbClear(s);
    for (const rec of (file as unknown as Record<string, unknown[]>)[s]) await dbPut(s, rec);
  }
  await kvSet("practiceSets", file.practiceSets ?? {});
  await kvSet("learned", cleanLearned(file.learned));
  await kvSet("grammarQuiz", cleanResults(file.grammarQuiz));
  if (!(await kvGet<string>("installId")) && file.installId) await kvSet("installId", file.installId);
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
