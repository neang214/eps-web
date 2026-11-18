// Pure exam state machine. Section timers are stored as absolute end times (ms since epoch),
// so they stay correct if the app is closed and reopened.
import type { ExamRules, Section } from "../types";

export interface ExamSection {
  section: Section;
  questionIds: string[];
  startedAt: number;
  endsAt: number;
  endedAt: number | null; // set when the section is locked
}

export interface ExamState {
  id: string;
  startedAt: number;
  sections: ExamSection[];
  current: number; // index of the active section; equals sections.length once submitted
  position: number; // question index within the active section (UI cursor)
  answers: Record<string, number>;
  flags: string[];
  audioPlays: Record<string, number>;
  status: "in_progress" | "submitted";
  finishedAt: number | null;
  // Free mode: one shared clock for the whole exam and the learner may switch sections at any time.
  // Missing on exams saved by older versions, which keep the old one-section-at-a-time behaviour.
  free?: boolean;
  endsAt?: number;
}

const MIN_MS = 60_000;

export function startExam(
  rules: Pick<ExamRules, "sectionOrder" | "sectionMinutes">,
  picks: Record<Section, string[]>,
  now: number,
  id: string,
  opts: { free?: boolean } = {},
): ExamState {
  const order = rules.sectionOrder.filter((s) => (picks[s]?.length ?? 0) > 0);
  const free = !!opts.free;
  const totalEnd = now + order.reduce((sum, s) => sum + rules.sectionMinutes[s], 0) * MIN_MS;
  const sections: ExamSection[] = order.map((s, i) => ({
    section: s,
    questionIds: picks[s],
    startedAt: free || i === 0 ? now : 0,
    endsAt: free ? totalEnd : i === 0 ? now + rules.sectionMinutes[s] * MIN_MS : 0,
    endedAt: null,
  }));
  return {
    ...(free ? { free: true, endsAt: totalEnd } : {}),
    id,
    startedAt: now,
    sections,
    current: 0,
    position: 0,
    answers: {},
    flags: [],
    audioPlays: {},
    status: sections.length ? "in_progress" : "submitted",
    finishedAt: sections.length ? null : now,
  };
}

function lockAndMove(
  state: ExamState,
  rules: Pick<ExamRules, "sectionMinutes">,
  lockedAt: number,
): ExamState {
  const sections = state.sections.map((s) => ({ ...s }));
  sections[state.current].endedAt = lockedAt;
  const next = state.current + 1;
  if (next >= sections.length) {
    return { ...state, sections, current: sections.length, status: "submitted", finishedAt: lockedAt, position: 0 };
  }
  sections[next].startedAt = lockedAt;
  sections[next].endsAt = lockedAt + rules.sectionMinutes[sections[next].section] * MIN_MS;
  return { ...state, sections, current: next, position: 0 };
}

/**
 * Applies any section timeouts up to `now`. When a section runs out it is locked and the next one
 * starts at that exact moment (not at `now`), so closing the app never buys extra time.
 * The last section running out submits the exam automatically.
 */
export function advance(state: ExamState, rules: Pick<ExamRules, "sectionMinutes">, now: number): ExamState {
  if (state.free) return state.status === "in_progress" && (state.endsAt ?? 0) <= now ? lockAll(state, state.endsAt!) : state;
  let s = state;
  while (s.status === "in_progress" && s.sections[s.current].endsAt <= now) {
    s = lockAndMove(s, rules, s.sections[s.current].endsAt);
  }
  return s;
}

function lockAll(state: ExamState, at: number): ExamState {
  const sections = state.sections.map((s) => ({ ...s, endedAt: at }));
  return { ...state, sections, current: sections.length, status: "submitted", finishedAt: at, position: 0 };
}

/** Free mode: jump to another section. The question cursor restarts at its first question. */
export function switchSection(state: ExamState, index: number, now: number, rules: Pick<ExamRules, "sectionMinutes">): ExamState {
  const s = advance(state, rules, now);
  if (!s.free || s.status !== "in_progress" || index < 0 || index >= s.sections.length || index === s.current) return s;
  return { ...s, current: index, position: 0 };
}

/** Learner finishes the active section early (needs allowEarlyFinishSection). Last section = submit. */
export function finishSection(state: ExamState, rules: Pick<ExamRules, "sectionMinutes">, now: number): ExamState {
  const s = advance(state, rules, now);
  if (s.status !== "in_progress" || s.free) return s; // free mode has no per-section finish
  return lockAndMove(s, rules, now);
}

export const submitExam = (state: ExamState, rules: Pick<ExamRules, "sectionMinutes">, now: number): ExamState => {
  let s = advance(state, rules, now);
  if (s.free && s.status === "in_progress") return lockAll(s, now);
  while (s.status === "in_progress") s = lockAndMove(s, rules, now);
  return s;
};

export const remainingMs = (state: ExamState, now: number): number =>
  state.status === "in_progress" ? Math.max(0, (state.free ? state.endsAt! : state.sections[state.current].endsAt) - now) : 0;

export const activeSection = (state: ExamState): ExamSection | null =>
  state.status === "in_progress" ? state.sections[state.current] : null;

export function timeUsedMs(state: ExamState): number {
  if (state.free) return Math.max(0, (state.finishedAt ?? state.startedAt) - state.startedAt);
  return state.sections.reduce((sum, s) => sum + Math.max(0, (s.endedAt ?? s.startedAt) - s.startedAt), 0);
}

export function setAnswer(state: ExamState, qid: string, position: number, now: number, rules: Pick<ExamRules, "sectionMinutes">): ExamState {
  const s = advance(state, rules, now);
  const sec = activeSection(s);
  if (!sec) return s; // finished exam: ignore
  if (s.free ? !s.sections.some((x) => x.questionIds.includes(qid)) : !sec.questionIds.includes(qid)) return s; // locked section: ignore
  return { ...s, answers: { ...s.answers, [qid]: position } };
}

export function toggleFlag(state: ExamState, qid: string): ExamState {
  const flags = state.flags.includes(qid) ? state.flags.filter((f) => f !== qid) : [...state.flags, qid];
  return { ...state, flags };
}

export const canPlayAudio = (state: ExamState, qid: string, rules: Pick<ExamRules, "listeningReplayAllowed">): boolean =>
  rules.listeningReplayAllowed || (state.audioPlays[qid] ?? 0) < 1;

export const recordPlay = (state: ExamState, qid: string): ExamState => ({
  ...state,
  audioPlays: { ...state.audioPlays, [qid]: (state.audioPlays[qid] ?? 0) + 1 },
});

export function moveTo(state: ExamState, index: number, rules: Pick<ExamRules, "allowBackNavigation">): ExamState {
  const sec = activeSection(state);
  if (!sec) return state;
  const clamped = Math.max(0, Math.min(sec.questionIds.length - 1, index));
  if (!rules.allowBackNavigation && clamped < state.position) return state;
  return { ...state, position: clamped };
}
