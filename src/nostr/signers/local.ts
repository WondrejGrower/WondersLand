// In-memory nsec signer (ALPHA). The private key lives only in this module,
// only for the current page session. It is never written to IndexedDB,
// localStorage, Zustand, a Nostr event, a URL or a log line, and it is lost on
// refresh by design.
import { finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { NostrEvent } from "../types";
import type { EventTemplate } from "./index";

let secret: Uint8Array | null = null;
let publicKey: string | null = null;

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
    throw new Error("That does not look like a valid nsec");
  }
  if (decoded.type !== "nsec" || !(decoded.data instanceof Uint8Array)) {
    throw new Error("That does not look like a valid nsec");
  }
  return decoded.data;
}

/** Load a key for this session only. Returns the derived public key. */
export function unlockLocalSigner(nsec: string): string {
  const bytes = decodeNsec(nsec);
  const pubkey = getPublicKey(bytes);
  secret = bytes;
  publicKey = pubkey;
  return pubkey;
}

export function clearLocalSigner(): void {
  freshNsec = null;
  if (secret) secret.fill(0);
  secret = null;
  publicKey = null;
}

export function isLocalSignerUnlocked(): boolean {
  return secret !== null;
}

export function getLocalPublicKey(): string | null {
  return publicKey;
}

export async function signWithLocalKey(template: EventTemplate): Promise<NostrEvent> {
  if (!secret) throw new Error("Session key is gone — sign in with your nsec again");
  return finalizeEvent(template, secret) as NostrEvent;
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
  secret = bytes;
  publicKey = pubkey;
  const nsec = nip19.nsecEncode(bytes);
  // One-shot handoff: the sign-in UI unmounts when the dashboard takes over, so
  // the backup panel picks the string up here exactly once. Memory only.
  freshNsec = nsec;
  return { pubkey, nsec };
}

let freshNsec: string | null = null;

/** Read (and immediately forget) the nsec of an identity created this session. */
export function takeFreshNsec(): string | null {
  const value = freshNsec;
  freshNsec = null;
  return value;
}
