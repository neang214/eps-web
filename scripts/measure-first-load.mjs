// Measures what a first-time visitor downloads, with audio left out. The budget is 1 MB gzipped.
//
//   npm run build      (once, so dist/ exists)
//   npm run size
//
// How it works: it serves dist/ with `vite preview` and a small stand-in API, opens the app in a fresh
// 360x740 phone browser with no service worker and no cache, and adds up every response. Text files are
// measured gzipped (level 6, like a typical web server). Fonts and images are already compressed.
// It also counts the files the service worker downloads on install, because a real first visit does too.
// Needs Chromium: run `npx playwright install chromium` once, or set PW_CHROMIUM_PATH.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { preview } from "vite";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(webDir, "dist");
const BUDGET = 1_000_000;
const API_PORT = 4018;
const WEB_PORT = 4179;

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error("dist/ is missing. Run `npm run build` first.");
  process.exit(1);
}

// A stand-in API (the same one the Playwright test uses). Set before Vite reads its config.
process.env.FIXTURE_PORT = String(API_PORT);
process.env.API_TARGET = `http://127.0.0.1:${API_PORT}`;
await import("../e2e/fixture-server.mjs");

const server = await preview({ root: webDir, preview: { host: "127.0.0.1", port: WEB_PORT, strictPort: true } });
const origin = `http://127.0.0.1:${WEB_PORT}`;

const TEXT = /(html|javascript|css|json|svg|xml|webmanifest)/;
const wireSize = (type, body) => (TEXT.test(type) ? zlib.gzipSync(body, { level: 6 }).length : body.length);
const kind = (url, type) => {
  const p = new URL(url).pathname;
  if (p.startsWith("/api/public/audio/") || type.includes("audio")) return "audio";
  if (p.startsWith("/api/")) return "api";
  if (/\.woff2?$/.test(p)) return "fonts";
  if (/\.js$/.test(p)) return "javascript";
  if (/\.css$/.test(p)) return "css";
  if (/\.(png|svg|ico)$/.test(p)) return "images";
  return "html and other";
};

const seen = new Map(); // url -> { kind, bytes }
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
let failed = false;
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: "block" });
  const page = await context.newPage();
  page.on("response", async (res) => {
    try {
      if (!res.url().startsWith(origin) || res.status() >= 400) return;
      const type = res.headers()["content-type"] ?? "";
      const body = await res.body();
      seen.set(res.url(), { kind: kind(res.url(), type), bytes: wireSize(type, body) });
    } catch {
      /* a response that was cancelled mid-flight is not counted */
    }
  });

  const total = (skip = new Set()) =>
    [...seen.entries()].filter(([, v]) => v.kind !== "audio" && !skip.has(v.kind)).reduce((n, [, v]) => n + v.bytes, 0);

  // The first screen, then Home.
  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.getByTestId("lang-continue").click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // What the service worker also downloads when it installs (icons, manifest, anything not requested by the page).
  const swSource = fs.readFileSync(path.join(distDir, "sw.js"), "utf8");
  const list = /const PRECACHE = \[(.*?)\];/s.exec(swSource)?.[1] ?? "";
  for (const url of [...list.matchAll(/"([^"]+)"/g)].map((m) => m[1])) {
    const full = origin + (url === "/" ? "/" : url);
    if (seen.has(full) || seen.has(origin + "/index.html") && url === "/") continue;
    const file = path.join(distDir, url);
    if (!fs.existsSync(file)) continue;
    const body = fs.readFileSync(file);
    const type = /\.(js|css|html|json|svg|webmanifest)$/.test(url) ? "text/" + path.extname(url).slice(1) : "binary";
    seen.set(full, { kind: kind(full, type), bytes: wireSize(type, body) });
  }
  const firstScreen = total();

  // Worst case for a first session: visit every main screen. Lazy chunks and fonts for new characters load here.
  for (const route of ["vocab", "lessons", "practice", "exam", "notebook", "settings", "more"]) {
    await page.goto(`${origin}/#/${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
  }
  const afterEverything = total();

  const groups = new Map();
  for (const v of seen.values()) {
    if (v.kind === "audio") continue;
    const g = groups.get(v.kind) ?? { files: 0, bytes: 0 };
    g.files += 1;
    g.bytes += v.bytes;
    groups.set(v.kind, g);
  }
  const kb = (n) => `${(n / 1000).toFixed(1)} KB`.padStart(10);
  console.log("\nDownloaded by a first-time visitor (audio excluded, gzip where it applies)");
  for (const [name, g] of [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${name.padEnd(16)} ${String(g.files).padStart(3)} files ${kb(g.bytes)}`);
  }
  console.log(`\n  First screen + Home:                ${kb(firstScreen)}`);
  console.log(`  After visiting every main screen:   ${kb(afterEverything)}`);
  console.log(`  Budget:                             ${kb(BUDGET)}`);
  failed = afterEverything > BUDGET;
  console.log(failed ? "\nOVER BUDGET" : "\nWithin budget.");
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
