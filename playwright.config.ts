import { defineConfig } from "@playwright/test";

// Set PW_CHROMIUM_PATH to use an already installed Chromium. Otherwise run `npx playwright install chromium` once.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: { executablePath },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      // Builds the sample content pack, then starts the fixture API (no database needed).
      command: "npm --prefix ../content run build && node e2e/fixture-server.mjs",
      url: "http://127.0.0.1:4010/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // The production build, so the service worker and bundle behave like the real app.
      command: "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { API_TARGET: "http://127.0.0.1:4010" },
    },
  ],
});
