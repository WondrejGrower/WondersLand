// Tiny browser key/value cache: IndexedDB with a localStorage fallback.
// Rewritten for the web — no AsyncStorage, no native modules.
const DB_NAME = "wondersland";
const STORE = "kv";
const PREFIX = "wl:";

function hasIdb() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb open failed"));
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error ?? new Error("indexeddb request failed"));
  });
}

export async function getJson<T>(key: string): Promise<T | null> {
  const k = PREFIX + key;
  if (typeof window === "undefined") return null;
  if (hasIdb()) {
    try {
      const raw = await idb<string | undefined>("readonly", (s) => s.get(k));
      if (typeof raw === "string") return JSON.parse(raw) as T;
      return null;
    } catch {
      // fall through to localStorage
    }
  }
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  const k = PREFIX + key;
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  if (hasIdb()) {
    try {
      await idb("readwrite", (s) => s.put(raw, k));
      return;
    } catch {
      // fall through
    }
  }
  try {
    localStorage.setItem(k, raw);
  } catch {
    // storage full or blocked — cache is best-effort
  }
}

export async function removeKey(key: string): Promise<void> {
  const k = PREFIX + key;
  if (typeof window === "undefined") return;
  if (hasIdb()) {
    try {
      await idb("readwrite", (s) => s.delete(k));
      return;
    } catch {
      // fall through
    }
  }
  try {
    localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
