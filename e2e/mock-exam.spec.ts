import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
// @ts-expect-error plain JS helper shared with the fixture server
import { correctByStem, normalize, pickCorrect, readRules } from "./fixture-data.mjs";

// A narrow Android phone. Every screen in this test must fit without sideways scrolling,
// in Khmer and in English, with Korean question text.
test.use({ viewport: { width: 360, height: 740 } });

const readLocale = (name: string) => JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../locales/${name}.json`, import.meta.url)), "utf8"));
const km = readLocale("km");
const en = readLocale("en");
const answerLookup: Map<string, { correct: number; options: string[] }[]> = correctByStem();
const rules = readRules();

async function expectNoOverflow(page: Page, where: string) {
  const problems = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > width) out.push(`page is ${document.documentElement.scrollWidth}px wide, screen is ${width}px`);
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      if (el.closest(".sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > width + 1 || r.left < -1)) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").slice(0, 30)}" spans ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
    return out.slice(0, 5);
  });
  expect(problems, `sideways overflow on ${where}`).toEqual([]);
}

/** The correct option position for the question on screen (stem plus option texts, because stems can repeat). */
async function correctForCurrent(page: Page): Promise<{ stem: string; correct: number | undefined }> {
  const stem = normalize(await page.getByTestId("stem").innerText());
  const shown: string[] = [];
  for (let p = 1; p <= 4; p++) shown.push(await page.getByTestId(`option-${p}`).innerText());
  return { stem, correct: pickCorrect(answerLookup.get(stem), shown) };
}

/** Answers every question of the active section. Questions with an overall index below `correctUpTo` get the right answer. */
async function answerSection(page: Page, count: number, firstIndex: number, correctUpTo: number) {
  for (let i = 0; i < count; i++) {
    const { stem, correct } = await correctForCurrent(page);
    expect(correct, `no fixture answer for: ${stem}`).toBeTruthy();
    const choice = firstIndex + i < correctUpTo ? correct! : (correct! % 4) + 1;
    await page.getByTestId(`option-${choice}`).click();
    if (i < count - 1) {
      await page.getByTestId("next").click();
      await expect(page.getByTestId(`nav-${i + 2}`)).toHaveAttribute("aria-current", "true");
    }
  }
}

async function answerOneCorrectly(page: Page) {
  const { stem, correct } = await correctForCurrent(page);
  expect(correct, `no fixture answer for: ${stem}`).toBeTruthy();
  await page.getByTestId(`option-${correct}`).click();
}

test("learner takes a full mock exam and sees results out of 100", async ({ page }) => {
  const perQuestion: number = rules.pointsPerQuestion;
  const sectionMax: number = rules.sectionMaxPoints;
  const totalMax = sectionMax * rules.sectionOrder.length;
  const readingCount: number = rules.questionsPerSection.READING;
  const listeningCount: number = rules.questionsPerSection.LISTENING;

  // ---- First launch: choose Khmer ----
  await page.goto("/");
  await expect(page.getByTestId("lang-km")).toBeVisible();
  await expectNoOverflow(page, "onboarding");
  await page.getByTestId("lang-continue").click();
  await expect(page.getByText(km.guest.notice)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "km");
  await expectNoOverflow(page, "home (Khmer)");

  // ---- Exam guide in Khmer ----
  await page.goto("/#/exam");
  await expect(page.getByText(km.exam.guideRelative)).toBeVisible();
  await expectNoOverflow(page, "exam guide (Khmer)");

  // ---- Switch to English and read the exact guide sentence ----
  await page.goto("/#/settings");
  await expectNoOverflow(page, "settings (Khmer)");
  await page.getByTestId("set-lang-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/#/exam");
  await expect(page.getByText("Results are ranked against other candidates in your industry. Compare with your own past attempts.")).toBeVisible();
  await expect(page.getByText(/\b(pass|passing|fail)\b/i)).toHaveCount(0); // never a pass/fail line
  await expectNoOverflow(page, "exam guide (English)");

  // ---- Attempt 1: answer all 40 questions; the first 30 correctly ----
  await page.getByTestId("start-exam").click();
  await expect(page.getByTestId("exam-screen")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText(/^\d\d:\d\d$/);
  await expectNoOverflow(page, "exam screen (English)");
  await answerSection(page, readingCount, 0, 30);
  await expect(page.getByTestId("finish-section")).toHaveCount(0); // free mode: no per-section finish
  await page.getByTestId("section-tab-LISTENING").click();
  await expect(page.getByTestId("nav-1")).toHaveAttribute("aria-current", "true");
  await answerSection(page, listeningCount, readingCount, 30);
  await page.getByTestId("finish-exam").click();
  await expectNoOverflow(page, "submit confirmation");
  await page.getByTestId("confirm").click();

  // ---- Results ----
  const correctReading = Math.min(readingCount, 30);
  const correctListening = 30 - correctReading;
  const readingScore = correctReading * perQuestion;
  const listeningScore = correctListening * perQuestion;
  await expect(page.getByTestId("total-score")).toHaveText(`${readingScore + listeningScore} / ${totalMax}`);
  await expect(page.getByTestId("section-READING")).toContainText(`${readingScore} / ${sectionMax}`);
  await expect(page.getByTestId("section-LISTENING")).toContainText(`${listeningScore} / ${sectionMax}`);
  await expect(page.locator('[data-testid^="review-"]')).toHaveCount(readingCount + listeningCount);
  await expectNoOverflow(page, "results (English)");
  expect((await page.request.get("http://127.0.0.1:4010/__e2e/posts")).ok()).toBeTruthy();
  const afterFirst = await (await page.request.get("http://127.0.0.1:4010/__e2e/posts")).json();
  expect(afterFirst.analytics, "nothing is sent unless the learner opts in").toHaveLength(0);

  // ---- Mistake notebook: 10 wrong answers; two correct retries in a row remove one ----
  await page.goto("/#/mistakes");
  const items = page.getByTestId("mistake-item");
  await expect(items).toHaveCount(40 - 30);
  for (let round = 0; round < 2; round++) {
    await items.first().getByRole("link").click();
    await answerOneCorrectly(page);
    await page.getByRole("button", { name: en.common.finish }).click();
    await page.goto("/#/mistakes");
  }
  await expect(items).toHaveCount(40 - 30 - 1);

  // ---- Opt in to anonymous statistics, then take attempt 2 in Khmer with most questions unanswered ----
  await page.goto("/#/settings");
  await expect(page.getByText(en.settings.analyticsNotice)).toBeVisible();
  await page.locator("#s-an").check();
  await page.getByTestId("set-lang-km").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "km");
  await page.goto("/#/exam");
  await page.getByTestId("start-exam").click();
  await expect(page.getByTestId("exam-screen")).toBeVisible();
  await answerOneCorrectly(page);
  await page.getByTestId("next").click();
  await answerOneCorrectly(page);
  await page.getByTestId("flag").click();
  await expect(page.getByTestId("nav-2")).toHaveAttribute("aria-label", new RegExp(km.exam.flaggedState));
  await expect(page.getByTestId("nav-1")).toHaveAttribute("aria-label", new RegExp(km.exam.answeredState));
  await expect(page.getByTestId("nav-3")).toHaveAttribute("aria-label", new RegExp(km.exam.unansweredState));
  await expectNoOverflow(page, "exam screen (Khmer)");
  await page.getByTestId("finish-exam").click();
  const unanswered = readingCount + listeningCount - 2;
  await expect(page.getByRole("dialog")).toContainText(String(unanswered)); // unanswered questions in every open section
  await expectNoOverflow(page, "submit confirmation (Khmer)");
  await page.getByTestId("confirm").click();
  await expect(page.getByTestId("total-score")).toHaveText(`${2 * perQuestion} / ${totalMax}`); // unanswered questions score 0
  await expectNoOverflow(page, "results (Khmer)");

  // ---- Exactly one anonymous record set was sent, with no identifiers ----
  await expect
    .poll(async () => (await (await page.request.get("http://127.0.0.1:4010/__e2e/posts")).json()).analytics.length)
    .toBe(1);
  const posts = await (await page.request.get("http://127.0.0.1:4010/__e2e/posts")).json();
  expect(posts.reports).toHaveLength(0);
  const sent = posts.analytics[0];
  expect(Object.keys(sent).sort()).toEqual(["answers", "attempt_token", "listening_score", "reading_score"]);
  expect(sent.attempt_token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  expect(sent.reading_score + sent.listening_score).toBe(2 * perQuestion);
  expect(sent.answers).toHaveLength(readingCount + listeningCount);
  expect(sent.answers.filter((a: { selected_position: number | null }) => a.selected_position === null)).toHaveLength(unanswered);
  for (const a of sent.answers) expect(Object.keys(a).sort()).toEqual(["correct", "question_id", "selected_position"]);

  // ---- History and Home ----
  await page.goto("/#/history");
  await expect(page.getByTestId("history-item")).toHaveCount(2);
  await expectNoOverflow(page, "history (Khmer)");
  await page.goto("/#/");
  await expect(page.getByTestId("last-mock")).toHaveText(`${2 * perQuestion} / ${totalMax}`);
});
