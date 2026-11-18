import { useState } from "react";
import { makeT } from "../lib/i18n";
import { useSettings } from "../store";
import type { Lang } from "../types";

const LANGS: Lang[] = ["km", "en"];

export default function Onboarding() {
  const { update } = useSettings();
  const [choice, setChoice] = useState<Lang>("km");
  // Before a language is chosen, the screen shows both languages. All text still comes from the locale files.
  const tt = { km: makeT("km"), en: makeT("en") };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <div className="card space-y-6 p-6 shadow-md sm:p-8">
        <h1 className="space-y-1 text-2xl font-bold tracking-tight text-zinc-900">
          {LANGS.map((l) => (
            <span key={l} lang={l} className="block">
              {tt[l]("onboarding.title")}
            </span>
          ))}
        </h1>
        <div role="radiogroup" aria-label={tt[choice]("a11y.language")} className="space-y-3">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={choice === l}
              lang={l}
              onClick={() => setChoice(l)}
              data-testid={`lang-${l}`}
              className={`flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 text-lg font-semibold transition-all ${
                choice === l
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {tt[l]("languages." + l)}
              <span aria-hidden="true" className={choice === l ? "text-indigo-600" : "text-zinc-400"}>
                {choice === l ? "●" : "○"}
              </span>
            </button>
          ))}
        </div>
        <p lang={choice} className="muted text-sm">
          {tt[choice]("onboarding.subtitle")}
        </p>
        <button
          type="button"
          className="btn btn-primary min-h-13 w-full text-base"
          lang={choice}
          onClick={() => update({ language: choice })}
          data-testid="lang-continue"
        >
          {tt[choice]("onboarding.continue")}
        </button>
      </div>
    </main>
  );
}