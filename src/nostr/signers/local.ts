// In-memory nsec signer (ADVANCED). The private key lives only in this module,
// only for the current page session. It is never written to IndexedDB,
// localStorage, Zustand, a Nostr event, a URL or a log line, and it is lost on
// refresh by design.
//
// Audit F4: replacement is validate-then-atomically-swap, the previous buffer is
// always zeroed, and every teardown path (sign-out, identity switch, pagehide)
// wipes both the key and any pending backup string.
import { finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { NostrEvent } from "../types";
import { guardEvent, setLocalSecretMatcher } from "../secretGuard";
import type { EventTemplate } from "./index";

let secret: Uint8Array | null = null;
let publicKey: string | null = null;
let freshNsec: string | null = null;
/** Bumped on every identity change so stale async work can be discarded. */
let epoch = 0;

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Recognizes this module's own secret without ever exporting it. */
function matchesLocalSecret(candidateHex: string): boolean {
  if (!secret) return false;
  const own = toHex(secret);
  if (own.length !== candidateHex.length) return false;
  let diff = 0;
  for (let i = 0; i < own.length; i += 1) {
    diff |= own.charCodeAt(i) ^ candidateHex.charCodeAt(i);
  }
  return diff === 0;
}

function wipe(): void {
  if (secret) secret.fill(0);
  secret = null;
  publicKey = null;
  freshNsec = null;
}

/** Atomic swap: only called with an already-validated candidate. */
function install(bytes: Uint8Array, pubkey: string): void {
  wipe();
  secret = bytes;
  publicKey = pubkey;
  epoch += 1;
  setLocalSecretMatcher(matchesLocalSecret);
}

function decodeNsec(input: string): Uint8Array {
  const trimmed = input.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  }
  let decoded: ReturnType<typeof nip19.decode>;
  try {
    decoded = nip19.decode(trimmed);
  } catch {
    // Never echo the input, not even a malformed fragment of it.
    throw new Error("That does not look like a valid nsec");
  }
  if (decoded.type !== "nsec" || !(decoded.data instanceof Uint8Array)) {
    throw new Error("That does not look like a valid nsec");
  }
  return decoded.data;
}

/** Load a key for this session only. Returns the derived public key. */
export function unlockLocalSigner(nsec: string): string {
  // Validate on a temporary buffer first: a failed import must leave the
  // current identity untouched and must not leak the candidate.
  let candidate: Uint8Array | null = null;
  try {
    candidate = decodeNsec(nsec);
    const pubkey = getPublicKey(candidate);
    install(candidate, pubkey);
    candidate = null;
    return pubkey;
  } finally {
    if (candidate) candidate.fill(0);
  }
}

export function clearLocalSigner(): void {
  wipe();
  epoch += 1;
  setLocalSecretMatcher(null);
}

export function isLocalSignerUnlocked(): boolean {
  return secret !== null;
}

export function getLocalPublicKey(): string | null {
  return publicKey;
}

/** Identity generation counter — used to drop stale async completions. */
export function localSignerEpoch(): number {
  return epoch;
}

export async function signWithLocalKey(template: EventTemplate): Promise<NostrEvent> {
  const at = epoch;
  if (!secret) throw new Error("Session key is gone — sign in with your nsec again");
  guardEvent(template, "local signer");
  const signed = finalizeEvent(template, secret) as NostrEvent;
  // A sign-out that landed while we were signing invalidates this result.
  if (at !== epoch || !secret) {
    throw new Error("Session key is gone — sign in with your nsec again");
  }
  return signed;
}

/**
 * Create a brand-new Nostr identity in the browser.
 *
 * The secret is generated with nostr-tools' CSPRNG and held in this module for
 * the current tab only, exactly like an unlocked nsec. The nsec string is
 * returned ONCE so the UI can show it to the owner for backup; it is never
 * stored, logged or sent anywhere by WondersLand.
 */
export function createLocalIdentity(): { pubkey: string; nsec: string } {
  const bytes = generateSecretKey();
  const pubkey = getPublicKey(bytes);
  install(bytes, pubkey);
  const nsec = nip19.nsecEncode(bytes);
  // One-shot handoff: the sign-in UI unmounts when the dashboard takes over, so
  // the backup panel picks the string up here exactly once. Memory only.
  freshNsec = nsec;
  return { pubkey, nsec };
}

/** The nsec of an identity created in this tab, until its owner confirms backup. */
export function peekFreshNsec(): string | null {
  return freshNsec;
}

/** Forget the freshly created nsec once the owner has saved it. */
export function forgetFreshNsec(): void {
  freshNsec = null;
}

// Lifecycle teardown: leaving the page must not leave key bytes reachable.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("pagehide", () => clearLocalSigner());
}
