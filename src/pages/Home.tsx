import { Link } from "react-router-dom";
import { isDue, type Card } from "../lib/sm2";
import { useKv, useStore, type AttemptRecord, type LessonRecord, type MistakeRecord } from "../lib/hooks";
import { useContent, useSettings } from "../store";
import { PageTitle } from "../components/ui";
import { BackupNotice } from "../components/BackupNotice";
import type { ExamState } from "../lib/exam";

export default function Home() {
  const { t } = useSettings();
  const { vocab, units, status } = useContent();
  const cards = useStore<Card>("cards");
  const attempts = useStore<AttemptRecord>("attempts");
  const lessons = useStore<LessonRecord>("lessons");
  const mistakes = useStore<MistakeRecord>("mistakes");
  const active = useKv<ExamState>("activeExam");

  const now = Date.now();
  const cardById = new Map(cards.items.map((c) => [c.id, c]));
  const dueCount = vocab.filter((v) => isDue(cardById.get(v.id), now)).length;
  const last = [...attempts.items].sort((a, b) => b.finishedAt - a.finishedAt)[0];
  const doneCount = lessons.items.filter((l) => units.some((u) => u.id === l.unitId)).length;
  const resumable = active.value && active.value.status === "in_progress";

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-5">
        <PageTitle>{t("app.name")}</PageTitle>
        <p className="muted text-base">{t("app.tagline")}</p>
      </div>

      <BackupNotice mode="home" />

      {resumable && (
        <Link to="/exam/run" className="btn btn-primary w-full py-3.5 text-base shadow-md">
          ⏱️ {t("home.continueExam")}
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <section className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="muted text-xs font-bold uppercase tracking-wider">{t("home.due")}</h2>
              <span aria-hidden="true" className="text-lg">🗂️</span>
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900" data-testid="due-count">
              {status === "ready" ? dueCount : "–"}
            </p>
          </div>
          <Link to="/lessons/words/review" className="btn btn-primary mt-5 w-full">
            {t("home.reviewNow")}
          </Link>
        </section>

        <section className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="muted text-xs font-bold uppercase tracking-wider">{t("home.lastMock")}</h2>
              <span aria-hidden="true" className="text-lg">⏱️</span>
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900" data-testid="last-mock">
              {last ? `${last.total} / ${last.maxTotal}` : t("home.noMock")}
            </p>
          </div>
          <Link to="/exam" className="btn btn-secondary mt-5 w-full">
            {t("home.takeMock")}
          </Link>
        </section>

        <section className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="muted text-xs font-bold uppercase tracking-wider">{t("home.lessonsDone")}</h2>
              <span aria-hidden="true" className="text-lg">📖</span>
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900" data-testid="lessons-done">
              {doneCount} / {units.length}
            </p>
          </div>
          <Link to="/lessons" className="btn btn-secondary mt-5 w-full">
            {t("nav.lessons")}
          </Link>
        </section>
      </div>

      <Link
        to="/lessons/interview"
        className="card flex items-center justify-between border-blue-200 bg-blue-50 font-semibold text-blue-900 hover:border-blue-600"
      >
        <span className="flex items-center gap-2.5">
          <span aria-hidden="true">🎤</span>
          <span>{t("home.interview")}</span>
        </span>
        <span aria-hidden="true" className="text-lg">→</span>
      </Link>

      {mistakes.items.length > 0 && (
        <Link
          to="/mistakes"
          className="card flex items-center justify-between border-amber-200 bg-amber-50 font-semibold text-amber-800 hover:border-amber-700"
        >
          <span className="flex items-center gap-2.5">
            <span aria-hidden="true">📓</span>
            <span>
              {t("home.mistakes")}: {mistakes.items.length}
            </span>
          </span>
          <span aria-hidden="true" className="text-lg">→</span>
        </Link>
      )}

      <section className="card flex flex-col justify-between gap-3 bg-zinc-50 sm:flex-row sm:items-center" aria-label={t("a11y.notice")}>
        <p className="muted text-sm">{t("guest.notice")}</p>
        <Link to="/settings" className="link-target shrink-0 text-sm">
          {t("guest.link")} →
        </Link>
      </section>
    </div>
  );
}