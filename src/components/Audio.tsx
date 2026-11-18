import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Volume2, AlertCircle } from "lucide-react";
import { useContent, useSettings } from "../store";
import { Ko, Tr } from "./ui";
import type { DialogueLine } from "../types";

/** One play button for one MP3 file. Slow playback (0.75x) is for lessons and practice only. */
export function AudioButton({
  file, slow = false, label, onStarted, disabled = false, disabledLabel,
}: {
  file: string; slow?: boolean; label?: string; onStarted?: () => void; disabled?: boolean; disabledLabel?: string;
}) {
  const { t } = useSettings();
  const { audioSrc } = useContent();
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => () => ref.current?.pause(), []);

  const play = () => {
    setError(false);
    ref.current?.pause();
    const a = new Audio(audioSrc(file));
    a.playbackRate = slow ? 0.75 : 1;
    a.onplaying = () => {
      setPlaying(true);
      onStarted?.();
    };
    a.onended = () => setPlaying(false);
    a.onerror = () => {
      setPlaying(false);
      setError(true);
    };
    ref.current = a;
    a.play().catch(() => setError(true));
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        className={`btn ${playing ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "btn-secondary"}`}
        onClick={play}
        disabled={disabled || playing}
        aria-label={label ?? t("common.play")}
      >
        <span aria-hidden="true">
          {playing ? <Volume2 className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
        </span>
        <span>{disabled && disabledLabel ? disabledLabel : label ?? t("common.play")}</span>
      </button>
      {error && (
        <span role="alert" className="mt-1.5 flex items-center gap-1 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t("lessons.audioError")}</span>
        </span>
      )}
    </span>
  );
}

/** Dialogue player: play one line, play all, 0.75x option, transcript after the first listen. */
export function DialoguePlayer({ lines }: { lines: DialogueLine[] }) {
  const { t, lang } = useSettings();
  const { audioSrc } = useContent();
  const [slow, setSlow] = useState(false);
  const [heard, setHeard] = useState<Set<number>>(() => new Set());
  const [active, setActive] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current++;
    audio.current?.pause();
    audio.current = null;
    setActive(null);
  }, []);
  useEffect(() => stop, [stop]);

  const playFrom = useCallback(
    (index: number, all: boolean) => {
      stop();
      const myRun = run.current;
      setError(false);
      const go = (i: number) => {
        if (i >= lines.length || myRun !== run.current) return setActive(null);
        const a = new Audio(audioSrc(lines[i].audio_file));
        a.playbackRate = slow ? 0.75 : 1;
        audio.current = a;
        setActive(i);
        a.onended = () => {
          if (myRun !== run.current) return;
          setHeard((h) => new Set(h).add(i)); // a line's transcript appears after that line has been heard once
          if (all) go(i + 1);
          else setActive(null);
        };
        a.onerror = () => {
          setError(true);
          setActive(null);
        };
        a.play().catch(() => {
          setError(true);
          setActive(null);
        });
      };
      go(index);
    },
    [lines, slow, stop, audioSrc],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className="btn btn-primary" onClick={() => playFrom(0, true)}>
          <Play className="h-4 w-4" />
          <span>{t("lessons.playAll")}</span>
        </button>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-indigo-600"
            checked={slow}
            onChange={(e) => setSlow(e.target.checked)}
          />
          <span>{t("lessons.slow")}</span>
        </label>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t("lessons.audioError")}</span>
        </p>
      )}
      {heard.size === 0 && <p className="muted text-sm">{t("lessons.transcriptHint")}</p>}
      <ol className="space-y-3">
        {lines.map((l, i) => (
          <li
            key={i}
            className={`card flex items-start gap-3.5 transition-all ${
              active === i ? "border-indigo-600 ring-2 ring-indigo-600/20" : ""
            }`}
          >
            <button
              type="button"
              className={`btn shrink-0 ${active === i ? "btn-primary" : "btn-secondary"}`}
              onClick={() => playFrom(i, false)}
              aria-label={`${t("lessons.playLine")} ${i + 1}`}
            >
              {active === i ? <Volume2 className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700">
                {l.speaker}
              </span>
              {heard.has(i) ? (
                <div className="mt-1.5 space-y-1">
                  <p className="text-lg font-medium text-zinc-900">
                    <Ko>{l.ko}</Ko>
                  </p>
                  <p className="muted text-sm">
                    <Tr lang={lang}>{lang === "km" ? l.km : l.en}</Tr>
                  </p>
                </div>
              ) : (
                <p className="muted mt-1.5 text-sm">
                  {t("lessons.playLine")} {i + 1}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}