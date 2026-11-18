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

test("Lessons hub holds Hangul, Numbers, Words, Grammar and Situations", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();

  // bottom bar: Home, Lessons, Practice, Exam
  await expect(page.locator("nav.fixed a")).toHaveCount(4);
  await expect(page.locator("nav.fixed a").filter({ hasText: km.nav.lessons })).toBeVisible();

  await page.goto("/#/lessons");
  for (const id of ["hangul", "numbers", "words", "grammar", "situations"]) {
    await expect(page.getByTestId(`hub-${id}`)).toBeVisible();
  }
  await noOverflow(page, "lessons hub (Khmer)");

  // old addresses still work
  await page.goto("/#/vocab");
  await expect(page).toHaveURL(/#\/lessons\/words$/);
  await page.goto("/#/grammar");
  await expect(page).toHaveURL(/#\/lessons\/grammar$/);
});

test("Words are grouped by industry and can be reviewed per industry", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/lessons/words");
  await expect(page.getByTestId("industry-all")).toBeVisible();
  for (const tag of ["general", "chemicals", "metals", "food", "electronics", "workplace-safety"]) {
    await expect(page.getByTestId(`industry-${tag}`)).toBeVisible();
  }
  await noOverflow(page, "words home (Khmer)");

  await page.getByTestId("industry-general").click();
  await expect(page).toHaveURL(/#\/lessons\/words\/general$/);
  await expect(page.getByRole("heading", { name: km.tags.general })).toBeVisible();
  await page.locator("li.card button[aria-expanded]").first().click();
  await noOverflow(page, "industry word list (Khmer)");

  await page.getByTestId("review-industry").click();
  await expect(page).toHaveURL(/#\/lessons\/words\/review\?tag=general$/);
  await expect(page.getByRole("button", { name: km.vocab.showAnswer })).toBeVisible();
  await noOverflow(page, "industry review (Khmer)");

  // search across all words from the words home
  await page.goto("/#/lessons/words");
  await page.getByRole("searchbox").fill("zzzzqqq");
  await expect(page.getByText(km.vocab.noResults)).toBeVisible();
});

test("Long word lists are split into pages of 50 with Previous and Next", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/lessons/words/all");
  const cards = page.locator("li.card button[aria-expanded]");
  await expect(cards).toHaveCount(50);
  await expect(page.getByTestId("prev-bottom")).toBeDisabled();
  await page.getByTestId("next-bottom").click();
  await expect(cards).toHaveCount(50);
  await expect(page.getByTestId("prev-bottom")).toBeEnabled();
  // jump to the last page: only the rest of the words are shown, and Next is off
  const select = page.getByTestId("page-select-bottom");
  const last = await select.locator("option").last().getAttribute("value");
  await select.selectOption(last ?? "1");
  await expect(page.getByTestId("next-bottom")).toBeDisabled();
  expect(await cards.count()).toBeLessThanOrEqual(50);
  // a new search starts again on page 1
  await page.getByRole("searchbox").fill("다");
  await expect(page.getByTestId("prev-top")).toBeDisabled();
  await expect(cards).toHaveCount(50);
  await noOverflow(page, "word list with pages (Khmer)");
});

test("Hangul and Numbers keep an 'I know this' mark and show progress", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/lessons/hangul");
  await expect(page.getByRole("status").filter({ hasText: /0/ }).first()).toBeVisible();
  await page.locator("li.card button[aria-expanded]").first().click();
  const mark = page.locator("[data-testid^='learned-']").first();
  await expect(mark).toHaveAttribute("aria-pressed", "false");
  await mark.click();
  await expect(mark).toHaveAttribute("aria-pressed", "true");

  // the mark is still there after a reload, and the hub counts it
  await page.reload();
  await page.locator("li.card button[aria-expanded]").first().click();
  await expect(page.locator("[data-testid^='learned-']").first()).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#/lessons");
  await expect(page.getByTestId("hub-hangul")).toContainText("1");

  await page.goto("/#/lessons/numbers");
  const nmark = page.locator("[data-testid^='learned-']").first();
  await nmark.click();
  await expect(nmark).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page, "numbers with marks (Khmer)");
});

test("Hangul and Numbers lessons open, show audio buttons and fit a phone", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();

  await page.goto("/#/lessons/hangul");
  await expect(page.getByRole("heading", { name: km.hangul.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: km.hangul.group.consonant, exact: true })).toBeVisible();
  await page.getByTestId("hangul-H-0001").getByRole("button", { expanded: false }).click();
  await expect(page.getByRole("button", { name: km.hangul.listenSound })).toBeVisible();
  await expect(page.getByRole("button", { name: km.hangul.listenWord })).toBeVisible();
  await noOverflow(page, "hangul letter open (Khmer)");

  await page.goto("/#/lessons/numbers");
  await expect(page.getByRole("heading", { name: km.numbers.title, level: 1 })).toBeVisible();
  await expect(page.getByTestId("number-N-0001")).toBeVisible();
  await noOverflow(page, "numbers sino (Khmer)");
  for (const g of ["native", "counter", "usage"]) {
    await page.getByTestId(`numbers-tab-${g}`).click();
    await noOverflow(page, `numbers ${g} (Khmer)`);
  }

  // English
  await page.goto("/#/settings");
  await page.getByTestId("set-lang-en").click();
  await page.goto("/#/lessons/numbers");
  await expect(page.getByRole("heading", { name: en.numbers.title, level: 1 })).toBeVisible();
  await page.getByTestId("numbers-tab-usage").click();
  await noOverflow(page, "numbers usage (English)");
  await page.goto("/#/lessons/hangul");
  await noOverflow(page, "hangul (English)");
});
