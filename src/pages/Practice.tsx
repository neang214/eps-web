import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { dbDelete, dbPut, kvGet, kvSet } from "../lib/db";
import { pick } from "../lib/i18n";
import { shuffle, useKv, useStore, type FlagRecord } from "../lib/hooks";
import { afterAnswer, buildSets, restarted, setKey, setState, type SetProgress } from "../lib/practice";
import { useContent, useSettings } from "../store";
import { QuestionCard } from "../components/QuestionCard";
import { PageTitle } from "../components/ui";
import type { Section } from "../types";

export function PracticeSetup() {
  const { t, lang } = useSettings();
  const { units, questions, status } = useContent();
  const nav = useNavigate();
  const progress = useKv<Record<string, SetProgress>>("practiceSets");
  const [section, setSection] = useState<Section>("READING");
  const [unit, setUnit] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const sets = buildSets(questions, section);
  const chip = (active: boolean) => `btn min-h-11 flex-1 ${active ? "btn-primary" : "btn-secondary"}`;

  const open = async (n: number, fresh: boolean) => {
    if (fresh) {
      const all = { ...(progress.value ?? {}) };
      all[setKey(section, n)] = restarted(all[setKey(section, n)]);
      await kvSet("practiceSets", all);
    }
    nav(`/practice/set/${section}/${n}`);
  };

  const goOther = () => {
    const p = new URLSearchParams();
    if (unit) p.set("unit", unit);
    else p.set("section", "ALL");
    if (flaggedOnly) p.set("flagged", "1");
    nav(`/practice/run?${p.toString()}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle>{t("practice.title")}</PageTitle>
      {status === "error" && (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">
          {t("common.contentError")}
        </p>
      )}

      <div className="flex gap-2" role="group" aria-label={t("practice.bySection")}>
        {(["READING", "LISTENING"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={section === s} onClick={() => setSection(s)} className={chip(section === s)} data-testid={`practice-tab-${s}`}>
            {s === "READING" ? t("practice.reading") : t("practice.listening")}
          </button>
        ))}
      </div>

      {status === "ready" && sets.length === 0 && <p className="card muted">{t("practice.noSets")}</p>}
      <ul className="space-y-3">
        {sets.map((set) => {
          const size = set.ids.length;
          const prog = progress.value?.[setKey(section, set.n)];
          const state = setState(prog, size);
          return (
            <li key={set.n} className="card flex items-center justify-between gap-3" data-testid={`practice-set-${set.n}`}>
              <span className="min-w-0">
                <span className="block font-bold text-zinc-900">{t("practice.set", { n: set.n })}</span>
                <span className="muted block text-xs font-medium">
                  {t("practice.setCount", { n: size })}
                  {" · "}
                  {state === "new" && t("practice.notStarted")}
                  {state === "progress" && t("practice.inProgress", { p: prog!.position, n: size })}
                  {state === "done" && t("practice.done")}
                  {prog?.best != null && ` · ${t("practice.best", { c: prog.best, n: size })}`}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                {state === "progress" && (
                  <button type="button" className="btn btn-secondary" onClick={() => void open(set.n, true)} data-testid={`practice-restart-${set.n}`}>
                    {t("practice.restart")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void open(set.n, state === "done")}
                  data-testid={`practice-open-${set.n}`}
                >
                  {state === "progress" ? t("practice.continue") : state === "done" ? t("practice.doAgain") : t("practice.start")}
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <details className="card">
        <summary className="min-h-11 cursor-pointer py-2 font-bold text-zinc-900">{t("practice.moreWays")}</summary>
        <div className="space-y-4 pt-2">
          <label className="block space-y-2">
            <span className="block text-base font-bold text-zinc-900">{t("practice.byUnit")}</span>
            <select className="field" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">–</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.order}. {u.title_ko} / {pick(u, "title", lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 font-medium text-zinc-900">
            <input type="checkbox" className="h-5 w-5 cursor-pointer accent-indigo-600" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
            <span>{t("practice.flaggedOnly")}</span>
          </label>
          <button type="button" className="btn btn-secondary w-full py-3" onClick={goOther} disabled={status !== "ready" || (!unit && !flaggedOnly)}>
            {t("practice.start")}
          </button>
        </div>
      </details>
    </div>
  );
}

/** One practice set, in fixed order. The place is saved after every answer, so the learner can leave and continue. */
export function PracticeSet() {
  const { t } = useSettings();
  const { questions, questionById, status } = useContent();
  const flags = useStore<FlagRecord>("flags");
  const params = useParams();
  const section = params.section === "LISTENING" ? "LISTENING" : params.section === "READING" ? "READING" : null;
  const n = Number(params.n);
  const [saved, setSaved] = useState<Record<string, SetProgress> | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    void kvGet<Record<string, SetProgress>>("practiceSets").then((v) => setSaved(v ?? {}));
  }, []);

  const set = section && status === "ready" ? buildSets(questions, section).find((s) => s.n === n) : undefined;

  // Start where the learner stopped. A finished set that is opened again starts at question 1.
  useEffect(() => {
    if (!set || !section || saved === null || index !== null) return;
    const p = saved[setKey(section, n)];
    const resume = p && p.position < set.ids.length ? p : undefined;
    setIndex(resume?.position ?? 0);
    setCorrect(resume?.correct ?? 0);
  }, [set, section, n, saved, index]);

  if (status === "error") return <p role="alert" className="card border-red-200 bg-red-50 text-red-700">{t("common.contentError")}</p>;
  if (!section || (status === "ready" && !set)) return <Navigate to="/practice" replace />;
  if (!set || saved === null || index === null || !flags.loaded) return null;

  const ids = set.ids.filter((id) => questionById[id]);
  const total = ids.length;

  if (index >= total) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageTitle>{t("practice.finished")}</PageTitle>
        <p role="status" className="card border-emerald-200 bg-emerald-50 text-lg font-semibold text-emerald-800" data-testid="set-result">
          {t("practice.result", { c: correct, t: total })}
        </p>
        <Link to="/practice" className="btn btn-primary w-full">
          {t("practice.backToSets")}
        </Link>
      </div>
    );
  }

  const flagged = new Set(flags.items.map((f) => f.questionId));
  const q = questionById[ids[index]];
  const toggleFlag = async () => {
    if (flagged.has(q.id)) await dbDelete("flags", q.id);
    else await dbPut("flags", { questionId: q.id, at: Date.now() } satisfies FlagRecord);
    await flags.refresh();
  };
  const onAnswered = (_p: number, ok: boolean) => {
    const c = correct + (ok ? 1 : 0);
    setAnswered(true);
    setCorrect(c);
    const key = setKey(section, n);
    const next = { ...saved, [key]: afterAnswer(saved[key], index, c, total) };
    setSaved(next);
    void kvSet("practiceSets", next);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="sr-only">{t("practice.title")}</h1>
      <div className="flex items-center justify-between gap-3">
        <Link to="/practice" className="link-target -ml-1 text-sm">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t("practice.backToSets")}
        </Link>
        <p className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700" aria-live="polite" data-testid="set-progress">
          {t("practice.set", { n })} · {index + 1} / {total}
        </p>
      </div>
      <QuestionCard key={q.id} question={q} flagged={flagged.has(q.id)} onToggleFlag={() => void toggleFlag()} onAnswered={onAnswered} splitLayout />
      {answered && (
        <button
          type="button"
          className="btn btn-primary w-full py-3 text-base"
          onClick={() => {
            setIndex(index + 1);
            setAnswered(false);
          }}
          data-testid="set-next"
        >
          {index + 1 < total ? t("common.next") : t("common.finish")}
        </button>
      )}
    </div>
  );
}

export function PracticeRun() {
  const { t } = useSettings();
  const { questions, units, questionById, status } = useContent();
  const flags = useStore<FlagRecord>("flags");
  const [params] = useSearchParams();
  const unitId = params.get("unit");
  const section = params.get("section");
  const flaggedOnly = params.get("flagged") === "1";

  const [ids, setIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);

  // The question list is fixed once at the start, so flagging a question does not change the session.
  useEffect(() => {
    if (ids !== null || status !== "ready" || !flags.loaded) return;
    const flaggedSet = new Set(flags.items.map((f) => f.questionId));
    let list: string[] = unitId
      ? units.find((u) => u.id === unitId)?.check_question_ids ?? []
      : questions.filter((q) => !section || section === "ALL" || q.section === section).map((q) => q.id);
    list = list.filter((id) => questionById[id]);
    if (flaggedOnly) list = list.filter((id) => flaggedSet.has(id));
    setIds(unitId ? list : shuffle(list));
  }, [ids, status, flags.loaded, flags.items, unitId, section, flaggedOnly, units, questions, questionById]);

  if (status === "error") return <p role="alert" className="card border-red-200 bg-red-50 text-red-700">{t("common.contentError")}</p>;
  if (status === "loading" || !flags.loaded || ids === null) return null;
  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="card muted">{t("practice.noQuestions")}</p>
        <Link to="/practice" className="btn btn-secondary">
          {t("practice.again")}
        </Link>
      </div>
    );
  }
  if (index >= ids.length) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageTitle>{t("practice.finished")}</PageTitle>
        <p role="status" className="card border-emerald-200 bg-emerald-50 text-lg font-semibold text-emerald-800">
          {t("practice.result", { c: correct, t: ids.length })}
        </p>
        <Link to="/practice" className="btn btn-primary w-full">
          {t("practice.again")}
        </Link>
      </div>
    );
  }

  const flagged = new Set(flags.items.map((f) => f.questionId));
  const q = questionById[ids[index]];
  const toggleFlag = async () => {
    if (flagged.has(q.id)) await dbDelete("flags", q.id);
    else await dbPut("flags", { questionId: q.id, at: Date.now() } satisfies FlagRecord);
    await flags.refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="sr-only">{t("practice.title")}</h1>
      <div className="flex items-center justify-between">
        <p className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700" aria-live="polite">
          {index + 1} / {ids.length}
        </p>
      </div>
      <QuestionCard
        key={q.id}
        question={q}
        flagged={flagged.has(q.id)}
        onToggleFlag={() => void toggleFlag()}
        splitLayout
        onAnswered={(_p, ok) => {
          setAnswered(true);
          if (ok) setCorrect((c) => c + 1);
        }}
      />
      {answered && (
        <button
          type="button"
          className="btn btn-primary w-full py-3 text-base"
          onClick={() => {
            setIndex(index + 1);
            setAnswered(false);
          }}
        >
          {index + 1 < ids.length ? t("common.next") : t("common.finish")}
        </button>
      )}
    </div>
  );
}