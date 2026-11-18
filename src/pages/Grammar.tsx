import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useQuizResults } from "../lib/learned";
import { filterGrammar, type CategoryFilter, type LevelFilter } from "../lib/grammar";
import { useContent, useSettings } from "../store";
import { Ko, PageTitle, Tr } from "../components/ui";
import { GRAMMAR_CATEGORIES, type GrammarPattern } from "../types";

const LEVELS: LevelFilter[] = ["all", 1, 2, 3];
const CATEGORIES: CategoryFilter[] = ["all", ...GRAMMAR_CATEGORIES];

const pickLang = (g: GrammarPattern, field: "title" | "form" | "explanation", lang: "km" | "en") =>
  lang === "km" ? g[`${field}_km`] : g[`${field}_en`];

export default function GrammarPage() {
  const { t, lang } = useSettings();
  const { grammar, status } = useContent();
  const other = lang === "km" ? "en" : "km";
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const quiz = useQuizResults();

  const results = useMemo(() => filterGrammar(grammar, { query, level, category }), [grammar, query, level, category]);

  const chip = (active: boolean) => `btn min-h-9 rounded-full px-3.5 py-1.5 text-xs ${active ? "btn-primary" : "btn-secondary"}`;

  return (
    <div className="space-y-5">
      <Link to="/lessons" className="link-target -ml-1 text-sm">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("lessons.title")}
      </Link>
      <PageTitle>{t("grammar.title")}</PageTitle>

      <div className="card space-y-3 bg-zinc-50 p-4">
        <label className="block">
          <span className="sr-only">{t("grammar.search")}</span>
          <input type="search" className="field" placeholder={t("grammar.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("grammar.levelFilter")}>
          {LEVELS.map((l) => (
            <button key={String(l)} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)}>
              {l === "all" ? t("grammar.all") : t("grammar.level", { n: l })}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("grammar.categoryFilter")}>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
              {c === "all" ? t("grammar.all") : t(`grammar.cat.${c}`)}
            </button>
          ))}
        </div>
      </div>

      {grammar.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/lessons/grammar/quiz" className="btn btn-primary" data-testid="quiz-all">{t("grammar.quizAll")}</Link>
          {category !== "all" && (
            <Link to={`/lessons/grammar/quiz?c=${category}`} className="btn btn-secondary" data-testid="quiz-category">{t("grammar.quizCategory")}</Link>
          )}
        </div>
      )}

      {status === "error" && (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">
          {t("common.contentError")}
        </p>
      )}
      {status === "ready" && (
        <p className="muted text-sm font-medium" role="status">
          {grammar.length === 0 ? t("grammar.none") : results.length === 0 ? t("grammar.noResults") : t("grammar.count", { n: results.length })}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3">
        {results.map((g) => {
          const isOpen = open === g.id;
          return (
            <li key={g.id} className="card self-start">
              <button
                type="button"
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : g.id)}
              >
                <span className="min-w-0">
                  <span className="block text-lg font-bold text-zinc-900"><Ko>{g.pattern}</Ko></span>
                  <span className="muted block text-sm"><Tr lang={lang}>{pickLang(g, "title", lang)}</Tr></span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800">{t("grammar.level", { n: g.level })}</span>
                    <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">{t(`grammar.cat.${g.category}`)}</span>
                    {quiz.results[g.id] && (
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {t("grammar.quizBest", { b: quiz.results[g.id].best, n: quiz.results[g.id].total })}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3">
                  <p className="muted text-sm"><Tr lang={other}>{pickLang(g, "title", other)}</Tr></p>
                  <section className="rounded-xl bg-zinc-50 p-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("grammar.form")}</h2>
                    <p className="mt-1 font-semibold text-zinc-900"><Tr lang={lang}>{pickLang(g, "form", lang)}</Tr></p>
                    <p className="muted text-sm"><Tr lang={other}>{pickLang(g, "form", other)}</Tr></p>
                  </section>
                  <section className="rounded-xl bg-zinc-50 p-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("grammar.meaning")}</h2>
                    <p className="mt-1 text-zinc-900"><Tr lang={lang}>{pickLang(g, "explanation", lang)}</Tr></p>
                    <p className="muted text-sm"><Tr lang={other}>{pickLang(g, "explanation", other)}</Tr></p>
                  </section>
                  <section>
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">{t("grammar.examples")}</h2>
                    <ol className="space-y-2">
                      {g.examples.map((ex, i) => (
                        <li key={i} className="rounded-xl border border-zinc-200 p-3">
                          <p className="text-base font-semibold text-zinc-900"><Ko>{ex.ko}</Ko></p>
                          <p className="muted text-sm"><Tr lang="km">{ex.km}</Tr></p>
                          <p className="muted text-sm"><Tr lang="en">{ex.en}</Tr></p>
                        </li>
                      ))}
                    </ol>
                  </section>
                  <Link to={`/lessons/grammar/quiz?p=${g.id}`} className="btn btn-secondary w-full" data-testid={`quiz-${g.id}`}>{t("grammar.quizOne")}</Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
