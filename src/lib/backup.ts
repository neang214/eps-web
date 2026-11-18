import { kvSet } from "./db";
import { downloadJson, exportProgress } from "./progress";

export const BACKUP_REMIND_DAYS = 14;
const DAY_MS = 86_400_000;

export type BackupMode = "afterExam" | "home";

/**
 * Should the learner be reminded to save a backup?
 * afterExam: the finished attempt is not in any backup yet.
 * home: there is unsaved progress and the last backup is missing or older than 14 days.
 */
export function needsBackup(opts: {
  mode: BackupMode;
  attemptCount: number;
  latestAttemptAt: number;
  lastBackupAt: number | undefined;
  now: number;
}): boolean {
  const { mode, attemptCount, latestAttemptAt, lastBackupAt, now } = opts;
  if (attemptCount === 0) return false;
  const unsaved = latestAttemptAt > (lastBackupAt ?? 0);
  if (mode === "afterExam") return unsaved;
  return unsaved && (lastBackupAt == null || now - lastBackupAt > BACKUP_REMIND_DAYS * DAY_MS);
}

/** Downloads the progress file and remembers when. The time stays on this device and is not part of the file. */
export async function saveBackup(): Promise<void> {
  const file = await exportProgress();
  downloadJson(`eps-study-progress-${new Date().toISOString().slice(0, 10)}.json`, file);
  await kvSet("lastBackupAt", Date.now());
}
