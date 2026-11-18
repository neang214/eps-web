import { useState } from "react";
import { Check, X as XIcon, Flag, Languages } from "lucide-react";
import { pick } from "../lib/i18n";
import { useContent, useSettings } from "../store";
import type { Question } from "../types";
import { AudioButton } from "./Audio";
import { ReportButton } from "./ReportDialog";
import { Ko, SampleBadge, Tr } from "./ui";

/**
 * Practice-style question with feedback after answering, an optional translation, a flag toggle
 * and a report button. Remount with a new `key` for each question.
 */
export function QuestionCard({
  question, flagged, onToggleFlag, onAnswered, showFlag = true, splitLayout = false,
}: {
  question: Question;
  flagged?: boolean;
  onToggleFlag?: () => void;
  onAnswered: (position: number, correct: boolean) => void;
  showFlag?: boolean;
  splitLayout?: boolean;
}) {
  const { t, lang } = useSettings();
  const { stimuli } = useContent();
  const [selected, setSelected] = useState<number | null>(null);
  const [translate, setTranslate] = useState(false);
  const [slow, setSlow] = useState(false);
  const stim = question.stimulus_id ? stimuli[question.stimulus_id] : undefined;
  const correct = question.options.find((o) => o.is_correct)?.position ?? 0;
  const answered = selected !== null;

  const choose = (pos: number) => {
    if (answered) return;
    setSelected(pos);
    onAnswered(pos, pos === correct);
  };

  const questionPane = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <span className="rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-600">
          {question.id}
        </span>
        {question.is_sample && <SampleBadge />}
      </div>

      {stim?.type === "PASSAGE" && stim.text_ko && (
        <blockquote className="whitespace-pre-line rounded-xl border border-zinc-200 border-l-4 border-l-blue-600 bg-zinc-50 p-4 text-lg text-zinc-900">
          <Ko>{stim.text_ko}</Ko>
          {translate && (
            <span className="muted mt-2 block border-t border-zinc-200 pt-2 text-base">
              <Tr lang={lang}>{pick(stim, "text", lang)}</Tr>
            </span>
          )}
        </blockquote>
      )}

      {stim?.audio_file && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <AudioButton file={stim.audio_file} slow={slow} />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer accent-blue-600"
              checked={slow}
              onChange={(e) => setSlow(e.target.checked)}
            />
            <span>{t("practice.slow")}</span>
          </label>
        </div>
      )}

      <p className="whitespace-pre-line text-xl font-bold leading-snug text-zinc-900" data-testid="stem">
        <Ko>{question.stem_ko}</Ko>
        {translate && (
          <span className="muted mt-1.5 block text-base font-normal">
            <Tr lang={lang}>{pick(question, "stem", lang)}</Tr>
          </span>
        )}
      </p>
    </div>
  );

  const answerPane = (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {question.options.map((o) => {
          const isSel = selected === o.position;
          const isRight = o.position === correct;
          const state = !answered
            ? "border-zinc-200 bg-white text-zinc-900 hover:border-blue-600 hover:bg-zinc-50"
            : isRight
              ? "border-emerald-700 bg-emerald-50 text-emerald-800"
              : isSel
                ? "border-red-600 bg-red-50 text-red-800"
                : "border-zinc-200 bg-white text-zinc-500 opacity-65";
          return (
            <li key={o.position}>
              <button
                type="button"
                className={`flex min-h-13 w-full cursor-pointer items-start gap-3.5 rounded-xl border-2 px-4 py-3 text-left transition-all disabled:cursor-default ${state}`}
                onClick={() => choose(o.position)}
                aria-pressed={isSel}
                disabled={answered}
                data-testid={`option-${o.position}`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700">
                  {o.position}.
                </span>
                <span className="flex-1 text-base font-medium">
                  <Ko>{o.text_ko}</Ko>
                  {translate && (
                    <span className="muted mt-0.5 block text-sm font-normal">
                      <Tr lang={lang}>{pick(o, "text", lang)}</Tr>
                    </span>
                  )}
                </span>
                {answered && isRight && (
                  <span className="font-bold text-emerald-700" aria-label={t("common.correct")}>
                    <Check className="h-5 w-5" />
                  </span>
                )}
                {answered && isSel && !isRight && (
                  <span className="font-bold text-red-700" aria-label={t("common.wrong")}>
                    <XIcon className="h-5 w-5" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div
          role="status"
          className={`rounded-xl border p-4 ${
            selected === correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="text-base font-bold">
            {selected === correct ? t("practice.right") : t("practice.notRight")}
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wider opacity-80">
            {t("practice.explanation")}
          </p>
          <p className="mt-1 text-sm text-zinc-900">
            <Tr lang={lang}>{pick(question, "explanation", lang)}</Tr>
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        <button
          type="button"
          className={`btn ${translate ? "border-blue-600 bg-blue-50 text-blue-800" : "btn-secondary"}`}
          onClick={() => setTranslate((v) => !v)}
          aria-pressed={translate}
        >
          <Languages className="h-4 w-4" />
          <span>{translate ? t("practice.hideTranslation") : t("practice.showTranslation")}</span>
        </button>
        {showFlag && onToggleFlag && (
          <button
            type="button"
            className={`btn ${flagged ? "border-amber-200 bg-amber-50 text-amber-800" : "btn-secondary"}`}
            onClick={onToggleFlag}
            aria-pressed={!!flagged}
          >
            <Flag className={`h-4 w-4 ${flagged ? "fill-amber-600 text-amber-600" : ""}`} />
            <span>{flagged ? t("practice.unflag") : t("practice.flag")}</span>
          </button>
        )}
        <ReportButton questionId={question.id} />
      </div>
    </div>
  );

  return (
    <article className="card sm:p-6" aria-label={question.id}>
      {splitLayout ? (
        <div className="space-y-5 lg:grid lg:grid-cols-[11fr_9fr] lg:items-start lg:gap-6 lg:space-y-0">
          {questionPane}
          <div className="lg:border-l lg:border-zinc-200 lg:pl-6">{answerPane}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {questionPane}
          {answerPane}
        </div>
      )}
    </article>
  );
}