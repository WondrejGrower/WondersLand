// Trusted session record (audit F1, legacy leg).
//
// Input validation alone is not enough: a session persisted by an older build
// may hold a value the user pasted by mistake — possibly a raw SECRET key hex,
// which is indistinguishable from a public key. Such a value must never be sent
// to a relay as an `authors` filter.
//
// Every session written from now on carries `v: SESSION_VERSION` and the
// sign-in path it was proven through. Anything without that marker is treated
// as unproven, dropped before any network request, and its identity-scoped
// caches are purged from BOTH IndexedDB and the localStorage fallback.
// The legacy value is never logged, echoed or returned.
import type { AuthMethod } from "./types";
import { getJson, purgeKey, setJson } from "./storage";

export const SESSION_KEY = "session";
export const SESSION_VERSION = 1;

export type TrustedSession = {
  v: typeof SESSION_VERSION;
  pubkey: string;
  method: AuthMethod;
};

const HEX64 = /^[0-9a-f]{64}$/;

/** Identity-scoped caches that could still hold the unproven value. */
function identityCacheKeys(pubkey: string): string[] {
  return [
    `diaries:${pubkey}`,
    `profile:${pubkey}`,
    `garden:${pubkey}`,
    `garden:${pubkey}:draft`,
    `hidden-diaries:${pubkey}`,
  ];
}

/**
 * Remove the session plus everything keyed by the unproven pubkey.
 * Remote diaries live on relays and unrelated data (relay list, lens config,
 * other identities) is untouched.
 */
export async function purgeUntrustedSession(pubkey: unknown): Promise<void> {
  await purgeKey(SESSION_KEY);
  if (typeof pubkey !== "string" || pubkey.length === 0 || pubkey.length > 200) return;
  for (const key of identityCacheKeys(pubkey)) await purgeKey(key);
}

export async function writeSession(session: { pubkey: string; method: AuthMethod }): Promise<void> {
  await setJson(SESSION_KEY, {
    v: SESSION_VERSION,
    pubkey: session.pubkey,
    method: session.method,
  } satisfies TrustedSession);
}

export async function clearSession(): Promise<void> {
  await purgeKey(SESSION_KEY);
}

/**
 * Returns the stored session only when it is provably one WE wrote in the
 * current, validated format. Anything else is invalidated on the spot.
 */
export async function readTrustedSession(): Promise<TrustedSession | null> {
  const raw = (await getJson<unknown>(SESSION_KEY)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return null;

  const pubkey = raw["pubkey"];
  const method = raw["method"];
  const trusted =
    raw["v"] === SESSION_VERSION &&
    typeof pubkey === "string" &&
    HEX64.test(pubkey) &&
    (method === "npub" || method === "nip07" || method === "nsec");

  if (!trusted) {
    // No logging: the value may be key material.
    await purgeUntrustedSession(pubkey);
    return null;
  }
  // An nsec session is memory-only; a restored one is read-only.
  return { v: SESSION_VERSION, pubkey: pubkey as string, method: method === "nsec" ? "npub" : (method as AuthMethod) };
}
