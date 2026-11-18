// Small stand-in for the API, used only by the Playwright test. It serves the same routes the app calls
// (exam rules, packs, audio) from files, and records what the app posts so the test can check privacy rules.
// It needs no database. The real API is covered by its own tests in /api.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { allPacks, contentDir, rulesFile } from "./fixture-data.mjs";

const port = Number(process.env.FIXTURE_PORT ?? 4010);
const packs = new Map(allPacks().map((p) => [p.info.id, p]));
const posts = { reports: [], analytics: [] };

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "null"));
      } catch {
        resolve(null);
      }
    });
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const p = url.pathname;

  if (p === "/api/health") return send(res, 200, { ok: true });
  if (p === "/api/config/exam-rules") return send(res, 200, fs.readFileSync(rulesFile));
  if (p === "/api/packs" && req.method === "GET") return send(res, 200, [...packs.values()].map((x) => x.info));

  const pack = /^\/api\/packs\/([a-z0-9-]+)$/.exec(p);
  if (pack && req.method === "GET") {
    const found = packs.get(pack[1]);
    return found ? send(res, 200, found.body) : send(res, 404, { error: "Pack not found" });
  }

  const audio = /^\/api\/public\/audio\/([A-Za-z0-9._-]+\.mp3)$/.exec(p);
  if (audio && req.method === "GET") {
    const file = path.join(contentDir, "audio", audio[1]);
    return fs.existsSync(file) ? send(res, 200, fs.readFileSync(file), "audio/mpeg") : send(res, 404, { error: "No audio" });
  }

  if (p === "/api/reports" && req.method === "POST") {
    posts.reports.push(await readBody(req));
    return send(res, 201, { id: posts.reports.length });
  }
  if (p === "/api/analytics/answers" && req.method === "POST") {
    posts.analytics.push(await readBody(req));
    return send(res, 201, { ok: true });
  }
  if (p === "/__e2e/posts") return send(res, 200, posts);

  return send(res, 404, { error: "Not found" });
});

server.listen(port, "127.0.0.1", () => console.log(`E2E fixture API on http://127.0.0.1:${port}`));
