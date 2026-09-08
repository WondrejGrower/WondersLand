// NIP-07 browser-extension signer. WondersLand never touches an nsec.
//
// Audit F5: an extension is untrusted input. Every returned event is checked
// against an immutable snapshot of what we asked for, tied to the expected
// account, and cryptographically verified (id hash + signature) on a freshly
// rebuilt plain object so no inherited verification-cache flag is trusted.
import { getEventHash, verifyEvent } from "nostr-tools";
import type { NostrEvent } from "../types";
import { guardEvent } from "../secretGuard";

type Nip07 = {
  getPublicKey(): Promise<string>;
  signEvent(event: unknown): Promise<unknown>;
};

export type Nip07Template = {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
};

/** Last account the extension reported; used as the expected signer. */
let expectedPubkey: string | null = null;
let epoch = 0;

export function setExpectedNip07Pubkey(pubkey: string | null): void {
  expectedPubkey = pubkey ? pubkey.toLowerCase() : null;
  epoch += 1;
}

export function nip07Epoch(): number {
  return epoch;
}

function ext(): Nip07 | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { nostr?: Nip07 }).nostr;
  return candidate && typeof candidate.getPublicKey === "function" ? candidate : null;
}

export function isNip07Available(): boolean {
  return ext() !== null;
}

export async function getNip07PublicKey(): Promise<string> {
  const nostr = ext();
  if (!nostr) throw new Error("No Nostr extension found. Install Alby, nos2x or similar.");
  const pubkey = await nostr.getPublicKey();
  if (typeof pubkey !== "string" || !/^[0-9a-f]{64}$/i.test(pubkey)) {
    throw new Error("Extension returned an invalid public key");
  }
  const normalized = pubkey.toLowerCase();
  setExpectedNip07Pubkey(normalized);
  return normalized;
}

function sameTags(a: string[][], b: unknown): boolean {
  if (!Array.isArray(b) || b.length !== a.length) return false;
  return a.every((tag, i) => {
    const other = (b as unknown[])[i];
    return (
      Array.isArray(other) &&
      other.length === tag.length &&
      tag.every((value, j) => other[j] === value)
    );
  });
}

/**
 * Ask the extension to sign an event template. Key material never leaves it.
 * The result is only accepted when it is exactly what we asked for, signed by
 * the account we expect, with a valid hash and signature.
 */
export async function signWithNip07(template: Nip07Template): Promise<NostrEvent> {
  const nostr = ext();
  if (!nostr) throw new Error("No Nostr extension found. Install Alby, nos2x or similar.");
  guardEvent(template, "nip07 signer");

  // Immutable snapshot: the provider may mutate the object we hand it.
  const snapshot: Nip07Template = Object.freeze({
    kind: template.kind,
    created_at: template.created_at,
    content: template.content,
    tags: template.tags.map((tag) => [...tag]),
  });
  const at = epoch;
  const expected = expectedPubkey;

  const signed = (await nostr.signEvent({
    kind: snapshot.kind,
    created_at: snapshot.created_at,
    tags: snapshot.tags.map((tag) => [...tag]),
    content: snapshot.content,
  })) as Record<string, unknown> | null;

  // A sign-out or account switch that landed meanwhile invalidates this result.
  if (at !== epoch) throw new Error("You signed out while that was being signed");

  if (!signed || typeof signed !== "object") {
    throw new Error("Extension did not return a signed event");
  }
  const { id, sig, pubkey, kind, created_at: createdAt, content, tags } = signed as {
    id?: unknown;
    sig?: unknown;
    pubkey?: unknown;
    kind?: unknown;
    created_at?: unknown;
    content?: unknown;
    tags?: unknown;
  };
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{64}$/i.test(id) ||
    typeof sig !== "string" ||
    !/^[0-9a-f]{128}$/i.test(sig) ||
    typeof pubkey !== "string" ||
    !/^[0-9a-f]{64}$/i.test(pubkey) ||
    typeof kind !== "number" ||
    typeof createdAt !== "number" ||
    typeof content !== "string"
  ) {
    throw new Error("Extension did not return a signed event");
  }
  if (expected && pubkey.toLowerCase() !== expected) {
    throw new Error("Your extension signed with a different account. Sign in with it instead.");
  }
  if (
    kind !== snapshot.kind ||
    createdAt !== snapshot.created_at ||
    content !== snapshot.content ||
    !sameTags(snapshot.tags, tags)
  ) {
    throw new Error("Your extension changed the event before signing it");
  }

  // Rebuild a clean object: nostr-tools caches verification on a symbol
  // property, and an inherited flag from an untrusted source must not count.
  const event: NostrEvent = {
    id: id.toLowerCase(),
    pubkey: pubkey.toLowerCase(),
    created_at: createdAt,
    kind,
    tags: snapshot.tags.map((tag) => [...tag]),
    content,
    sig: sig.toLowerCase(),
  } as NostrEvent;

  if (getEventHash(event) !== event.id) {
    throw new Error("Your extension returned an event that does not match its id");
  }
  if (!verifyEvent(event)) {
    throw new Error("Your extension returned an invalid signature");
  }
  guardEvent(event, "nip07 result");
  return event;
}
