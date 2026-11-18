import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MISTAKE_REMOVE_STREAK } from "../lib/constants";
import { dbDelete, dbPut } from "../lib/db";
import { pick } from "../lib/i18n";
import { shuffle, useStore, type AttemptRecord, type MistakeRecord } from "../lib/hooks";
import { useContent, useSettings } from "../store";
import { QuestionCard } from "../components/QuestionCard";
import { Ko, PageTitle, Tr } from "../components/ui";

export function History() {
  const { t, lang } = useSettings();
  const attempts = useStore<AttemptRecord>("attempts");
  const sorted = [...attempts.items].sort((a, b) => b.finishedAt - a.finishedAt);
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(lang === "km" ? "km-KH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <PageTitle>{t("history.title")}</PageTitle>
      {attempts.loaded && sorted.length === 0 && <p className="card muted">{t("history.empty")}</p>}
      <ul className="space-y-3">
        {sorted.map((a) => (
          <li key={a.id}>
            <Link
              to={`/exam/results/${a.id}`}
              className="card flex items-center justify-between gap-4 hover:border-indigo-600"
              data-testid="history-item"
            >
              <span className="font-medium text-zinc-700">{fmt(a.finishedAt)}</span>
              <span className="rounded-xl bg-indigo-50 px-3.5 py-1.5 text-lg font-extrabold text-indigo-800">
                {t("history.total")}: {a.total} / {a.maxTotal}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MistakesPage() {
  const { t, lang } = useSettings();
  const { questionById } = useContent();
  const mistakes = useStore<MistakeRecord>("mistakes");
  const items = [...mistakes.items].sort((a, b) => b.lastAt - a.lastAt).filter((m) => questionById[m.questionId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <PageTitle>{t("mistakes.title")}</PageTitle>
        {items.length > 0 && (
          <Link to="/mistakes/retry" className="btn btn-primary shrink-0" data-testid="retry-all">
            {t("mistakes.retryAll", { n: items.length })}
          </Link>
        )}
      </div>

      {mistakes.loaded && items.length === 0 && <p className="card muted">{t("mistakes.empty")}</p>}

      <ul className="space-y-3">
        {items.map((m) => {
          const q = questionById[m.questionId];
          return (
            <li key={m.questionId} className="card flex items-center justify-between gap-4" data-testid="mistake-item">
              <div className="min-w-0 space-y-1">
                <p className="muted text-xs font-semibold">
                  {q.id} · {t("mistakes.streak", { n: m.streak, max: MISTAKE_REMOVE_STREAK })}
                </p>
                <p className="line-clamp-2 whitespace-pre-line font-bold text-zinc-900">
                  <Ko>{q.stem_ko}</Ko>
                </p>
                <p className="muted line-clamp-1 text-sm">
                  <Tr lang={lang}>{pick(q, "stem", lang)}</Tr>
                </p>
              </div>
              <Link to={`/mistakes/retry?q=${encodeURIComponent(q.id)}`} className="btn btn-secondary shrink-0">
                {t("mistakes.retry")}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One-tap retry. A question leaves the notebook after two correct retries in a row. */
export function MistakesRetry() {
  const { t } = useSettings();
  const { questionById, status } = useContent();
  const mistakes = useStore<MistakeRecord>("mistakes");
  const [params] = useSearchParams();
  const only = params.get("q");
  const [ids, setIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<null | "removed" | "still">(null);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    if (ids !== null || status !== "ready" || !mistakes.loaded) return;
    const all = mistakes.items.map((m) => m.questionId).filter((id) => questionById[id]);
    setIds(only ? all.filter((id) => id === only) : shuffle(all));
  }, [ids, status, mistakes.loaded, mistakes.items, only, questionById]);

  if (status === "error") return <p role="alert" className="card border-red-200 bg-red-50 text-red-700">{t("common.contentError")}</p>;
  if (ids === null) return null;
  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <p className="card muted">{t("mistakes.empty")}</p>
        <Link to="/mistakes" className="btn btn-secondary">
          {t("common.back")}
        </Link>
      </div>
    );
  }
  if (index >= ids.length) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageTitle>{t("mistakes.done")}</PageTitle>
        <p role="status" className="card border-emerald-200 bg-emerald-50 text-lg font-semibold text-emerald-800">
          {t("practice.result", { c: correct, t: ids.length })}
        </p>
        <Link to="/mistakes" className="btn btn-primary w-full">
          {t("nav.mistakes")}
        </Link>
      </div>
    );
  }

  const q = questionById[ids[index]];
  const record = mistakes.items.find((m) => m.questionId === q.id);

  const onAnswered = async (_pos: number, ok: boolean) => {
    const prev = record ?? { questionId: q.id, streak: 0, addedAt: Date.now(), lastAt: Date.now() };
    if (ok) {
      setCorrect((c) => c + 1);
      const streak = prev.streak + 1;
      if (streak >= MISTAKE_REMOVE_STREAK) {
        await dbDelete("mistakes", q.id);
        setOutcome("removed");
      } else {
        await dbPut("mistakes", { ...prev, streak, lastAt: Date.now() } satisfies MistakeRecord);
        setOutcome("still");
      }
    } else {
      await dbPut("mistakes", { ...prev, streak: 0, lastAt: Date.now() } satisfies MistakeRecord);
      setOutcome("still");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700 inline-block" aria-live="polite">
        {index + 1} / {ids.length}
      </p>
      <QuestionCard key={q.id} question={q} showFlag={false} onAnswered={(p, ok) => void onAnswered(p, ok)} />
      {outcome && (
        <div className="space-y-3">
          <p
            role="status"
            className={`card font-semibold ${
              outcome === "removed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {outcome === "removed" ? t("mistakes.removed") : t("mistakes.stillThere", { max: MISTAKE_REMOVE_STREAK })}
          </p>
          <button
            type="button"
            className="btn btn-primary w-full py-3"
            onClick={() => {
              setOutcome(null);
              setIndex(index + 1);
            }}
          >
            {index + 1 < ids.length ? t("common.next") : t("common.finish")}
          </button>
        </div>
      )}
    </div>
  );
}