// Tiny IndexedDB wrapper. All learner data lives here, on the device. Falls back to memory if
// IndexedDB is unavailable (for example some private-browsing modes).
export type StoreName = "kv" | "cards" | "attempts" | "mistakes" | "flags" | "lessons" | "packs";

const KEY_PATHS: Record<StoreName, string | null> = {
  kv: null,
  cards: "id",
  attempts: "id",
  mistakes: "questionId",
  flags: "questionId",
  lessons: "unitId",
  packs: "id",
};
const DB_NAME = "eps-study";
const DB_VERSION = 1;

const memory: Record<StoreName, Map<string, unknown>> = {
  kv: new Map(), cards: new Map(), attempts: new Map(), mistakes: new Map(), flags: new Map(), lessons: new Map(), packs: new Map(),
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === "undefined") return resolve(null);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          (Object.keys(KEY_PATHS) as StoreName[]).forEach((name) => {
            if (!db.objectStoreNames.contains(name)) {
              const kp = KEY_PATHS[name];
              db.createObjectStore(name, kp ? { keyPath: kp } : undefined);
            }
          });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const keyOf = (store: StoreName, value: unknown, key?: string): string => {
  const kp = KEY_PATHS[store];
  return kp ? String((value as Record<string, unknown>)[kp]) : String(key);
};

export async function dbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return memory[store].get(key) as T | undefined;
  return (await wrap(db.transaction(store).objectStore(store).get(key))) as T | undefined;
}

export async function dbPut(store: StoreName, value: unknown, key?: string): Promise<void> {
  const db = await open();
  if (!db) {
    memory[store].set(keyOf(store, value, key), value);
    return;
  }
  const os = db.transaction(store, "readwrite").objectStore(store);
  await wrap(KEY_PATHS[store] ? os.put(value) : os.put(value, key));
}

export async function dbAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  if (!db) return [...memory[store].values()] as T[];
  return (await wrap(db.transaction(store).objectStore(store).getAll())) as T[];
}

export async function dbDelete(store: StoreName, key: string): Promise<void> {
  const db = await open();
  if (!db) {
    memory[store].delete(key);
    return;
  }
  await wrap(db.transaction(store, "readwrite").objectStore(store).delete(key));
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await open();
  if (!db) {
    memory[store].clear();
    return;
  }
  await wrap(db.transaction(store, "readwrite").objectStore(store).clear());
}

export const kvGet = <T>(key: string) => dbGet<T>("kv", key);
export const kvSet = (key: string, value: unknown) => dbPut("kv", value, key);

export function uuid(): string {
  const c = globalThis.crypto as Crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
