import { apiJson } from "./api";
import { kvGet, kvSet } from "./db";
import type { ExamRules } from "../types";

const isRules = (r: unknown): r is ExamRules => {
  const x = r as Partial<ExamRules> | null;
  return !!x && typeof x.pointsPerQuestion === "number" && Array.isArray(x.sectionOrder) && !!x.sectionMinutes && !!x.questionsPerSection;
};

/** Exam rules always come from GET /api/config/exam-rules. The last good copy is kept for offline use. */
export async function loadRules(): Promise<ExamRules | null> {
  try {
    const r = await apiJson<unknown>("/api/config/exam-rules", 6000);
    if (isRules(r)) {
      await kvSet("examRules", r);
      return r;
    }
  } catch {
    /* offline or server down: use the stored copy */
  }
  const cached = await kvGet<unknown>("examRules");
  return isRules(cached) ? cached : null;
}
