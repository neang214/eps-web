/* EPS Study service worker.
 * - App shell (HTML, JS, CSS, icons) is precached at install. The build fills in the list below.
 * - Fonts are cached the first time they are used.
 * - Audio is served from the "eps-audio" cache, which the app fills only when the learner taps Download.
 *   Nothing else about the API is cached here: packs and exam rules are stored by the app in IndexedDB.
 * - A new version waits until the old one is no longer in use, so an exam in progress is never interrupted.
 */
const VERSION = "__BUILD_ID__";
const SHELL_CACHE = "eps-shell-" + VERSION;
const FONT_CACHE = "eps-fonts";
const AUDIO_CACHE = "eps-audio";
// ignoreVary is used on every lookup: some servers send "Vary: Origin", which would otherwise make
// module-script requests miss the precached copy.
const PRECACHE = [/*__PRECACHE__*/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("eps-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function rangedResponse(request, cached) {
  const header = request.headers.get("range");
  if (!header) return cached;
  const buf = await cached.arrayBuffer();
  const size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(header);
  let start = 0;
  let end = size - 1;
  if (m) {
    if (m[1] === "" && m[2] !== "") {
      start = Math.max(0, size - parseInt(m[2], 10)); // suffix range: last N bytes
    } else {
      start = m[1] ? parseInt(m[1], 10) : 0;
      end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    }
  }
  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": "bytes " + start + "-" + end + "/" + size,
      "Content-Length": String(end - start + 1),
    },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Downloaded audio: use the offline copy when there is one, otherwise go to the network (never store it here).
  if (url.pathname.startsWith("/api/public/audio/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(AUDIO_CACHE);
        const hit = await cache.match(url.href, { ignoreVary: true });
        if (hit) return rangedResponse(request, hit);
        return fetch(request);
      })(),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // network only

  // Page loads: serve the cached shell straight away (it is small and versioned), so weak internet never blocks the app.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => (await cache.match("/index.html", { ignoreVary: true })) || fetch(request)),
    );
    return;
  }

  // Fonts: cache on first use.
  if (/\.(woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(request, { ignoreVary: true });
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Everything else from the shell: cache first, then network.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => (await cache.match(request, { ignoreVary: true })) || fetch(request)),
  );
});
