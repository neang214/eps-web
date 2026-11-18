import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dbGet } from "../lib/db";
import { pick } from "../lib/i18n";
import type { AttemptRecord } from "../lib/hooks";
import { useContent, useSettings } from "../store";
import { AudioButton } from "../components/Audio";
import { ReportButton } from "../components/ReportDialog";
import { Ko, PageTitle, SampleBadge, Tr, formatDuration } from "../components/ui";
import { BackupNotice } from "../components/BackupNotice";
import type { Question } from "../types";

function ReviewItem({ q, index, answer }: { q: Question; index: number; answer: number | undefined }) {
  const { t, lang } = useSettings();
  const { stimuli } = useContent();
  const stim = q.stimulus_id ? stimuli[q.stimulus_id] : undefined;
  const correct = q.options.find((o) => o.is_correct)?.position;
  const isRight = answer != null && answer === correct;

  return (
    <li className="card space-y-3 sm:p-6" data-testid={`review-${q.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <h3 className="font-bold text-zinc-900">
          {index}.{" "}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isRight
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {isRight ? "✓ " + t("common.correct") : answer == null ? "✗ " + t("results.noAnswer") : "✗ " + t("common.wrong")}
          </span>
        </h3>
        {q.is_sample && <SampleBadge />}
      </div>

      {stim?.type === "PASSAGE" && stim.text_ko && (
        <blockquote className="whitespace-pre-line rounded-xl border border-zinc-200 border-l-4 border-l-indigo-600 bg-zinc-50 p-4 text-zinc-900">
          <Ko>{stim.text_ko}</Ko>
        </blockquote>
      )}
      {stim?.audio_file && <AudioButton file={stim.audio_file} />}

      <div>
        <p className="whitespace-pre-line text-lg font-bold text-zinc-900">
          <Ko>{q.stem_ko}</Ko>
        </p>
        <p className="muted mt-1 whitespace-pre-line text-sm">
          <Tr lang={lang}>{pick(q, "stem", lang)}</Tr>
        </p>
      </div>

      <ul className="space-y-2">
        {q.options.map((o) => {
          const mine = answer === o.position;
          const right = o.position === correct;
          return (
            <li
              key={o.position}
              className={`rounded-xl border-2 px-4 py-2.5 ${
                right
                  ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                  : mine
                    ? "border-red-600 bg-red-50 text-red-800"
                    : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              <span className="font-bold">{o.position}. </span>
              <Ko>{o.text_ko}</Ko>
              <span className="muted block text-sm">
                <Tr lang={lang}>{pick(o, "text", lang)}</Tr>
              </span>
              {right && <span className="mt-1 block text-xs font-bold text-emerald-700">✓ {t("results.correctAnswer")}</span>}
              {mine && !right && <span className="mt-1 block text-xs font-bold text-red-700">✗ {t("results.yourAnswer")}</span>}
            </li>
          );
        })}
      </ul>

      <div className="rounded-xl bg-zinc-50 p-3.5">
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("results.explanation")}</p>
        <p className="mt-1 text-sm text-zinc-900">
          <Tr lang={lang}>{pick(q, "explanation", lang)}</Tr>
        </p>
      </div>

      <div className="pt-1">
        <ReportButton questionId={q.id} />
      </div>
    </li>
  );
}

export default function Results() {
  const { attemptId } = useParams();
  const { t } = useSettings();
  const { questionById, status } = useContent();
  const [attempt, setAttempt] = useState<AttemptRecord | null | undefined>(undefined);

  useEffect(() => {
    void dbGet<AttemptRecord>("attempts", attemptId ?? "").then((a) => setAttempt(a ?? null));
  }, [attemptId]);

  if (attempt === undefined) return null;
  if (attempt === null) {
    return (
      <div className="space-y-3">
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">
          {t("results.notFound")}
        </p>
        <Link to="/" className="btn btn-secondary">
          {t("results.backHome")}
        </Link>
      </div>
    );
  }

  const mistakes = attempt.sections.reduce((n, s) => n + s.wrong + s.unanswered, 0);
  let number = 0;

  return (
    <div className="space-y-6">
      <PageTitle>{t("results.title")}</PageTitle>
      <BackupNotice mode="afterExam" />

      <section className="card p-6 text-center sm:p-8" aria-labelledby="total-label">
        <h2 id="total-label" className="muted text-xs font-bold uppercase tracking-wider">
          {t("results.total")}
        </h2>
        <p className="mt-2 text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl" data-testid="total-score">
          {t("results.outOf", { s: attempt.total, m: attempt.maxTotal })}
        </p>
        <p className="muted mt-3 text-sm">{t("exam.guideRelative")}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {attempt.sections.map((s) => (
          <section key={s.section} className="card space-y-2" data-testid={`section-${s.section}`}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {s.section === "READING" ? t("practice.reading") : t("practice.listening")}
            </h2>
            <p className="text-3xl font-extrabold text-zinc-900">
              {t("results.outOf", { s: s.score, m: attempt.sectionMax })}
            </p>
            <div className="space-y-1 border-t border-zinc-100 pt-2 text-sm text-zinc-700">
              <p>
                {t("results.correctCount")}: {s.correct} / {s.total}
              </p>
              <p>
                {t("common.wrong")}: {s.wrong} · {t("common.unanswered")}: {s.unanswered}
              </p>
              {s.timeUsedMs > 0 && (
                <p className="muted">
                  {t("results.timeUsed")}: {formatDuration(s.timeUsedMs, t)}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3 bg-zinc-50">
        <p className="text-sm text-zinc-700">
          {t("results.timeUsed")}: <strong>{formatDuration(attempt.timeUsedMs, t)}</strong>
        </p>
        {mistakes > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="font-medium text-amber-800">{t("results.savedMistakes", { n: mistakes })}</p>
            <Link to="/mistakes" className="link-target">
              {t("nav.mistakes")} →
            </Link>
          </div>
        )}
      </div>

      {attempt.questionCount < attempt.fullCount && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-medium text-amber-800">
          {t("results.short", { n: attempt.questionCount, f: attempt.fullCount })}
        </p>
      )}

      <section aria-labelledby="review-title" className="space-y-4">
        <h2 id="review-title" className="text-xl font-bold tracking-tight text-zinc-900">
          {t("results.review")}
        </h2>
        {status !== "ready" && (
          <p role="alert" className="card border-red-200 bg-red-50 text-red-700">
            {t("common.contentError")}
          </p>
        )}
        {attempt.sections.map((s) => (
          <ol key={s.section} className="space-y-4">
            {s.questionIds.map((id) => {
              number++;
              const q = questionById[id];
              return q ? <ReviewItem key={id} q={q} index={number} answer={attempt.answers[id]} /> : null;
            })}
          </ol>
        ))}
      </section>

      <Link to="/" className="btn btn-primary w-full py-3">
        {t("results.backHome")}
      </Link>
    </div>
  );
}