import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import { isLearned, learnedCount, useLearned } from "../lib/learned";
import { LearnedButton } from "./Hangul";
import { useContent, useSettings } from "../store";
import { AudioButton } from "../components/Audio";
import { Ko, PageTitle, ProgressBar, Tr } from "../components/ui";
import { NUMBER_GROUPS, type NumberGroup } from "../types";

export default function NumbersPage() {
  const { t, lang } = useSettings();
  const { numbers, status } = useContent();
  const [group, setGroup] = useState<NumberGroup>("sino");
  const items = numbers.filter((n) => n.group === group);
  const { learned, toggle } = useLearned();
  const done = learnedCount(learned, "numbers", numbers.map((n) => n.id));

  return (
    <div className="space-y-5">
      <Link to="/lessons" className="link-target -ml-1 text-sm">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("lessons.title")}
      </Link>
      <PageTitle>{t("numbers.title")}</PageTitle>
      <p className="text-zinc-700">{t("numbers.intro")}</p>

      {numbers.length > 0 && <ProgressBar value={done} total={numbers.length} label={t("learn.progress", { d: done, n: numbers.length })} />}

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("numbers.groupFilter")}>
        {NUMBER_GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
            className={`btn min-h-9 rounded-full px-3.5 py-1.5 text-xs ${group === g ? "btn-primary" : "btn-secondary"}`}
            data-testid={`numbers-tab-${g}`}
          >
            {t(`numbers.group.${g}`)}
          </button>
        ))}
      </div>
      <p className="muted text-sm">{t(`numbers.groupHelp.${group}`)}</p>

      {status === "error" && (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">{t("common.contentError")}</p>
      )}
      {status === "ready" && numbers.length === 0 && <p className="card muted">{t("numbers.none")}</p>}

      <ul className="grid grid-cols-1 gap-3">
        {items.map((n) => {
          const note = lang === "km" ? n.note_km : n.note_en;
          const wide = n.group === "counter" || n.group === "usage";
          return (
            <li key={n.id} className="card space-y-2" data-testid={`number-${n.id}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="muted block text-xs font-bold uppercase tracking-wider">{n.written}</span>
                  <span className={`block font-extrabold text-zinc-900 ${wide ? "text-xl" : "text-3xl"}`}><Ko>{n.korean}</Ko></span>
                  <span className="muted block text-sm"><Tr lang={lang}>{lang === "km" ? n.km : n.en}</Tr></span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {isLearned(learned, "numbers", n.id) && <Check aria-label={t("learn.marked")} className="h-5 w-5 text-emerald-700" />}
                  <AudioButton file={n.audio_file} slow label={t("numbers.listen")} />
                </span>
              </div>
              {note && (
                <p className="rounded-xl bg-zinc-50 p-2.5 text-sm text-zinc-700"><Tr lang={lang}>{note}</Tr></p>
              )}
              <LearnedButton on={isLearned(learned, "numbers", n.id)} onClick={() => toggle("numbers", n.id)} id={n.id} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
