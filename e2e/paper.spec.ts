import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 740 } });

const questions: { id: string; pack_id: string; section: string; status: string; stem_ko: string }[] = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL("../../content/questions.json", import.meta.url)), "utf8"),
);
const firstOf = (section: string) =>
  questions.filter((q) => q.pack_id === "mock-1" && q.section === section && q.status === "PUBLISHED").sort((a, b) => a.id.localeCompare(b.id))[0];

test("learner starts Mock exam 1 from the list, in fixed order, switches section, and sees the attempt on the Exam page", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/exam");
  await expect(page.getByTestId("paper-mock-1")).toBeVisible();

  for (let round = 0; round < 2; round++) {
    await page.goto("/#/exam");
    await page.getByTestId("paper-mock-1").click();
    await expect(page.getByTestId("progress")).toContainText("1");
    const stem = await page.getByTestId("stem").innerText();
    expect(stem.replace(/\s+/g, "")).toContain(firstOf("READING").stem_ko.replace(/\s+/g, "").slice(0, 8));
    await expect(page.getByTestId("nav-20")).toBeVisible();
    await expect(page.getByTestId("nav-21")).toHaveCount(0);
    if (round === 0) {
      // leave this attempt unfinished, discard it and start again: the first question must be the same one
      await page.goto("/#/exam");
      await page.getByRole("button", { name: /Discard|បោះបង់/ }).click();
    }
  }

  await page.getByTestId("option-1").click();
  await page.getByTestId("section-tab-LISTENING").click(); // free switching, one shared clock
  await expect(page.getByTestId("stem")).toContainText(firstOf("LISTENING").stem_ko.replace(/\s+/g, " ").slice(0, 6));
  await page.getByTestId("option-1").click();
  await page.getByTestId("finish-exam").click();
  await page.getByTestId("confirm").click();
  await expect(page.getByTestId("total-score")).toContainText("/ 100");
  await expect(page.getByTestId("section-LISTENING")).toBeVisible();
  await expect(page.getByTestId("section-READING")).toBeVisible();

  // the learner is reminded to save a backup; saving downloads a file and hides the reminder everywhere
  await expect(page.getByTestId("backup-notice")).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("backup-save").click()]);
  expect(download.suggestedFilename()).toMatch(/^eps-study-progress-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByTestId("backup-notice")).toHaveCount(0);
  await page.goto("/#/");
  await expect(page.getByTestId("backup-notice")).toHaveCount(0);

  await page.goto("/#/exam");
  await expect(page.getByTestId("history-item")).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
