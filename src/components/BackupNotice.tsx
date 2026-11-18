import { useState } from "react";
import { Download } from "lucide-react";
import { needsBackup, saveBackup, type BackupMode } from "../lib/backup";
import { useKv, useStore, type AttemptRecord } from "../lib/hooks";
import { useSettings } from "../store";

/** A short reminder to save a progress file, because progress lives only in this browser. */
export function BackupNotice({ mode }: { mode: BackupMode }) {
  const { t } = useSettings();
  const attempts = useStore<AttemptRecord>("attempts");
  const last = useKv<number>("lastBackupAt");
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <p role="status" className="card border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800">
        {t("backup.saved")}
      </p>
    );
  }
  if (!attempts.loaded || !last.loaded) return null;
  const latest = attempts.items.reduce((m, a) => Math.max(m, a.finishedAt), 0);
  if (!needsBackup({ mode, attemptCount: attempts.items.length, latestAttemptAt: latest, lastBackupAt: last.value, now: Date.now() })) return null;

  return (
    <section className="card flex flex-col gap-3 border-amber-200 bg-amber-50 sm:flex-row sm:items-center sm:justify-between" aria-label={t("backup.title")} data-testid="backup-notice">
      <p className="text-sm font-medium text-amber-800">{mode === "afterExam" ? t("backup.afterExam") : t("backup.reminder")}</p>
      <button
        type="button"
        className="btn btn-secondary shrink-0"
        data-testid="backup-save"
        onClick={() => {
          void saveBackup().then(() => setSaved(true));
        }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>{t("backup.save")}</span>
      </button>
    </section>
  );
}
