import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dbPut } from "../lib/db";
import { useStore } from "../lib/hooks";
import { isDue, newCard, review, type Card, type Grade } from "../lib/sm2";
import { groupByIndustry, pageCount, searchWords, WORD_PAGE, wordsOf } from "../lib/words";
import { useContent, useSettings } from "../store";
import { AudioButton } from "../components/Audio";
import { Ko, PageTitle, Tr } from "../components/ui";
import { INDUSTRY_TAGS, type VocabItem } from "../types";

const meaning = (v: VocabItem, lang: "km" | "en") => (lang === "km" ? v.km : v.en);

function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="link-target -ml-1 text-sm">
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useSettings();
  return (
    <label className="block">
      <span className="sr-only">{t("vocab.search")}</span>
      <input type="search" className="field" placeholder={t("vocab.search")} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function WordCard({ v, open, onToggle }: { v: VocabItem; open: boolean; onToggle: () => void }) {
  const { t, lang } = useSettings();
  const other = lang === "km" ? "en" : "km";
  return (
    <li className="card self-start">
      <button type="button" className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left" aria-expanded={open} onClick={onToggle}>
        <span>
          <span className="block text-lg font-bold text-zinc-900"><Ko>{v.korean}</Ko></span>
          <span className="muted block text-sm"><Tr lang={lang}>{meaning(v, lang)}</Tr></span>
        </span>
        <span aria-hidden="true" className="muted text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
          <p className="muted text-sm"><Tr lang={other}>{meaning(v, other)}</Tr></p>
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("vocab.example")}</p>
            <p className="mt-1 text-base font-semibold text-zinc-900"><Ko>{v.example_ko}</Ko></p>
            <p className="muted text-sm"><Tr lang="km">{v.example_km}</Tr></p>
            <p className="muted text-sm"><Tr lang="en">{v.example_en}</Tr></p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="flex flex-wrap gap-1.5">
              {v.industry_tags.map((x) => (
                <span key={x} className="rounded-md bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">{t(`tags.${x}`)}</span>
              ))}
            </p>
            {v.audio_file && <AudioButton file={v.audio_file} />}
          </div>
        </div>
      )}
    </li>
  );
}

function Pager({ page, pages, total, onPage, id }: { page: number; pages: number; total: number; onPage: (p: number) => void; id: string }) {
  const { t } = useSettings();
  const from = (page - 1) * WORD_PAGE + 1;
  const to = Math.min(page * WORD_PAGE, total);
  return (
    <nav className="card space-y-3 p-3 text-center" aria-label={t("vocab.pages")} data-testid={`pager-${id}`}>
      <p className="muted text-sm" role="status">
        {t("vocab.range", { from, to, total })}
      </p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn btn-secondary shrink-0" disabled={page <= 1} onClick={() => onPage(page - 1)} data-testid={`prev-${id}`}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t("common.previous")}
        </button>
        <label className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="sr-only">{t("vocab.goToPage")}</span>
          <select className="field min-h-11 w-auto py-1" value={page} onChange={(e) => onPage(Number(e.target.value))} data-testid={`page-select-${id}`}>
            {Array.from({ length: pages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {t("vocab.pageOf", { p: i + 1, n: pages })}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-secondary shrink-0" disabled={page >= pages} onClick={() => onPage(page + 1)} data-testid={`next-${id}`}>
          {t("common.next")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function WordList({ words }: { words: VocabItem[] }) {
  const { t } = useSettings();
  const { status } = useContent();
  const [open, setOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);
  // A new list (other industry or a new search) starts again on page 1.
  useEffect(() => setPage(1), [words]);
  if (status === "ready" && words.length === 0) return <p className="card muted">{t("vocab.noResults")}</p>;
  const pages = pageCount(words.length);
  const current = Math.min(page, pages);
  const go = (p: number) => {
    setPage(p);
    setOpen(null);
    top.current?.scrollIntoView({ block: "start" });
  };
  return (
    <div className="space-y-3" ref={top}>
      {pages > 1 && <Pager page={current} pages={pages} total={words.length} onPage={go} id="top" />}
      <ul className="grid grid-cols-1 gap-3">
        {words.slice((current - 1) * WORD_PAGE, current * WORD_PAGE).map((v) => (
          <WordCard key={v.id} v={v} open={open === v.id} onToggle={() => setOpen(open === v.id ? null : v.id)} />
        ))}
      </ul>
      {pages > 1 && <Pager page={current} pages={pages} total={words.length} onPage={go} id="bottom" />}
    </div>
  );
}

/** Words home: one card per industry, plus search across every word. */
export function VocabPage() {
  const { t } = useSettings();
  const { vocab, status } = useContent();
  const cards = useStore<Card>("cards");
  const [q, setQ] = useState("");

  const now = Date.now();
  const cardById = useMemo(() => new Map(cards.items.map((c) => [c.id, c])), [cards.items]);
  const groups = useMemo(() => groupByIndustry(vocab, cardById, now), [vocab, cardById, now]);
  const dueAll = vocab.filter((v) => isDue(cardById.get(v.id), now)).length;
  const searching = q.trim() !== "";
  const results = useMemo(() => searchWords(vocab, q), [vocab, q]);

  return (
    <div className="space-y-5">
      <BackLink to="/lessons">{t("lessons.title")}</BackLink>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <PageTitle>{t("vocab.title")}</PageTitle>
        <Link to="/lessons/words/review" className="btn btn-primary shrink-0">
          {t("vocab.review")} ({t("vocab.dueCount", { n: dueAll })})
        </Link>
      </div>

      <div className="card space-y-3 bg-zinc-50 p-4">
        <SearchBox value={q} onChange={setQ} />
      </div>

      {status === "error" && (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">{t("common.contentError")}</p>
      )}

      {searching ? (
        <WordList words={results} />
      ) : (
        status === "ready" && (
          <>
            <h2 className="text-lg font-bold text-zinc-900">{t("vocab.byIndustry")}</h2>
            <ul className="grid grid-cols-1 gap-3">
              <li>
                <Link to="/lessons/words/all" className="card flex h-full items-center justify-between gap-3 hover:border-indigo-600" data-testid="industry-all">
                  <span>
                    <span className="block font-bold text-zinc-900">{t("vocab.allWords")}</span>
                    <span className="muted block text-sm">{t("vocab.wordsCount", { n: vocab.length })}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
                </Link>
              </li>
              {groups.map((g) => {
                const empty = g.words.length === 0;
                const body = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-zinc-900">{t(`tags.${g.tag}`)}</span>
                      {empty ? (
                        <span className="muted block text-sm">{t("vocab.comingSoon")}</span>
                      ) : (
                        <>
                          <span className="muted block text-sm">
                            {t("vocab.wordsCount", { n: g.words.length })} · {t("vocab.dueShort", { n: g.due })}
                          </span>
                          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
                            <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${Math.round((g.reviewed / g.words.length) * 100)}%` }} />
                          </span>
                          <span className="muted mt-1 block text-xs">{t("vocab.reviewedShort", { r: g.reviewed, n: g.words.length })}</span>
                        </>
                      )}
                    </span>
                    {!empty && <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />}
                  </>
                );
                return (
                  <li key={g.tag}>
                    {empty ? (
                      <div className="card flex h-full items-center justify-between gap-3 opacity-70" data-testid={`industry-${g.tag}`}>{body}</div>
                    ) : (
                      <Link to={`/lessons/words/${g.tag}`} className="card flex h-full items-center justify-between gap-3 hover:border-indigo-600" data-testid={`industry-${g.tag}`}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="muted text-sm">{t("vocab.overlapNote")}</p>
          </>
        )
      )}
    </div>
  );
}

/** The words of one industry (or all words), with a review button for just those words. */
export function WordsByIndustry() {
  const { t } = useSettings();
  const { tag = "all" } = useParams();
  const { vocab } = useContent();
  const cards = useStore<Card>("cards");
  const [q, setQ] = useState("");
  const known = tag === "all" || (INDUSTRY_TAGS as readonly string[]).includes(tag);
  const inGroup = useMemo(() => wordsOf(vocab, known ? tag : "all"), [vocab, tag, known]);
  const results = useMemo(() => searchWords(inGroup, q), [inGroup, q]);
  const now = Date.now();
  const cardById = new Map(cards.items.map((c) => [c.id, c]));
  const due = inGroup.filter((v) => isDue(cardById.get(v.id), now)).length;
  const title = tag === "all" || !known ? t("vocab.allWords") : t(`tags.${tag}`);

  return (
    <div className="space-y-5">
      <BackLink to="/lessons/words">{t("vocab.title")}</BackLink>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <PageTitle>{title}</PageTitle>
        <Link to={`/lessons/words/review?tag=${known ? tag : "all"}`} className="btn btn-primary shrink-0" data-testid="review-industry">
          {t("vocab.review")} ({t("vocab.dueCount", { n: due })})
        </Link>
      </div>
      <div className="card space-y-3 bg-zinc-50 p-4">
        <SearchBox value={q} onChange={setQ} />
      </div>
      <WordList words={results} />
    </div>
  );
}

export function VocabReview() {
  const { t } = useSettings();
  const { vocab: allVocab, vocabById, status } = useContent();
  const [params] = useSearchParams();
  const tag = params.get("tag") ?? "all";
  const vocab = useMemo(() => wordsOf(allVocab, tag), [allVocab, tag]);
  const cards = useStore<Card>("cards");
  const [queue, setQueue] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [total, setTotal] = useState(0);
  const [seen, setSeen] = useState(0);
  const retried = useRef(new Set<string>());

  if (status !== "ready" || !cards.loaded) return null;

  if (queue === null) {
    const now = Date.now();
    const cardById = new Map(cards.items.map((c) => [c.id, c]));
    const due = vocab.filter((v) => isDue(cardById.get(v.id), now)).map((v) => v.id);
    // Reviewed cards that are due come first, then new words.
    due.sort((a, b) => Number(!!cardById.get(b)) - Number(!!cardById.get(a)));
    setQueue(due);
    setTotal(due.length);
    return null;
  }

  const currentId = queue[0];
  const v = currentId ? vocabById[currentId] : undefined;
  if (!v) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageTitle>{t("vocab.review")}</PageTitle>
        <p role="status" className="card border-emerald-200 bg-emerald-50 font-semibold text-emerald-800">
          {t("vocab.reviewDone")}
        </p>
        <Link to="/lessons/words" className="btn btn-secondary">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const grade = async (g: Grade) => {
    const now = Date.now();
    const existing = cards.items.find((c) => c.id === v.id) ?? newCard(v.id, now);
    const updated = review(existing, g, now);
    await dbPut("cards", updated);
    await cards.refresh();
    setSeen((s) => s + 1);
    setRevealed(false);
    // An "Again" word comes back once more in this session.
    const rest = queue.slice(1);
    if (g === "again" && !retried.current.has(v.id)) {
      retried.current.add(v.id);
      rest.push(v.id);
    }
    setQueue(rest);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>{t("vocab.review")}</PageTitle>
        <p className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-700">
          {t("vocab.cardOf", { i: Math.min(seen + 1, total), n: total })}
        </p>
      </div>

      <section className="card space-y-5 p-6 text-center sm:p-10" aria-live="polite">
        <p className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
          <Ko>{v.korean}</Ko>
        </p>
        {v.audio_file && (
          <div className="flex justify-center">
            <AudioButton file={v.audio_file} />
          </div>
        )}
        {revealed ? (
          <div className="space-y-3 border-t border-zinc-200 pt-5 text-left">
            <p className="text-xl font-bold text-zinc-900">
              <Tr lang="km">{v.km}</Tr>
            </p>
            <p className="text-lg font-medium text-zinc-600">
              <Tr lang="en">{v.en}</Tr>
            </p>
            <div className="mt-4 rounded-xl bg-zinc-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("vocab.example")}</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                <Ko>{v.example_ko}</Ko>
              </p>
              <p className="muted text-sm">
                <Tr lang="km">{v.example_km}</Tr>
              </p>
              <p className="muted text-sm">
                <Tr lang="en">{v.example_en}</Tr>
              </p>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary w-full py-3" onClick={() => setRevealed(true)}>
            {t("vocab.showAnswer")}
          </button>
        )}
      </section>

      {revealed && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(["again", "hard", "good", "easy"] as Grade[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`btn py-3 ${g === "again" ? "btn-danger" : g === "good" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => void grade(g)}
            >
              {t(`vocab.${g}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}