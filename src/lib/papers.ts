// Fixed papers: a pack named `mock-*` is served in the order of its question IDs, not at random.
import type { ExamRules, Question, Section } from "../types";

export const isPaperPack = (packId: string) => /^mock-/.test(packId);

export interface PaperInfo {
  packId: string;
  counts: Record<Section, number>; // questions the paper will use per section (capped by the rules)
}

const bySectionAndId = (questions: Question[], packId: string, section: Section) =>
  questions.filter((q) => q.pack_id === packId && q.section === section).sort((a, b) => a.id.localeCompare(b.id));

/** Papers that have at least one question, in pack ID order. */
export function listPapers(questions: Question[], rules: Pick<ExamRules, "questionsPerSection">): PaperInfo[] {
  const ids = [...new Set(questions.map((q) => q.pack_id).filter(isPaperPack))].sort();
  return ids
    .map((packId) => ({
      packId,
      counts: {
        READING: Math.min(rules.questionsPerSection.READING, bySectionAndId(questions, packId, "READING").length),
        LISTENING: Math.min(rules.questionsPerSection.LISTENING, bySectionAndId(questions, packId, "LISTENING").length),
      },
    }))
    .filter((p) => p.counts.READING + p.counts.LISTENING > 0);
}

/** Question IDs for the wanted sections, in fixed order. Sections that were not asked for are left empty. */
export function paperPicks(
  questions: Question[],
  packId: string,
  wanted: Section[],
  rules: Pick<ExamRules, "questionsPerSection">,
): Record<Section, string[]> {
  const pick = (s: Section) =>
    wanted.includes(s) ? bySectionAndId(questions, packId, s).slice(0, rules.questionsPerSection[s]).map((q) => q.id) : [];
  return { READING: pick("READING"), LISTENING: pick("LISTENING") };
}
