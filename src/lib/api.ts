export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.PROD ? "https://eps-study-api.onrender.com" : "");

export const apiUrl = (p: string) => `${API_BASE}${p}`;
/**
 * Address of one MP3 file. `version` is the content pack version. It is part of the address, so when a pack is
 * updated (for example after new audio was made) phones ask for the new file and never reuse an old copy.
 */
export const audioUrl = (file: string, version?: number) =>
  apiUrl(`/api/public/audio/${encodeURIComponent(file)}${version === undefined ? "" : `?v=${version}`}`);

export async function apiFetch(path: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(apiUrl(path), { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiJson<T>(path: string, timeoutMs?: number): Promise<T> {
  const res = await apiFetch(path, undefined, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function apiPost(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
