import { apiFetch, apiJson, audioUrl } from "./api";
import { dbAll, dbDelete, dbPut, kvGet, kvSet } from "./db";
import type { PackInfo, PackPayload } from "../types";

export const AUDIO_CACHE = "eps-audio";

export interface StoredPack {
  id: string;
  version: number;
  checksum: string;
  downloadedAt: number;
  audio_files: string[];
  payload: PackPayload;
}

export const getStoredPacks = () => dbAll<StoredPack>("packs");

export async function fetchPackList(): Promise<{ list: PackInfo[]; online: boolean }> {
  try {
    const list = await apiJson<PackInfo[]>("/api/packs", 6000);
    await kvSet("packList", list);
    return { list, online: true };
  } catch {
    return { list: (await kvGet<PackInfo[]>("packList")) ?? [], online: false };
  }
}

export async function fetchPackPayload(id: string): Promise<PackPayload> {
  return apiJson<PackPayload>(`/api/packs/${encodeURIComponent(id)}`, 15000);
}

/** Returns a reason string when downloads are blocked by the Wi-Fi-only setting, else null. */
export function wifiBlocked(wifiOnly: boolean): boolean {
  if (!wifiOnly) return false;
  const conn = (navigator as unknown as { connection?: { type?: string } }).connection;
  const type = conn?.type;
  // The connection type is only exposed by some browsers (Chrome on Android). If unknown, do not block.
  return !!type && type !== "wifi" && type !== "ethernet";
}

async function sha256Hex(buf: ArrayBuffer): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class DownloadError extends Error {
  constructor(public kind: "checksum" | "network") {
    super(kind);
  }
}

/** Downloads a pack and its audio for offline use. Only called when the learner taps Download. */
export async function downloadPack(info: PackInfo, onProgress: (pct: number) => void): Promise<void> {
  try {
    const res = await apiFetch(`/api/packs/${encodeURIComponent(info.id)}`, undefined, 30000);
    if (!res.ok) throw new DownloadError("network");
    const buf = await res.arrayBuffer();
    const sum = await sha256Hex(buf);
    if (sum && sum !== info.checksum) throw new DownloadError("checksum");
    const payload = JSON.parse(new TextDecoder().decode(buf)) as PackPayload;

    const files = info.audio_files ?? [];
    const cache = "caches" in globalThis ? await caches.open(AUDIO_CACHE) : null;
    const previous = (await getStoredPacks()).find((p) => p.id === info.id);
    let done = 0;
    onProgress(files.length ? 0 : 100);
    for (const f of files) {
      // "reload" skips the browser's own copy, so a pack download always brings the current audio.
      const r = await fetch(audioUrl(f, info.version), { cache: "reload" });
      if (!r.ok) throw new DownloadError("network");
      if (cache) await cache.put(audioUrl(f, info.version), r.clone());
      done++;
      onProgress(Math.round((done / files.length) * 100));
    }
    // Replace the pack only now that everything arrived, and only when the version changed.
    const stored: StoredPack = { id: info.id, version: info.version, checksum: info.checksum, downloadedAt: Date.now(), audio_files: files, payload };
    await dbPut("packs", stored);
    // The old version's audio is not used any more. It is removed only now that the new one is safely stored.
    if (cache && previous && previous.version !== info.version) {
      for (const f of previous.audio_files) await cache.delete(audioUrl(f, previous.version));
    }
  } catch (e) {
    if (e instanceof DownloadError) throw e;
    throw new DownloadError("network");
  }
}

export async function removePack(id: string): Promise<void> {
  const stored = (await getStoredPacks()).find((p) => p.id === id);
  if (stored && "caches" in globalThis) {
    const cache = await caches.open(AUDIO_CACHE);
    for (const f of stored.audio_files) await cache.delete(audioUrl(f, stored.version));
  }
  await dbDelete("packs", id);
}
