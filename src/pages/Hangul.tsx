import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { isLearned, learnedCount, useLearned } from "../lib/learned";
import { useContent, useSettings } from "../store";
import { AudioButton } from "../components/Audio";
import { Ko, PageTitle, ProgressBar, Tr } from "../components/ui";
import { HANGUL_GROUPS, type HangulGroup } from "../types";

export function LearnedButton({ on, onClick, id }: { on: boolean; onClick: () => void; id: string }) {
  const { t } = useSettings();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-testid={`learned-${id}`}
      className={`btn w-full ${on ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "btn-secondary"}`}
    >
      {on ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
      {on ? t("learn.marked") : t("learn.mark")}
    </button>
  );
}

export default function HangulPage() {
  const { t, lang } = useSettings();
  const { hangul, status } = useContent();
  const [open, setOpen] = useState<string | null>(null);
  const { learned, toggle } = useLearned();
  const done = learnedCount(learned, "hangul", hangul.map((h) => h.id));
  const other = lang === "km" ? "en" : "km";

  return (
    <div className="space-y-6">
      <Link to="/lessons" className="link-target -ml-1 text-sm">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t("lessons.title")}
      </Link>
      <PageTitle>{t("hangul.title")}</PageTitle>
      <p className="text-zinc-700">{t("hangul.intro")}</p>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">{t("hangul.khmerNote")}</p>

      {hangul.length > 0 && <ProgressBar value={done} total={hangul.length} label={t("learn.progress", { d: done, n: hangul.length })} />}

      {status === "error" && (
        <p role="alert" className="card border-red-200 bg-red-50 text-red-700">{t("common.contentError")}</p>
      )}
      {status === "ready" && hangul.length === 0 && <p className="card muted">{t("hangul.none")}</p>}

      {(HANGUL_GROUPS as readonly HangulGroup[]).map((group) => {
        const items = hangul.filter((h) => h.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`hg-${group}`} className="space-y-3">
            <div>
              <h2 id={`hg-${group}`} className="text-xl font-bold tracking-tight text-zinc-900">{t(`hangul.group.${group}`)}</h2>
              <p className="muted text-sm">{t(`hangul.groupHelp.${group}`)}</p>
            </div>
            <ul className="grid grid-cols-1 gap-3">
              {items.map((h) => {
                const isOpen = open === h.id;
                return (
                  <li key={h.id} className="card self-start" data-testid={`hangul-${h.id}`}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : h.id)}
                    >
                      <span className="flex items-baseline gap-3">
                        <span className="text-3xl font-extrabold text-zinc-900"><Ko>{h.letter}</Ko></span>
                        <span className="muted text-sm font-semibold">{h.roman}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {isLearned(learned, "hangul", h.id) && <Check aria-label={t("learn.marked")} className="h-5 w-5 text-emerald-700" />}
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3">
                        <p className="text-sm text-zinc-700"><Ko>{h.name_ko}</Ko></p>
                        <div className="rounded-xl bg-zinc-50 p-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("hangul.sound")}</h3>
                          <p className="mt-1 text-zinc-900">{h.sound_en}</p>
                          <p className="muted text-sm">
                            {t("hangul.khmerSound")}: <Tr lang="km">{h.sound_km}</Tr>
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-lg font-bold text-zinc-900"><Ko>{h.syllable}</Ko></span>
                            <AudioButton file={h.audio_file} slow label={t("hangul.listenSound")} />
                          </div>
                        </div>
                        <div className="rounded-xl bg-zinc-50 p-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("hangul.example")}</h3>
                          <p className="mt-1 text-lg font-semibold text-zinc-900"><Ko>{h.example_ko}</Ko></p>
                          <p className="muted text-sm"><Tr lang={lang}>{lang === "km" ? h.example_km : h.example_en}</Tr></p>
                          <p className="muted text-sm"><Tr lang={other}>{other === "km" ? h.example_km : h.example_en}</Tr></p>
                          <div className="mt-2">
                            <AudioButton file={h.example_audio_file} slow label={t("hangul.listenWord")} />
                          </div>
                        </div>
                        <LearnedButton on={isLearned(learned, "hangul", h.id)} onClick={() => toggle("hangul", h.id)} id={h.id} />
                        {(lang === "km" ? h.tip_km : h.tip_en) && (
                          <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm font-medium text-indigo-900">
                            <Tr lang={lang}>{lang === "km" ? h.tip_km : h.tip_en}</Tr>
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
