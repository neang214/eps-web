import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { mixedQuiz, patternQuiz } from "../lib/grammarQuiz";
import { useQuizResults } from "../lib/learned";
import { useContent, useSettings } from "../store";
import { Ko, PageTitle, Tr } from "../components/ui";

const MIXED_COUNT = 10;

/** Grammar quiz: pick the meaning of an example sentence. One pattern (?p=G-0001) or a mix (optionally ?c=particle). */
export default function GrammarQuizPage() {
  const { t, lang } = useSettings();
  const { grammar, status } = useContent();
  const [params] = useSearchParams();
  const patternId = params.get("p");
  const category = params.get("c") ?? undefined;
  const { save } = useQuizResults();
  const [seed, setSeed] = useState(() => Date.now() % 1_000_000);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(() => {
    if (status !== "ready") return [];
    const one = patternId ? grammar.find((g) => g.id === patternId) : undefined;
    return one ? patternQuiz(one, grammar, seed) : mixedQuiz(grammar, MIXED_COUNT, seed, category);
  }, [grammar, status, patternId, category, seed]);

  const q = questions[index];
  const pattern = q ? grammar.find((g) => g.id === q.patternId) : undefined;
  const optionText = (o: { km: string; en: string }) => (lang === "km" ? o.km : o.en);

  // A finished one-pattern quiz is saved once, so the pattern shows its best score.
  useEffect(() => {
    if (finished && patternId && questions.length > 0) void save(patternId, correct, questions.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const again = () => {
    setSeed((s) => s + 1);
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
  };

  return (
    <div className="space-y-5">
      <Link to="/lessons/grammar" className="link-target -ml-1 text-sm">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("grammar.quizBack")}
      </Link>
      <PageTitle>{t("grammar.quiz")}</PageTitle>

      {status === "ready" && questions.length === 0 && <p className="card muted">{t("grammar.quizNone")}</p>}

      {finished && (
        <div className="card space-y-4 text-center" data-testid="quiz-result">
          <p role="status" className="text-xl font-bold text-zinc-900">{t("grammar.quizResult", { c: correct, n: questions.length })}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn btn-primary" onClick={again} data-testid="quiz-again">{t("grammar.quizAgain")}</button>
            <Link to="/lessons/grammar" className="btn btn-secondary">{t("grammar.quizBack")}</Link>
          </div>
        </div>
      )}

      {!finished && q && (
        <div className="card space-y-4" data-testid="quiz-card">
          <p className="muted text-sm font-semibold">{t("grammar.quizOf", { i: index + 1, n: questions.length })}</p>
          <blockquote className="rounded-xl border border-zinc-200 border-l-4 border-l-indigo-600 bg-zinc-50 p-4 text-lg font-semibold text-zinc-900">
            <Ko>{q.ko}</Ko>
          </blockquote>
          <p className="text-sm font-semibold text-zinc-700">{t("grammar.quizQuestion")}</p>
          <ul className="space-y-2">
            {q.options.map((o, i) => {
              const answered = picked !== null;
              const state = !answered
                ? "border-zinc-200 bg-white text-zinc-900 hover:border-indigo-600 hover:bg-zinc-50"
                : i === q.correct
                  ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                  : i === picked
                    ? "border-red-600 bg-red-50 text-red-800"
                    : "border-zinc-200 bg-white text-zinc-500 opacity-65";
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={answered}
                    data-testid={`quiz-option-${i}`}
                    className={`flex min-h-13 w-full cursor-pointer items-start rounded-xl border-2 px-4 py-3 text-left transition-all disabled:cursor-default ${state}`}
                    onClick={() => {
                      setPicked(i);
                      if (i === q.correct) setCorrect((c) => c + 1);
                    }}
                  >
                    <Tr lang={lang}>{optionText(o)}</Tr>
                  </button>
                </li>
              );
            })}
          </ul>
          {picked !== null && (
            <div className="space-y-3">
              <p role="status" className={`rounded-xl border p-3 text-sm font-semibold ${picked === q.correct ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {picked === q.correct ? t("grammar.quizRight") : t("grammar.quizWrong")}
              </p>
              {pattern && (
                <p className="muted text-sm">
                  {t("grammar.quizPattern")}: <Ko className="font-bold text-zinc-900">{pattern.pattern}</Ko>
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary w-full"
                data-testid="quiz-next"
                onClick={() => {
                  if (index + 1 < questions.length) {
                    setIndex(index + 1);
                    setPicked(null);
                  } else setFinished(true);
                }}
              >
                {index + 1 < questions.length ? t("common.next") : t("common.finish")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
