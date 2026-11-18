import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { kvGet, kvSet } from "../lib/db";
import {
  activeSection, advance, canPlayAudio, finishSection, moveTo, recordPlay, remainingMs, setAnswer, submitExam, switchSection, toggleFlag,
  type ExamState,
} from "../lib/exam";
import { finalizeExam } from "../lib/finalize";
import { loadRules } from "../lib/rules";
import { useContent, useSettings } from "../store";
import { Ko, Modal } from "../components/ui";
import type { ExamRules } from "../types";

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Exam screen: clean theme-aware high contrast, large question text, no translations, no hints.
 * Chrome text (buttons, timer) uses the interface language; question content is Korean only.
 */
export default function ExamRun() {
  const { t, settings } = useSettings();
  const { questionById, stimuli, status, audioSrc } = useContent();
  const [rules, setRules] = useState<ExamRules | null | undefined>(undefined);
  const [state, setState] = useState<ExamState | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<null | "section" | "submit">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ qid: string; status: "playing" | "error" } | null>(null);
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const finalizing = useRef(false);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<ExamState | null>(null);

  // Load rules and the saved exam. The saved state holds absolute end times, so it is always correct.
  useEffect(() => {
    void (async () => {
      setRules(await loadRules());
      setState((await kvGet<ExamState | null>("activeExam")) ?? null);
    })();
  }, []);

  const persist = useCallback((next: ExamState) => {
    stateRef.current = next;
    setState(next);
    void kvSet("activeExam", next);
  }, []);

  const stopAudio = useCallback(() => {
    audioEl.current?.pause();
    audioEl.current = null;
    setAudio(null);
  }, []);

  // Clock tick: applies section timeouts, including time that passed while the app was closed.
  useEffect(() => {
    if (!state || !rules || state.status !== "in_progress") return;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const cur = stateRef.current ?? state;
      const next = advance(cur, rules, n);
      if (next !== cur) {
        if (next.current !== cur.current || next.status !== cur.status) {
          stopAudio();
          if (next.status === "in_progress") setNotice(t("exam.timeUp"));
        }
        persist(next);
      }
    };
    stateRef.current = state;
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state?.id, state?.status, rules, persist, stopAudio, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Submitted (timeout, early finish or confirmation): store the attempt, then show the results.
  useEffect(() => {
    if (!state || !rules || state.status !== "submitted" || status !== "ready" || finalizing.current) return;
    finalizing.current = true;
    void (async () => {
      const { attempt } = await finalizeExam(state, rules, questionById, settings.analyticsOptIn);
      setFinishedId(attempt.id);
    })();
  }, [state, rules, status, questionById, settings.analyticsOptIn]);

  useEffect(() => () => audioEl.current?.pause(), []);

  if (finishedId) return <Navigate to={`/exam/results/${finishedId}`} replace />;
  if (state === undefined || rules === undefined) return <div className="exam-screen min-h-dvh" />;
  if (!state) return <Navigate to="/exam" replace />;
  if (!rules) {
    return (
      <p className="exam-screen min-h-dvh p-6" role="alert">
        {t("exam.guideNeedRules")}
      </p>
    );
  }
  if (status === "error") {
    return (
      <div className="exam-screen min-h-dvh space-y-3 p-6">
        <p role="alert">{t("common.contentError")}</p>
        <Link to="/" className="btn btn-secondary">{t("nav.home")}</Link>
      </div>
    );
  }
  if (state.status === "submitted" || status !== "ready") return <div className="exam-screen min-h-dvh" />;

  const sec = activeSection(state)!;
  const qid = sec.questionIds[Math.min(state.position, sec.questionIds.length - 1)];
  const q = questionById[qid];
  const stim = q?.stimulus_id ? stimuli[q.stimulus_id] : undefined;
  const left = remainingMs(state, now);
  // "Finish this section" warns about the active section; "Finish and submit" warns about every section still open.
  const unansweredIn = (ids: string[]) => ids.filter((id) => state.answers[id] == null).length;
  const unansweredCount =
    confirm === "submit"
      ? unansweredIn(state.sections.slice(state.free ? 0 : state.current).flatMap((s) => s.questionIds))
      : unansweredIn(sec.questionIds);
  const isLast = state.current === state.sections.length - 1;
  const lowTime = left <= 60_000;
  const sectionName = sec.section === "READING" ? t("practice.reading") : t("practice.listening");
  const replayOk = q ? canPlayAudio(state, qid, rules) : false;
  const audioStatus = audio?.qid === qid ? audio.status : "idle";

  const choose = (pos: number) => persist(setAnswer(state, qid, pos, Date.now(), rules));
  const go = (i: number) => persist(moveTo(state, i, rules));
  const sectionLabel = (x: string) => (x === "READING" ? t("practice.reading") : t("practice.listening"));
  const switchTo = (i: number) => {
    stopAudio();
    persist(switchSection(state, i, Date.now(), rules));
  };

  const playAudio = () => {
    if (!stim?.audio_file || !replayOk || audioStatus === "playing") return;
    audioEl.current?.pause();
    const a = new Audio(audioSrc(stim.audio_file)); // normal speed only: no slow playback in the exam
    audioEl.current = a;
    setAudio({ qid, status: "playing" });
    // A play only counts once the sound really starts, so a network failure does not use up the one play.
    a.onplaying = () => {
      if (audioEl.current !== a) return;
      persist(recordPlay(stateRef.current ?? state, qid));
    };
    a.onended = () => setAudio((cur) => (cur?.qid === qid ? null : cur));
    a.onerror = () => setAudio({ qid, status: "error" });
    a.play().catch(() => setAudio({ qid, status: "error" }));
  };

  const doConfirm = () => {
    const n = Date.now();
    stopAudio();
    persist(confirm === "submit" ? submitExam(state, rules, n) : finishSection(state, rules, n));
    setConfirm(null);
  };

  const showNavigator = rules.allowBackNavigation && rules.allowFlagging;

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900" data-testid="exam-screen">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {state.free && state.sections.length > 1 ? (
              <div role="tablist" aria-label={t("exam.sectionLabel")} className="flex items-center gap-1.5">
                {state.sections.map((x, i) => {
                  const done = x.questionIds.filter((id) => state.answers[id] != null).length;
                  const active = i === state.current;
                  return (
                    <button
                      key={x.section}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => switchTo(i)}
                      data-testid={`section-tab-${x.section}`}
                      className={`min-h-9 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors sm:text-sm ${
                        active ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {sectionLabel(x.section)} {done}/{x.questionIds.length}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm font-bold text-zinc-800">{t("exam.sectionLabel")}: {sectionName}</p>
            )}
            <span
              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-800 sm:text-sm"
              data-testid="progress"
            >
              {t("exam.questionOf", { i: state.position + 1, n: sec.questionIds.length })}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
              lowTime ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-900"
            }`}
            role="timer"
            aria-label={t("exam.timeLeft")}
          >
            <span className="text-xs font-bold opacity-80">{t("exam.timeLeft")}</span>
            <span className="text-lg font-black tabular-nums sm:text-xl" data-testid="timer">{fmt(left)}</span>
          </div>
        </header>

        {notice && (
          <p role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 sm:px-6">
            {notice}{" "}
            <button type="button" className="min-h-9 underline" onClick={() => setNotice(null)}>{t("common.close")}</button>
          </p>
        )}

        <main className="flex-1 px-4 py-5 sm:px-6">
          <h1 className="sr-only">{t("exam.title")}</h1>
          {q && (
            <div className="space-y-5 lg:grid lg:grid-cols-[11fr_9fr] lg:items-start lg:gap-6 lg:space-y-0">
              <div className="space-y-4">
                {stim?.type === "PASSAGE" && stim.text_ko && (
                  <div className="whitespace-pre-line rounded-xl border border-zinc-200 border-l-4 border-l-blue-600 bg-white p-4 text-lg leading-relaxed text-zinc-900">
                    <Ko>{stim.text_ko}</Ko>
                  </div>
                )}
                {stim?.audio_file && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary min-h-12 border-blue-600 text-blue-700"
                      onClick={playAudio}
                      disabled={!replayOk || audioStatus === "playing"}
                      data-testid="play-audio"
                    >
                      {audioStatus === "playing" ? "🔊 " + t("exam.audioPlaying") : replayOk ? "▶ " + t("exam.playAudio") : t("exam.audioPlayed")}
                    </button>
                    {audioStatus === "error" && <p role="alert" className="mt-1 text-sm font-bold text-red-700">{t("exam.audioError")}</p>}
                  </div>
                )}
                <p className="whitespace-pre-line text-xl font-extrabold leading-relaxed text-zinc-900 sm:text-2xl" data-testid="stem">
                  <Ko>{q.stem_ko}</Ko>
                </p>
              </div>

              <ul className="space-y-2.5 lg:border-l lg:border-zinc-200 lg:pl-6">
                {q.options.map((o) => {
                  const sel = state.answers[qid] === o.position;
                  return (
                    <li key={o.position}>
                      <button
                        type="button"
                        onClick={() => choose(o.position)}
                        aria-pressed={sel}
                        data-testid={`option-${o.position}`}
                        className={`flex min-h-14 w-full cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-lg transition-colors ${
                          sel
                            ? "border-blue-600 bg-blue-50 text-blue-950"
                            : "border-zinc-200 bg-white text-zinc-900 hover:border-blue-500 hover:bg-zinc-50"
                        }`}
                      >
                        <span className={`font-extrabold ${sel ? "text-blue-700" : "text-zinc-600"}`}>{o.position}.</span>
                        <span className="flex-1 font-medium"><Ko>{o.text_ko}</Ko></span>
                        {sel && <span aria-hidden="true" className="font-bold text-blue-600">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {showNavigator && (
            <nav aria-label={t("exam.navigator")} className="mt-8 border-t border-zinc-200 pt-5">
              <p className="mb-1 text-sm font-bold text-zinc-800">{t("exam.navigator")}</p>
              <p className="mb-3 text-xs text-zinc-500">■ {t("exam.answeredState")} · □ {t("exam.unansweredState")} · ⚑ {t("exam.flaggedState")}</p>
              <ol className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {sec.questionIds.map((id, i) => {
                  const answered = state.answers[id] != null;
                  const flagged = state.flags.includes(id);
                  const current = i === state.position;
                  const label = `${i + 1}: ${answered ? t("exam.answeredState") : t("exam.unansweredState")}${flagged ? ", " + t("exam.flaggedState") : ""}${current ? ", " + t("exam.currentState") : ""}`;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-label={label}
                        aria-current={current ? "true" : undefined}
                        onClick={() => go(i)}
                        data-testid={`nav-${i + 1}`}
                        className={`relative flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                          answered
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                        } ${current ? "ring-2 ring-amber-500" : ""}`}
                      >
                        {i + 1}
                        {flagged && <span aria-hidden="true" className="absolute -top-1.5 -right-1 text-sm text-red-600">⚑</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </main>

        <footer className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6">
          {rules.allowBackNavigation && (
            <button type="button" className="btn btn-secondary" onClick={() => go(state.position - 1)} disabled={state.position === 0} data-testid="prev">
              ← {t("common.previous")}
            </button>
          )}
          {rules.allowFlagging && (
            <button
              type="button"
              className={`btn ${state.flags.includes(qid) ? "border-amber-400 bg-amber-50 text-amber-900" : "btn-secondary"}`}
              aria-pressed={state.flags.includes(qid)}
              onClick={() => persist(toggleFlag(state, qid))}
              data-testid="flag"
            >
              {state.flags.includes(qid) ? "⚑ " + t("exam.unflag") : "⚐ " + t("exam.flag")}
            </button>
          )}
          {rules.allowEarlyFinishSection && !isLast && !state.free && (
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm("section")} data-testid="finish-section">
              {t("exam.finishSection")}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => setConfirm("submit")} data-testid="finish-exam">
            {t("exam.finishExam")}
          </button>
          <button
            type="button"
            className="btn btn-primary ml-auto flex-1 sm:flex-initial sm:min-w-36"
            onClick={() => go(state.position + 1)}
            disabled={state.position >= sec.questionIds.length - 1}
            data-testid="next"
          >
            {t("common.next")} →
          </button>
        </footer>
      </div>

      {confirm && (
        <Modal title={confirm === "submit" ? t("exam.finishExam") : t("exam.finishSection")} onClose={() => setConfirm(null)}>
          <p className="mb-2">{confirm === "submit" ? t("exam.confirmSubmit") : t("exam.confirmSection", { section: sectionName })}</p>
          {unansweredCount > 0 && <p className="mb-3 font-bold text-amber-800">{t("exam.unansweredWarn", { n: unansweredCount })}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirm(null)}>{t("common.cancel")}</button>
            <button type="button" className="btn btn-primary flex-1" onClick={doConfirm} data-testid="confirm">{t("common.confirm")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}