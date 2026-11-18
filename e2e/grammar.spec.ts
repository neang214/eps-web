import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 360, height: 740 } });

const locale = (n: string) => JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../locales/${n}.json`, import.meta.url)), "utf8"));
const km = locale("km");
const en = locale("en");

async function noOverflow(page: Page, where: string) {
  const bad = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > w) out.push(`page ${document.documentElement.scrollWidth}px > ${w}px`);
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      if (el.closest(".sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > w + 1 || r.left < -1)) out.push(`${el.tagName} "${(el.textContent ?? "").slice(0, 30)}"`);
    }
    return out.slice(0, 5);
  });
  expect(bad, `overflow on ${where}`).toEqual([]);
}

test("learner browses grammar patterns on a phone", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/lessons/grammar");
  await expect(page.getByRole("heading", { name: km.grammar.title })).toBeVisible();
  await expect(page.getByText(/គំរូប្រយោគ \d+/)).toBeVisible();
  await noOverflow(page, "grammar list (Khmer)");

  // filter by level and type
  await page.getByRole("button", { name: km.grammar.level.replace("{n}", "1"), exact: true }).click();
  await page.getByRole("button", { name: km.grammar.cat.particle, exact: true }).click();
  await noOverflow(page, "grammar filtered (Khmer)");

  // open the first card
  const first = page.locator("li.card button[aria-expanded]").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: km.grammar.examples })).toBeVisible();
  await noOverflow(page, "grammar card open (Khmer)");

  // search with no match
  await page.getByRole("searchbox").fill("zzzzqqq");
  await expect(page.getByText(km.grammar.noResults)).toBeVisible();

  // English
  await page.goto("/#/settings");
  await page.getByTestId("set-lang-en").click();
  await page.goto("/#/lessons/grammar");
  await expect(page.getByRole("heading", { name: en.grammar.title })).toBeVisible();
  await page.locator("li.card button[aria-expanded]").first().click();
  await noOverflow(page, "grammar card open (English)");
});

test("learner takes a grammar quiz, sees the score, and the pattern shows its best", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/lessons/grammar");
  await page.locator("li.card button[aria-expanded]").first().click();
  await page.locator("[data-testid^='quiz-G-']").first().click();
  await expect(page).toHaveURL(/#\/lessons\/grammar\/quiz\?p=G-/);
  for (let i = 0; i < 3; i++) {
    await expect(page.getByTestId("quiz-card")).toBeVisible();
    await expect(page.locator("[data-testid^='quiz-option-']")).toHaveCount(4);
    await page.getByTestId("quiz-option-0").click();
    await noOverflow(page, "grammar quiz question (Khmer)");
    await page.getByTestId("quiz-next").click();
  }
  await expect(page.getByTestId("quiz-result")).toBeVisible();
  await page.goto("/#/lessons/grammar");
  await expect(page.locator("li.card").first()).toContainText("/3");

  // the mixed quiz has 10 questions
  await page.getByTestId("quiz-all").click();
  await expect(page.getByTestId("quiz-card")).toContainText("10");
});
