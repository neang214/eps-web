// Test data for the end-to-end test. The seed data has only 5 + 5 sample questions, so a full 40-question
// mock exam needs more. This file generates 20 + 20 clearly marked SAMPLE questions ("e2e-pack") and also
// serves the real sample pack built by `npm run build` in /content.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const contentDir = path.resolve(here, "../../content");
export const rulesFile = path.resolve(here, "../../api/config/exam-rules.json");

const AUDIO = ["L-0001.mp3", "L-0002.mp3", "L-0003.mp3", "L-0004.mp3", "L-0005.mp3"];

function makeQuestion(section, n) {
  const prefix = section === "READING" ? "R" : "L";
  const id = `${prefix}-${1000 + n}`;
  const correct = ((n * 3) % 4) + 1;
  const stimulus =
    section === "LISTENING"
      ? { id: `S-${id}`, type: "AUDIO", text_ko: null, text_km: null, text_en: null, audio_file: AUDIO[n % AUDIO.length], image_file: null }
      : null;
  const question = {
    id,
    pack_id: "e2e-pack",
    section,
    item_type: "e2e-fixture",
    stimulus_id: stimulus ? stimulus.id : null,
    stem_ko: `[샘플] 시험용 문제 ${id}. 알맞은 것을 고르십시오.`,
    stem_km: `[គំរូ] សំណួរសាកល្បង ${id}។ សូមជ្រើសរើសចម្លើយដែលសមស្រប។`,
    stem_en: `[SAMPLE] Test question ${id}. Choose the best answer.`,
    explanation_km: `ចម្លើយត្រឹមត្រូវគឺជម្រើសទី ${correct}។ នេះជាសំណួរគំរូសម្រាប់ការសាកល្បងប៉ុណ្ណោះ។`,
    explanation_en: `The correct answer is option ${correct}. This is a sample question for testing only.`,
    industry_tags: ["general"],
    edition: "e2e",
    difficulty: 1,
    status: "PUBLISHED",
    is_sample: true,
    options: [1, 2, 3, 4].map((p) => ({
      position: p,
      text_ko: `보기 ${p}`,
      text_km: `ជម្រើស ${p}`,
      text_en: `Option ${p}`,
      is_correct: p === correct,
    })),
  };
  return { question, stimulus };
}

export function buildE2ePack() {
  const questions = [];
  const stimuli = [];
  for (let n = 1; n <= 20; n++) {
    questions.push(makeQuestion("READING", n).question);
  }
  for (let n = 1; n <= 20; n++) {
    const { question, stimulus } = makeQuestion("LISTENING", n);
    questions.push(question);
    stimuli.push(stimulus);
  }
  const payload = {
    id: "e2e-pack",
    name: "E2E test pack (generated sample questions)",
    version: 1,
    published_at: "2026-10-15T00:00:00.000Z",
    stimuli,
    questions,
    vocab: [],
    units: [],
  };
  const body = JSON.stringify(payload);
  return {
    body,
    info: {
      id: payload.id,
      name: payload.name,
      version: payload.version,
      checksum: crypto.createHash("sha256").update(body).digest("hex"),
      published_at: payload.published_at,
      bytes: Buffer.byteLength(body),
      audio_files: [...new Set(stimuli.map((s) => s.audio_file))].sort(),
    },
  };
}

/** The real sample pack from /content/dist (run `npm run build` in /content first). */
export function loadSamplePacks() {
  const indexFile = path.join(contentDir, "dist", "index.json");
  if (!fs.existsSync(indexFile)) throw new Error("content/dist/index.json is missing. Run `npm run build` in /content first.");
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  return index.map((info) => ({ info, body: fs.readFileSync(path.join(contentDir, "dist", `${info.id}.json`), "utf8") }));
}

export function allPacks() {
  return [...loadSamplePacks(), buildE2ePack()];
}

export const normalize = (s) => s.replace(/\s+/g, " ").trim();

/**
 * Map of normalised Korean stem -> list of candidates { correct, options }, across every pack the app will load.
 * A stem can repeat (a real exam repeats "choose the best answer"), so the options are kept to tell them apart.
 */
export function correctByStem() {
  const map = new Map();
  for (const pack of allPacks()) {
    for (const q of JSON.parse(pack.body).questions) {
      const key = normalize(q.stem_ko);
      const list = map.get(key) ?? [];
      list.push({
        correct: q.options.find((o) => o.is_correct).position,
        options: q.options.map((o) => normalize(o.text_ko)),
      });
      map.set(key, list);
    }
  }
  return map;
}

/** Picks the right candidate for the question on screen. `shown` is the text of the four options as displayed. */
export function pickCorrect(candidates, shown) {
  if (!candidates || candidates.length === 0) return undefined;
  const match = candidates.find((c) => c.options.every((o, i) => normalize(shown[i] ?? "").includes(o)));
  return (match ?? (candidates.length === 1 ? candidates[0] : undefined))?.correct;
}

export const readRules = () => JSON.parse(fs.readFileSync(rulesFile, "utf8"));
