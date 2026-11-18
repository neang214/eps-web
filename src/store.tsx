import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { kvGet, kvSet, uuid } from "./lib/db";
import { makeT, type TFn } from "./lib/i18n";
import { audioUrl } from "./lib/api";
import { fetchPackList, fetchPackPayload, getStoredPacks } from "./lib/packs";
import type { GrammarPattern, HangulItem, Lang, NumberItem, PackInfo, PackPayload, Question, Settings, Stimulus, Unit, VocabItem } from "./types";

// ---------- Settings ----------
const DEFAULTS: Settings = { language: null, fontStep: 0, dark: false, wifiOnly: false, analyticsOptIn: false };
const FONT_PX = [16, 19, 22];

interface SettingsCtx {
  ready: boolean;
  settings: Settings;
  lang: Lang;
  t: TFn;
  update: (patch: Partial<Settings>) => void;
}
const SettingsContext = createContext<SettingsCtx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const latest = useRef<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await kvGet<Partial<Settings>>("settings");
      latest.current = { ...DEFAULTS, ...(saved ?? {}) };
      setSettings(latest.current);
      // Random install ID, created locally. Not sent anywhere in the MVP.
      if (!(await kvGet<string>("installId"))) await kvSet("installId", uuid());
      setReady(true);
    })();
  }, []);

  const lang: Lang = settings.language ?? "en";
  const t = useMemo(() => makeT(lang), [lang]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.style.fontSize = `${FONT_PX[settings.fontStep]}px`;
    root.classList.toggle("dark", settings.dark);
    // Settings live in IndexedDB (async), so mirror the theme to localStorage for the loading splash.
    if (ready) {
      try {
        localStorage.setItem("eps-dark", settings.dark ? "1" : "0");
      } catch {
        /* storage blocked: the splash stays light */
      }
    }
  }, [lang, settings.fontStep, settings.dark, ready]);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setSettings(next);
    void kvSet("settings", next);
  }, []);

  const value = useMemo(() => ({ ready, settings, lang, t, update }), [ready, settings, lang, t, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsCtx {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("SettingsProvider missing");
  return c;
}

// ---------- Content ----------
export interface DownloadState {
  id: string;
  info: PackInfo;
  downloadedVersion: number | null;
  updateAvailable: boolean;
}

interface ContentCtx {
  status: "loading" | "ready" | "error";
  online: boolean;
  questions: Question[];
  vocab: VocabItem[];
  units: Unit[];
  grammar: GrammarPattern[];
  hangul: HangulItem[];
  numbers: NumberItem[];
  stimuli: Record<string, Stimulus>;
  questionById: Record<string, Question>;
  vocabById: Record<string, VocabItem>;
  packs: DownloadState[];
  /** Address of an MP3 file, with the pack version in it so an updated pack never plays an old cached copy. */
  audioSrc: (file: string) => string;
  reload: () => void;
}
const ContentContext = createContext<ContentCtx | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; online: boolean; payloads: PackPayload[]; packs: DownloadState[] }>({
    status: "loading", online: true, payloads: [], packs: [],
  });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const first = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (first.current) first.current = false;
      else setState((s) => ({ ...s, status: "loading" }));

      const stored = await getStoredPacks();
      const storedById = new Map(stored.map((p) => [p.id, p]));
      const { list, online } = await fetchPackList();

      const payloads: PackPayload[] = [];
      const ids = list.length ? list.map((p) => p.id) : stored.map((p) => p.id);
      for (const id of ids) {
        const local = storedById.get(id);
        if (local) {
          payloads.push(local.payload); // downloaded packs are used as they are; updates only on tap
          continue;
        }
        try {
          payloads.push(await fetchPackPayload(id));
        } catch {
          /* pack unavailable offline */
        }
      }

      const packs: DownloadState[] = list.map((info) => {
        const local = storedById.get(info.id);
        return { id: info.id, info, downloadedVersion: local?.version ?? null, updateAvailable: !!local && online && info.version !== local.version };
      });
      if (!cancelled) setState({ status: payloads.length ? "ready" : "error", online, payloads, packs });
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value = useMemo<ContentCtx>(() => {
    const questions = state.payloads.flatMap((p) => p.questions);
    const vocab = state.payloads.flatMap((p) => p.vocab);
    const units = state.payloads.flatMap((p) => p.units).sort((a, b) => a.order - b.order);
    // Packs downloaded before grammar existed have no `grammar` list.
    const grammar = state.payloads.flatMap((p) => p.grammar ?? []);
    const hangul = state.payloads.flatMap((p) => p.hangul ?? []);
    const numbers = state.payloads.flatMap((p) => p.numbers ?? []);
    const stimuli: Record<string, Stimulus> = {};
    state.payloads.forEach((p) => p.stimuli.forEach((s) => (stimuli[s.id] = s)));
    const audioVersion: Record<string, number> = {};
    for (const p of state.payloads) {
      const add = (f: string | null | undefined) => {
        if (f) audioVersion[f] = p.version;
      };
      p.stimuli.forEach((s) => add(s.audio_file));
      p.vocab.forEach((v) => add(v.audio_file));
      p.units.forEach((u) => u.dialogue.lines.forEach((l) => add(l.audio_file)));
      (p.hangul ?? []).forEach((h) => {
        add(h.audio_file);
        add(h.example_audio_file);
      });
      (p.numbers ?? []).forEach((n) => add(n.audio_file));
    }
    return {
      status: state.status, online: state.online, questions, vocab, units, grammar, hangul, numbers, stimuli,
      questionById: Object.fromEntries(questions.map((q) => [q.id, q])),
      vocabById: Object.fromEntries(vocab.map((v) => [v.id, v])),
      packs: state.packs, audioSrc: (file) => audioUrl(file, audioVersion[file]), reload,
    };
  }, [state, reload]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentCtx {
  const c = useContext(ContentContext);
  if (!c) throw new Error("ContentProvider missing");
  return c;
}
