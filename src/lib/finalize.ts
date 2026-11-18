import { dbAll, dbPut, kvSet, uuid } from "./db";
import { timeUsedMs, type ExamState } from "./exam";
import { scoreSection, totalScore } from "./scoring";
import { submitAnalytics } from "./analytics";
import type { AttemptRecord, MistakeRecord } from "./hooks";
import type { ExamRules, Question } from "../types";

/**
 * Turns a submitted exam into a stored attempt, updates the mistake notebook, clears the active exam
 * and (only if the learner opted in) sends one anonymous record per question.
 */
export async function finalizeExam(
  state: ExamState,
  rules: ExamRules,
  questionById: Record<string, Question>,
  analyticsOptIn: boolean,
): Promise<{ attempt: AttemptRecord; mistakesAdded: number }> {
  const correctPositions: Record<string, number> = {};
  for (const sec of state.sections) {
    for (const id of sec.questionIds) {
      correctPositions[id] = questionById[id]?.options.find((o) => o.is_correct)?.position ?? 0;
    }
  }

  const sections = state.sections.map((sec) => {
    const s = scoreSection(sec.questionIds, state.answers, correctPositions, rules);
    return {
      section: sec.section,
      questionIds: sec.questionIds,
      ...s,
      timeUsedMs: state.free ? 0 : Math.max(0, (sec.endedAt ?? sec.startedAt) - sec.startedAt), // free mode: one shared clock, no per-section time
    };
  });
  const total = totalScore(sections);
  const allIds = state.sections.flatMap((s) => s.questionIds);

  const attempt: AttemptRecord = {
    id: state.id,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt ?? Date.now(),
    total,
    maxTotal: rules.sectionMaxPoints * state.sections.length,
    sectionMax: rules.sectionMaxPoints,
    timeUsedMs: timeUsedMs(state),
    questionCount: allIds.length,
    fullCount: state.sections.reduce((n, s) => n + rules.questionsPerSection[s.section], 0),
    sections,
    answers: state.answers,
  };
  await dbPut("attempts", attempt);

  // Wrong or unanswered questions go to the mistake notebook. Streak restarts at 0.
  const existing = new Map((await dbAll<MistakeRecord>("mistakes")).map((m) => [m.questionId, m]));
  let mistakesAdded = 0;
  for (const id of allIds) {
    const a = state.answers[id];
    if (a != null && a === correctPositions[id]) continue;
    const prev = existing.get(id);
    if (!prev) mistakesAdded++;
    await dbPut("mistakes", { questionId: id, streak: 0, addedAt: prev?.addedAt ?? Date.now(), lastAt: Date.now() } satisfies MistakeRecord);
  }

  await kvSet("activeExam", null);

  if (analyticsOptIn) {
    const reading = sections.find((s) => s.section === "READING")?.score ?? 0;
    const listening = sections.find((s) => s.section === "LISTENING")?.score ?? 0;
    // A fresh random token per attempt: not the install ID, not the local attempt ID.
    void submitAnalytics({
      attempt_token: uuid(),
      reading_score: reading,
      listening_score: listening,
      answers: allIds.map((id) => ({
        question_id: id,
        selected_position: state.answers[id] ?? null,
        correct: state.answers[id] != null && state.answers[id] === correctPositions[id],
      })),
    });
  }

  return { attempt, mistakesAdded };
}
