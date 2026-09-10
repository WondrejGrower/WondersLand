import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the IndexedDB/localStorage cache.
const store = new Map<string, unknown>();

vi.mock("./storage", () => ({
  getJson: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
  setJson: vi.fn(async (key: string, value: unknown) => void store.set(key, value)),
  purgeKey: vi.fn(async (key: string) => void store.delete(key)),
  removeKey: vi.fn(async (key: string) => void store.delete(key)),
}));

import { readTrustedSession, SESSION_KEY, SESSION_VERSION, writeSession } from "./session";

// A disposable throwaway hex value standing in for a mistakenly pasted secret.
const DISPOSABLE_SECRET_HEX = "d".repeat(64);

beforeEach(() => {
  store.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
});
afterEach(() => vi.unstubAllGlobals());

describe("legacy session invalidation (audit F1)", () => {
  it("drops an unversioned session and never returns its value", async () => {
    store.set(SESSION_KEY, { pubkey: DISPOSABLE_SECRET_HEX, method: "npub" });

    const session = await readTrustedSession();

    expect(session).toBeNull();
    expect(store.has(SESSION_KEY)).toBe(false);
    expect(JSON.stringify([...store.entries()])).not.toContain(DISPOSABLE_SECRET_HEX);
  });

  it("purges identity caches that could retain the legacy value", async () => {
    store.set(SESSION_KEY, { pubkey: DISPOSABLE_SECRET_HEX, method: "npub" });
    store.set(`diaries:${DISPOSABLE_SECRET_HEX}`, [{ id: "x" }]);
    store.set(`profile:${DISPOSABLE_SECRET_HEX}`, { fetchedAt: 1 });
    store.set(`garden:${DISPOSABLE_SECRET_HEX}`, { config: {} });
    store.set(`garden:${DISPOSABLE_SECRET_HEX}:draft`, { config: {} });
    store.set(`hidden-diaries:${DISPOSABLE_SECRET_HEX}`, ["a"]);
    store.set("relays", ["wss://relay.example"]);

    await readTrustedSession();

    for (const key of [...store.keys()]) expect(key).not.toContain(DISPOSABLE_SECRET_HEX);
    // Unrelated data survives.
    expect(store.get("relays")).toEqual(["wss://relay.example"]);
  });

  it("makes zero network requests while invalidating the legacy session", async () => {
    store.set(SESSION_KEY, { pubkey: DISPOSABLE_SECRET_HEX, method: "npub" });

    await readTrustedSession();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps a session written in the current format", async () => {
    const pubkey = "a".repeat(64);
    await writeSession({ pubkey, method: "nip07" });
    expect(store.get(SESSION_KEY)).toEqual({ v: SESSION_VERSION, pubkey, method: "nip07" });
    expect(await readTrustedSession()).toEqual({ v: SESSION_VERSION, pubkey, method: "nip07" });
  });

  it("rejects a versioned session whose pubkey is not 64-char hex", async () => {
    store.set(SESSION_KEY, { v: SESSION_VERSION, pubkey: "npub1nonsense", method: "npub" });
    expect(await readTrustedSession()).toBeNull();
  });

  it("restores an nsec-era session as read-only", async () => {
    const pubkey = "b".repeat(64);
    store.set(SESSION_KEY, { v: SESSION_VERSION, pubkey, method: "nsec" });
    expect(await readTrustedSession()).toEqual({ v: SESSION_VERSION, pubkey, method: "npub" });
  });
});
