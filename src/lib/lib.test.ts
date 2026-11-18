import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_EASE, START_EASE, isDue, newCard, review } from "./sm2";
import { scoreSection, totalScore } from "./scoring";
import {
  advance, canPlayAudio, finishSection, moveTo, recordPlay, remainingMs, setAnswer, startExam, submitExam, switchSection, timeUsedMs,
} from "./exam";
import type { ExamRules } from "../types";

const rules: ExamRules = {
  questionsPerSection: { READING: 20, LISTENING: 20 },
  sectionMinutes: { READING: 25, LISTENING: 25 },
  sectionMaxPoints: 50,
  pointsPerQuestion: 2.5,
  sectionOrder: ["READING", "LISTENING"],
  allowBackNavigation: true,
  allowFlagging: true,
  allowEarlyFinishSection: true,
  listeningReplayAllowed: false,
  unansweredScore: 0,
};

const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}-${String(i + 1).padStart(4, "0")}`);
const correctMap = (list: string[]) => Object.fromEntries(list.map((q) => [q, 1]));

describe("scoring", () => {
  const R = ids("R", 20);
  it("gives full marks for all correct", () => {
    const s = scoreSection(R, Object.fromEntries(R.map((q) => [q, 1])), correctMap(R), rules);
    expect(s).toMatchObject({ correct: 20, wrong: 0, unanswered: 0, score: 50 });
  });
  it("scores unanswered as 0 (config unansweredScore)", () => {
    const answers = Object.fromEntries(R.slice(0, 10).map((q) => [q, 1]));
    const s = scoreSection(R, answers, correctMap(R), rules);
    expect(s).toMatchObject({ correct: 10, unanswered: 10, score: 25 });
  });
  it("scores wrong answers as 0 and never negative", () => {
    const s = scoreSection(R, Object.fromEntries(R.map((q) => [q, 2])), correctMap(R), rules);
    expect(s).toMatchObject({ correct: 0, wrong: 20, score: 0 });
  });
  it("reads weights from the rules, not constants", () => {
    const s = scoreSection(R, {}, correctMap(R), { ...rules, unansweredScore: 1 });
    expect(s.score).toBe(20);
    const t = scoreSection(R, Object.fromEntries(R.map((q) => [q, 1])), correctMap(R), { ...rules, pointsPerQuestion: 5 });
    expect(t.score).toBe(50); // capped by sectionMaxPoints
  });
  it("totals sections out of 100", () => {
    const L = ids("L", 20);
    const a = scoreSection(R, Object.fromEntries(R.map((q) => [q, 1])), correctMap(R), rules);
    const b = scoreSection(L, Object.fromEntries(L.map((q) => [q, 1])), correctMap(L), rules);
    expect(totalScore([a, b])).toBe(100);
  });
});

describe("section timers", () => {
  const T0 = new Date("2026-10-15T09:00:00Z").getTime();
  const min = (n: number) => n * 60_000;
  const picks = { READING: ids("R", 20), LISTENING: ids("L", 20) };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it("stores absolute end times and counts down", () => {
    const s = startExam(rules, picks, Date.now(), "e1");
    expect(s.sections[0].endsAt).toBe(T0 + min(25));
    vi.advanceTimersByTime(min(10));
    expect(remainingMs(s, Date.now())).toBe(min(15));
  });

  it("stays correct after the app closes and reopens (serialised state)", () => {
    const saved = JSON.stringify(startExam(rules, picks, Date.now(), "e1"));
    vi.advanceTimersByTime(min(20)); // app closed for 20 minutes
    const reopened = advance(JSON.parse(saved), rules, Date.now());
    expect(reopened.current).toBe(0);
    expect(remainingMs(reopened, Date.now())).toBe(min(5));
  });

  it("locks the section at timeout and starts the next one at that exact moment", () => {
    let s = startExam(rules, picks, Date.now(), "e1");
    vi.advanceTimersByTime(min(26)); // 1 minute into the next section
    s = advance(s, rules, Date.now());
    expect(s.sections[0].endedAt).toBe(T0 + min(25));
    expect(s.current).toBe(1);
    expect(s.sections[1].startedAt).toBe(T0 + min(25));
    expect(remainingMs(s, Date.now())).toBe(min(24));
  });

  it("ignores answers to a locked section", () => {
    let s = startExam(rules, picks, Date.now(), "e1");
    vi.advanceTimersByTime(min(26));
    s = setAnswer(s, "R-0001", 2, Date.now(), rules);
    expect(s.answers["R-0001"]).toBeUndefined();
    s = setAnswer(s, "L-0001", 3, Date.now(), rules);
    expect(s.answers["L-0001"]).toBe(3);
  });

  it("auto-submits after the last section runs out, even if the app was closed", () => {
    const s = startExam(rules, picks, Date.now(), "e1");
    vi.advanceTimersByTime(min(120));
    const done = advance(s, rules, Date.now());
    expect(done.status).toBe("submitted");
    expect(done.finishedAt).toBe(T0 + min(50));
    expect(timeUsedMs(done)).toBe(min(50));
  });

  it("finishing a section early starts the next at once; finishing the last submits", () => {
    let s = startExam(rules, picks, Date.now(), "e1");
    vi.advanceTimersByTime(min(5));
    s = finishSection(s, rules, Date.now());
    expect(s.current).toBe(1);
    expect(s.sections[1].endsAt).toBe(T0 + min(5) + min(25));
    vi.advanceTimersByTime(min(3));
    s = finishSection(s, rules, Date.now());
    expect(s.status).toBe("submitted");
    expect(timeUsedMs(s)).toBe(min(8));
  });

  it("manual submit locks every remaining section", () => {
    const s = submitExam(startExam(rules, picks, Date.now(), "e1"), rules, Date.now());
    expect(s.status).toBe("submitted");
  });

  it("limits listening audio to one play when replay is off", () => {
    let s = startExam(rules, picks, Date.now(), "e1");
    expect(canPlayAudio(s, "L-0001", rules)).toBe(true);
    s = recordPlay(s, "L-0001");
    expect(canPlayAudio(s, "L-0001", rules)).toBe(false);
    expect(canPlayAudio(s, "L-0001", { ...rules, listeningReplayAllowed: true })).toBe(true);
  });

  it("blocks going back when allowBackNavigation is off", () => {
    let s = startExam(rules, picks, Date.now(), "e1");
    s = moveTo(s, 3, rules);
    expect(moveTo(s, 1, { allowBackNavigation: false }).position).toBe(3);
    expect(moveTo(s, 1, rules).position).toBe(1);
  });

  describe("free mode (one clock, switch sections any time)", () => {
    const free = () => startExam(rules, picks, Date.now(), "f1", { free: true });

    it("uses one shared clock for the whole exam", () => {
      const s = free();
      expect(remainingMs(s, Date.now())).toBe(min(50));
      vi.advanceTimersByTime(min(30));
      expect(remainingMs(advance(s, rules, Date.now()), Date.now())).toBe(min(20));
    });

    it("lets the learner switch sections and answer in either one", () => {
      let s = free();
      s = switchSection(s, 1, Date.now(), rules);
      expect(s.current).toBe(1);
      s = setAnswer(s, "L-0001", 2, Date.now(), rules);
      s = switchSection(s, 0, Date.now(), rules);
      s = setAnswer(s, "R-0001", 3, Date.now(), rules);
      expect(s.answers).toMatchObject({ "L-0001": 2, "R-0001": 3 });
    });

    it("does not lock Reading when 25 minutes pass", () => {
      let s = free();
      vi.advanceTimersByTime(min(26));
      s = advance(s, rules, Date.now());
      expect(s.status).toBe("in_progress");
      expect(s.current).toBe(0);
      expect(setAnswer(s, "R-0001", 1, Date.now(), rules).answers["R-0001"]).toBe(1);
    });

    it("auto-submits when the shared clock ends, even if the app was closed", () => {
      const saved = JSON.stringify(free());
      vi.advanceTimersByTime(min(120));
      const done = advance(JSON.parse(saved), rules, Date.now());
      expect(done.status).toBe("submitted");
      expect(done.finishedAt).toBe(T0 + min(50));
      expect(timeUsedMs(done)).toBe(min(50));
    });

    it("has no per-section finish, and submit ends everything", () => {
      const s = free();
      expect(finishSection(s, rules, Date.now())).toBe(s);
      const done = submitExam(s, rules, Date.now());
      expect(done.status).toBe("submitted");
      expect(done.sections.every((x) => x.endedAt === T0)).toBe(true);
    });

    it("a single-section paper gets only that section's minutes", () => {
      const s = startExam(rules, { READING: [], LISTENING: ids("L", 20) }, Date.now(), "f2", { free: true });
      expect(s.sections).toHaveLength(1);
      expect(remainingMs(s, Date.now())).toBe(min(25));
    });

    it("keeps the old behaviour for exams saved without the free flag", () => {
      const s = switchSection(startExam(rules, picks, Date.now(), "old"), 1, Date.now(), rules);
      expect(s.current).toBe(0);
    });
  });
});

describe("SM-2", () => {
  const NOW = 1_000_000_000_000;
  const DAY = 86_400_000;

  it("starts at ease 2.5 and is due immediately", () => {
    const c = newCard("V-1", NOW);
    expect(c.ease).toBe(START_EASE);
    expect(isDue(c, NOW)).toBe(true);
    expect(isDue(undefined, NOW)).toBe(true);
  });

  it("schedules 1 day, 6 days, then interval * ease", () => {
    let c = review(newCard("V-1", NOW), "good", NOW);
    expect(c).toMatchObject({ reps: 1, interval: 1, ease: 2.5, due: NOW + DAY });
    c = review(c, "good", NOW + DAY);
    expect(c).toMatchObject({ reps: 2, interval: 6 });
    c = review(c, "good", NOW + 7 * DAY);
    expect(c).toMatchObject({ reps: 3, interval: 15 }); // round(6 * 2.5)
  });

  it("Easy raises ease by 0.1, Hard lowers it by 0.14, Good keeps it", () => {
    expect(review(newCard("a", NOW), "easy", NOW).ease).toBe(2.6);
    expect(review(newCard("a", NOW), "hard", NOW).ease).toBe(2.36);
    expect(review(newCard("a", NOW), "good", NOW).ease).toBe(2.5);
  });

  it("Again restarts repetitions without changing ease", () => {
    let c = review(review(newCard("a", NOW), "good", NOW), "good", NOW);
    c = review(c, "again", NOW);
    expect(c).toMatchObject({ reps: 0, interval: 1, ease: 2.5, lapses: 1 });
  });

  it("never lets ease fall below 1.3", () => {
    let c = newCard("a", NOW);
    for (let i = 0; i < 30; i++) c = review(c, "hard", NOW);
    expect(c.ease).toBe(MIN_EASE);
  });
});
