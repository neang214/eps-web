import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookA, ChevronLeft, ChevronRight, Hash, Languages, MessagesSquare, Mic, Type, type LucideIcon } from "lucide-react";
import { dbPut } from "../lib/db";
import { pick, OTHER_LANG } from "../lib/i18n";
import { learnedCount, useLearned, useQuizResults } from "../lib/learned";
import { useStore, type LessonRecord } from "../lib/hooks";
import { useContent, useSettings } from "../store";
import { AudioButton, DialoguePlayer } from "../components/Audio";
import { QuestionCard } from "../components/QuestionCard";
import { Ko, PageTitle, Tr } from "../components/ui";

/** Lessons home: four things to learn, in the order a beginner needs them, plus the situation lessons. */
export function LessonsHub() {
  const { t } = useSettings();
  const { vocab, grammar, hangul, numbers, units } = useContent();
  const lessons = useStore<LessonRecord>("lessons");
  const { learned } = useLearned();
  const quiz = useQuizResults();
  const hangulDone = learnedCount(learned, "hangul", hangul.map((h) => h.id));
  const numbersDone = learnedCount(learned, "numbers", numbers.map((n) => n.id));
  const quizzed = grammar.filter((g) => quiz.results[g.id]).length;
  const doneUnits = lessons.items.filter((l) => units.some((u) => u.id === l.unitId)).length;
  const cards: { to: string; icon: LucideIcon; title: string; desc: string; count: string; testid: string }[] = [
    { to: "/lessons/hangul", icon: Type, title: t("lessons.hubHangul"), desc: t("lessons.hubHangulDesc"), count: t("learn.progress", { d: hangulDone, n: hangul.length }), testid: "hub-hangul" },
    { to: "/lessons/numbers", icon: Hash, title: t("lessons.hubNumbers"), desc: t("lessons.hubNumbersDesc"), count: t("learn.progress", { d: numbersDone, n: numbers.length }), testid: "hub-numbers" },
    { to: "/lessons/words", icon: BookA, title: t("lessons.hubWords"), desc: t("lessons.hubWordsDesc"), count: t("vocab.wordsCount", { n: vocab.length }), testid: "hub-words" },
    { to: "/lessons/grammar", icon: Languages, title: t("lessons.hubGrammar"), desc: t("lessons.hubGrammarDesc"), count: quizzed > 0 ? `${t("grammar.count", { n: grammar.length })} · ${t("grammar.quizCount", { d: quizzed, n: grammar.length })}` : t("grammar.count", { n: grammar.length }), testid: "hub-grammar" },
    { to: "/lessons/situations", icon: MessagesSquare, title: t("lessons.hubSituations"), desc: t("lessons.hubSituationsDesc"), count: t("lessons.hubCountDone", { d: doneUnits, n: units.length }), testid: "hub-situations" },
    { to: "/lessons/interview", icon: Mic, title: t("lessons.hubInterview"), desc: t("lessons.hubInterviewDesc"), count: t("interview.commandsTab"), testid: "hub-interview" },
  ];
  return (
    <div className="space-y-5">
      <PageTitle>{t("lessons.title")}</PageTitle>
      <ol className="grid grid-cols-1 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <li key={c.to}>
              <Link to={c.to} className="card flex h-full items-center gap-4 hover:border-indigo-600" data-testid={c.testid}>
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-800">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="muted block text-xs font-bold uppercase tracking-wider">{i + 1}</span>
                  <span className="block text-lg font-bold text-zinc-900">{c.title}</span>
                  <span className="muted block text-sm">{c.desc}</span>
                  <span className="mt-1 block text-xs font-semibold text-indigo-800">{c.count}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SituationsList() {
  const { t, lang } = useSettings();
  const { units, status } = useContent();
  const lessons = useStore<LessonRecord>("lessons");
  const done = new Set(lessons.items.map((l) => l.unitId));

  return (
    <div className="space-y-5">
      <Link to="/lessons" className="link-target -ml-1 text-sm">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("lessons.title")}
      </Link>
      <PageTitle>{t("lessons.hubSituations")}</PageTitle>
      {status === "error" && (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">
          {t("common.contentError")}
        </p>
      )}
      {status === "ready" && units.length === 0 && <p className="card muted">{t("lessons.noUnits")}</p>}
      <ul className="grid grid-cols-1 gap-4">
        {units.map((u) => {
          const isDone = done.has(u.id);
          return (
            <li key={u.id}>
              <Link
                to={`/lessons/situations/${u.id}`}
                className="card flex h-full flex-col justify-between gap-3 hover:border-indigo-600"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600">
                      {t("lessons.unit")} {u.order}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isDone
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {isDone ? "✓ " + t("lessons.done") : t("lessons.notDone")}
                    </span>
                  </div>
                  <span className="mt-3 block text-xl font-bold text-zinc-900">
                    <Ko>{u.title_ko}</Ko>
                  </span>
                  <span className="muted mt-1 block text-sm">
                    <Tr lang={lang}>{pick(u, "title", lang)}</Tr>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Check({ unitId, questionIds }: { unitId: string; questionIds: string[] }) {
  const { t } = useSettings();
  const { questionById } = useContent();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const qs = questionIds.map((id) => questionById[id]).filter(Boolean);

  if (!started) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setStarted(true)} disabled={qs.length === 0}>
        {t("lessons.startCheck")}
      </button>
    );
  }
  if (finished) {
    return (
      <p role="status" className="card border-emerald-200 bg-emerald-50 font-semibold text-emerald-800">
        {t("lessons.checkResult", { c: correct, t: qs.length })}
      </p>
    );
  }

  const next = async (finalCorrect: number) => {
    if (index + 1 < qs.length) {
      setIndex(index + 1);
      setAnswered(false);
      return;
    }
    // A lesson counts as completed once its 5-question check is finished.
    const rec: LessonRecord = { unitId, completedAt: Date.now(), correct: finalCorrect, total: qs.length };
    await dbPut("lessons", rec);
    setFinished(true);
  };

  return (
    <div className="space-y-3">
      <p className="muted text-sm font-semibold">
        {index + 1} / {qs.length}
      </p>
      <QuestionCard
        key={qs[index].id}
        question={qs[index]}
        showFlag={false}
        onAnswered={(_p, ok) => {
          setAnswered(true);
          if (ok) setCorrect((c) => c + 1);
        }}
      />
      {answered && (
        <button type="button" className="btn btn-primary w-full" onClick={() => void next(correct)}>
          {index + 1 < qs.length ? t("common.next") : t("common.finish")}
        </button>
      )}
    </div>
  );
}

export function UnitPage() {
  const { unitId } = useParams();
  const { t, lang } = useSettings();
  const { units, vocabById } = useContent();
  const unit = units.find((u) => u.id === unitId);
  if (!unit) return <p className="card muted">{t("lessons.noUnits")}</p>;
  const other = OTHER_LANG[lang];

  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-200 pb-4">
        <Link to="/lessons/situations" className="link-target mb-2 text-sm">
          ← {t("common.back")}
        </Link>
        <PageTitle>
          <Ko>{unit.title_ko}</Ko>
        </PageTitle>
        <p className="muted text-lg">
          <Tr lang={lang}>{pick(unit, "title", lang)}</Tr>
        </p>
      </div>

      <section aria-labelledby="u-words" className="space-y-3">
        <h2 id="u-words" className="text-xl font-bold tracking-tight text-zinc-900">
          {t("lessons.words")}
        </h2>
        <ul className="grid grid-cols-1 gap-3">
          {unit.vocab_ids
            .map((id) => vocabById[id])
            .filter(Boolean)
            .map((v) => (
              <li key={v.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-zinc-900">
                    <Ko>{v.korean}</Ko>
                  </p>
                  <p className="muted text-sm">
                    <Tr lang={lang}>{pick(v, "", lang) || (lang === "km" ? v.km : v.en)}</Tr>
                  </p>
                </div>
                {v.audio_file && <AudioButton file={v.audio_file} label={t("common.play")} />}
              </li>
            ))}
        </ul>
      </section>

      <section aria-labelledby="u-grammar" className="space-y-3">
        <h2 id="u-grammar" className="text-xl font-bold tracking-tight text-zinc-900">
          {t("lessons.grammar")}
        </h2>
        <div className="card space-y-2 border-l-4 border-l-indigo-600">
          <p className="text-lg font-bold text-zinc-900">
            <Ko>{unit.grammar.ko}</Ko>
          </p>
          <p className="text-zinc-900">
            <Tr lang={lang}>{unit.grammar[lang]}</Tr>
          </p>
          <p className="muted text-sm">
            <Tr lang={other}>{unit.grammar[other]}</Tr>
          </p>
        </div>
      </section>

      <section aria-labelledby="u-dialogue" className="space-y-3">
        <h2 id="u-dialogue" className="text-xl font-bold tracking-tight text-zinc-900">
          {t("lessons.dialogue")}
        </h2>
        <DialoguePlayer lines={unit.dialogue.lines} />
      </section>

      <section aria-labelledby="u-check" className="space-y-3">
        <h2 id="u-check" className="text-xl font-bold tracking-tight text-zinc-900">
          {t("lessons.check")}
        </h2>
        <Check unitId={unit.id} questionIds={unit.check_question_ids} />
      </section>
    </div>
  );
}