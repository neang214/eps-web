import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 740 } });

test("Practice shows sets, saves the place, and continues where the learner stopped", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("lang-continue").click();
  await page.goto("/#/settings");
  await page.getByTestId("set-lang-en").click();
  await page.goto("/#/practice");

  // Reading tab is the default and lists Set 1
  await expect(page.getByTestId("practice-set-1")).toContainText("25");
  await expect(page.getByTestId("practice-set-1")).toContainText(/Not started/);

  // answer 2 questions, then leave
  await page.getByTestId("practice-open-1").click();
  await expect(page.getByTestId("set-progress")).toContainText("1 / 25");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /^1\./ }).first().click();
    await page.getByTestId("set-next").click();
  }
  await expect(page.getByTestId("set-progress")).toContainText("3 / 25");
  await page.goto("/#/practice");
  await expect(page.getByTestId("practice-set-1")).toContainText("2 of 25 done");

  // continue resumes at question 3; restart goes back to question 1
  await page.getByTestId("practice-open-1").click();
  await expect(page.getByTestId("set-progress")).toContainText("3 / 25");
  await page.goto("/#/practice");
  await page.getByTestId("practice-restart-1").click();
  await expect(page.getByTestId("set-progress")).toContainText("1 / 25");

  // Listening tab has its own sets
  await page.goto("/#/practice");
  await page.getByTestId("practice-tab-LISTENING").click();
  await expect(page.getByTestId("practice-set-1")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
