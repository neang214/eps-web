/// <reference types="vitest" />
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
// The repository root holds the single shared .env file (the API, Prisma and Vite all read it).
const rootDir = fileURLToPath(new URL("..", import.meta.url));

/**
 * Fills the service worker's precache list from the build output (HTML, JS, CSS, icons) and gives it a
 * build ID, so a new build always installs a fresh cache. Fonts are cached at runtime, not precached,
 * because the Korean font is split into many files that are only fetched when needed.
 */
function serviceWorkerPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "eps-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = path.join(outDir, "sw.js");
      if (!fs.existsSync(swPath)) return;
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
      const files = walk(outDir)
        .map((f) => "/" + path.relative(outDir, f).split(path.sep).join("/"))
        .filter((f) => f !== "/sw.js" && !/\.(woff2?|ttf|map)$/.test(f));
      const list = ["/", ...files];
      const hash = crypto.createHash("sha256");
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(outDir, f)));
      // The service worker's own logic is part of the build ID, so changing it also refreshes the cache.
      hash.update(fs.readFileSync(swPath));
      const src = fs
        .readFileSync(swPath, "utf8")
        .replace("/*__PRECACHE__*/", list.map((f) => JSON.stringify(f)).join(", "))
        .replace("__BUILD_ID__", hash.digest("hex").slice(0, 12));
      fs.writeFileSync(swPath, src);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  const apiTarget = process.env.API_TARGET ?? env.API_TARGET ?? `http://localhost:${env.PORT ?? 4000}`;
  const proxy = { "/api": { target: apiTarget, changeOrigin: true } };
  return {
    plugins: [react(), tailwindcss(), serviceWorkerPlugin()],
    envDir: rootDir,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    // Same-origin /api in dev and preview, so relative URLs behave like production.
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: { target: "es2020", sourcemap: false },
    test: { include: ["src/**/*.test.ts"], environment: "node" },
  };
});
