import type { ExamRules } from "../types";

export interface SectionScore {
  total: number; // questions in the section
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
}

type ScoringRules = Pick<ExamRules, "pointsPerQuestion" | "unansweredScore" | "sectionMaxPoints">;

/**
 * Scores one section. All numbers come from the rules config, never hard-coded.
 * answers: question id -> selected option position (missing = unanswered)
 * correctPositions: question id -> correct option position
 */
export function scoreSection(
  questionIds: string[],
  answers: Record<string, number | undefined>,
  correctPositions: Record<string, number>,
  rules: ScoringRules,
): SectionScore {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  for (const id of questionIds) {
    const a = answers[id];
    if (a == null) unanswered++;
    else if (a === correctPositions[id]) correct++;
    else wrong++;
  }
  const raw = correct * rules.pointsPerQuestion + unanswered * rules.unansweredScore;
  const score = Math.min(rules.sectionMaxPoints, Math.round(raw * 100) / 100);
  return { total: questionIds.length, correct, wrong, unanswered, score };
}

export const totalScore = (sections: SectionScore[]) =>
  Math.round(sections.reduce((sum, s) => sum + s.score, 0) * 100) / 100;
