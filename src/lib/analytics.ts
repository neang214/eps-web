import { apiPost } from "./api";
import { kvGet, kvSet } from "./db";

export interface AnalyticsPayload {
  attempt_token: string;
  reading_score: number;
  listening_score: number;
  answers: { question_id: string; selected_position: number | null; correct: boolean }[];
}

const QUEUE_KEY = "analyticsQueue";

async function send(p: AnalyticsPayload): Promise<boolean> {
  try {
    const res = await apiPost("/api/analytics/answers", p);
    // 4xx means the server will never accept it; drop it. Network errors and 5xx are retried later.
    return res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429);
  } catch {
    return false;
  }
}

/** Sends one anonymous record set for an attempt. Failed sends are kept and retried on the next launch. */
export async function submitAnalytics(p: AnalyticsPayload): Promise<void> {
  if (await send(p)) return;
  const queue = (await kvGet<AnalyticsPayload[]>(QUEUE_KEY)) ?? [];
  await kvSet(QUEUE_KEY, [...queue, p].slice(-20));
}

export async function flushAnalyticsQueue(): Promise<void> {
  const queue = (await kvGet<AnalyticsPayload[]>(QUEUE_KEY)) ?? [];
  if (!queue.length) return;
  const rest: AnalyticsPayload[] = [];
  for (const p of queue) if (!(await send(p))) rest.push(p);
  await kvSet(QUEUE_KEY, rest);
}
