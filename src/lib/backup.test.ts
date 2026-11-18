import { describe, expect, it } from "vitest";
import { needsBackup, BACKUP_REMIND_DAYS } from "./backup";

const DAY = 86_400_000;
const now = 100 * DAY;
const base = { attemptCount: 1, latestAttemptAt: now - DAY, lastBackupAt: undefined as number | undefined, now };

describe("backup reminder", () => {
  it("never reminds when there are no attempts", () => {
    expect(needsBackup({ ...base, attemptCount: 0, mode: "afterExam" })).toBe(false);
    expect(needsBackup({ ...base, attemptCount: 0, mode: "home" })).toBe(false);
  });
  it("after an exam: reminds until a backup is newer than the attempt", () => {
    expect(needsBackup({ ...base, mode: "afterExam" })).toBe(true);
    expect(needsBackup({ ...base, mode: "afterExam", lastBackupAt: now - 2 * DAY })).toBe(true);
    expect(needsBackup({ ...base, mode: "afterExam", lastBackupAt: now })).toBe(false);
  });
  it("home: reminds when never saved", () => {
    expect(needsBackup({ ...base, mode: "home" })).toBe(true);
  });
  it("home: waits until the backup is old enough", () => {
    const old = now - (BACKUP_REMIND_DAYS + 1) * DAY;
    expect(needsBackup({ ...base, mode: "home", latestAttemptAt: now - DAY, lastBackupAt: now - 3 * DAY })).toBe(false);
    expect(needsBackup({ ...base, mode: "home", latestAttemptAt: now - DAY, lastBackupAt: old })).toBe(true);
  });
  it("home: stays quiet when nothing is new since the old backup", () => {
    const old = now - 30 * DAY;
    expect(needsBackup({ ...base, mode: "home", latestAttemptAt: old - DAY, lastBackupAt: old })).toBe(false);
  });
});
