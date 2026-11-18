import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { kvGet, kvSet, uuid } from "../lib/db";
import { startExam, type ExamState } from "../lib/exam";
import { shuffle, useStore, type AttemptRecord } from "../lib/hooks";
import { listPapers, paperPicks } from "../lib/papers";
import { loadRules } from "../lib/rules";
import { useContent, useSettings } from "../store";
import { PageTitle } from "../components/ui";
import type { ExamRules, Section } from "../types";

export default function ExamGuide() {
  const { t, lang } = useSettings();
  const { questions, status } = useContent();
  const attempts = useStore<AttemptRecord>("attempts");
  const nav = useNavigate();
  const [rules, setRules] = useState<ExamRules | null | undefined>(undefined);
  const [active, setActive] = useState<ExamState | null>(null);

  useEffect(() => {
    void (async () => {
      setRules(await loadRules());
      const a = await kvGet<ExamState | null>("activeExam");
      setActive(a && a.status === "in_progress" ? a : null);
    })();
  }, []);

  if (rules === undefined || status === "loading") return null;

  const available: Record<Section, number> = {
    READING: questions.filter((q) => q.section === "READING").length,
    LISTENING: questions.filter((q) => q.section === "LISTENING").length,
  };

  const begin = async () => {
    if (!rules) return;
    const picks = {} as Record<Section, string[]>;
    for (const s of rules.sectionOrder) {
      const ids = questions.filter((q) => q.section === s).map((q) => q.id);
      picks[s] = shuffle(ids).slice(0, rules.questionsPerSection[s]);
    }
    const exam = startExam(rules, picks, Date.now(), uuid(), { free: true });
    await kvSet("activeExam", exam);
    nav("/exam/run");
  };

  const beginPaper = async (packId: string) => {
    if (!rules) return;
    const exam = startExam(rules, paperPicks(questions, packId, ["READING", "LISTENING"], rules), Date.now(), uuid(), { free: true });
    await kvSet("activeExam", exam);
    nav("/exam/run");
  };

  const papers = rules ? listPapers(questions, rules) : [];
  const mockNumber = (id: string) => Number(id.replace(/^mock-/, "")) || id.replace(/^mock-/, "");
  const paperMinutes = (c: Record<Section, number>) =>
    (c.READING > 0 ? rules!.sectionMinutes.READING : 0) + (c.LISTENING > 0 ? rules!.sectionMinutes.LISTENING : 0);
  const sortedAttempts = [...attempts.items].sort((a, b) => b.finishedAt - a.finishedAt);
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(lang === "km" ? "km-KH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  const sectionLabel = (a: AttemptRecord) =>
    a.sections.map((s) => (s.section === "READING" ? t("practice.reading") : t("practice.listening"))).join(" + ");

  const discard = async () => {
    await kvSet("activeExam", null);
    setActive(null);
  };

  const canStart = !!rules && rules.sectionOrder.some((s) => available[s] > 0);
  const small = !!rules && rules.sectionOrder.some((s) => available[s] < rules.questionsPerSection[s]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle>{t("exam.title")}</PageTitle>
      {!rules ? (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">
          {t("exam.guideNeedRules")}
        </p>
      ) : (
        <section className="card space-y-4 sm:p-6" aria-labelledby="guide-title">
          <h2 id="guide-title" className="text-xl font-bold text-zinc-900">
            {t("exam.guideTitle")}
          </h2>
          <p className="text-zinc-700">
            {t("exam.guideFormat", {
              rq: rules.questionsPerSection.READING,
              lq: rules.questionsPerSection.LISTENING,
              tm: rules.sectionMinutes.READING + rules.sectionMinutes.LISTENING,
            })}
          </p>
          <p className="text-zinc-700">
            {t("exam.guideScoring", {
              max: rules.sectionMaxPoints,
              total: rules.sectionMaxPoints * rules.sectionOrder.length,
              un: rules.unansweredScore,
            })}
          </p>
          <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 text-sm font-semibold text-indigo-900">
            {t("exam.guideRelative")}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-zinc-700">
            <li>{t("exam.guideNoHelp")}</li>
            <li>{rules.listeningReplayAllowed ? t("exam.guideReplayYes") : t("exam.guideReplayNo")}</li>
            <li>{rules.allowBackNavigation ? t("exam.guideBackYes") : t("exam.guideBackNo")}</li>
            {rules.allowFlagging && <li>{t("exam.guideFlag")}</li>}
            <li>{t("exam.guideLock")}</li>
          </ul>
          {small && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
              {t("exam.guideSmall", { r: available.READING, l: available.LISTENING })}
            </p>
          )}
          {!canStart && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {t("exam.guideNoQuestions")}
            </p>
          )}
        </section>
      )}

      {active && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn btn-primary flex-1 py-3 text-base" onClick={() => nav("/exam/run")}>
            {t("exam.resume")}
          </button>
          <button type="button" className="btn btn-secondary flex-1 py-3 text-base" onClick={() => void discard()}>
            {t("exam.discard")}
          </button>
        </div>
      )}
      {!active && (
        <button
          type="button"
          className="btn btn-primary w-full py-3.5 text-base shadow-sm"
          disabled={!rules || !canStart}
          onClick={() => void begin()}
          data-testid="start-exam"
        >
          {t("exam.start")}
        </button>
      )}

      {!active && rules && papers.length > 0 && (
        <section className="space-y-3" aria-labelledby="papers-title">
          <div>
            <h2 id="papers-title" className="text-xl font-bold text-zinc-900">{t("exam.paperTitle")}</h2>
            <p className="muted text-sm">{t("exam.paperIntro")}</p>
          </div>
          <ul className="space-y-3">
            {papers.map((p) => (
              <li key={p.packId}>
                <button
                  type="button"
                  className="card flex w-full cursor-pointer items-center justify-between gap-4 text-left hover:border-indigo-600"
                  onClick={() => void beginPaper(p.packId)}
                  data-testid={`paper-${p.packId}`}
                >
                  <span className="min-w-0">
                    <span className="block font-bold text-zinc-900">{t("exam.mockName", { n: mockNumber(p.packId) })}</span>
                    <span className="muted block text-xs font-medium">
                      {t("exam.paperInfo", { q: p.counts.READING + p.counts.LISTENING, m: paperMinutes(p.counts) })}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="past-title">
        <h2 id="past-title" className="text-xl font-bold text-zinc-900">{t("exam.pastTitle")}</h2>
        {attempts.loaded && sortedAttempts.length === 0 && <p className="card muted">{t("exam.pastEmpty")}</p>}
        <ul className="space-y-3">
          {sortedAttempts.map((a) => (
            <li key={a.id}>
              <Link to={`/exam/results/${a.id}`} className="card flex items-center justify-between gap-4 hover:border-indigo-600" data-testid="history-item">
                <span className="min-w-0">
                  <span className="block font-medium text-zinc-700">{fmt(a.finishedAt)}</span>
                  <span className="muted block text-xs font-semibold">{sectionLabel(a)}</span>
                </span>
                <span className="shrink-0 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-lg font-extrabold text-indigo-800">
                  {a.total} / {a.maxTotal}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}