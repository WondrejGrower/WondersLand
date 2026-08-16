import type { AuthMethod, NostrEvent } from "../types";
import { getNip07PublicKey, isNip07Available, signWithNip07 } from "./nip07";
import { getLocalPublicKey, isLocalSignerUnlocked, signWithLocalKey } from "./local";


export type EventTemplate = {
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
};

/**
 * The only boundary that may ever touch key material. Everything above this
 * interface receives signed events and nothing else — no nsec, ever.
 */
export type Signer = {
  method: AuthMethod;
  getPublicKey(): Promise<string>;
  signEvent(template: EventTemplate): Promise<NostrEvent>;
};

export const nip07Signer: Signer = {
  method: "nip07",
  getPublicKey: getNip07PublicKey,
  signEvent: signWithNip07,
};

/**
 * In-memory nsec signer (alpha). Key material stays inside ./local.ts.
 */
export const localSigner: Signer = {
  method: "nsec",
  getPublicKey: async () => {
    const pubkey = getLocalPublicKey();
    if (!pubkey) throw new Error("Session key is gone — sign in with your nsec again");
    return pubkey;
  },
  signEvent: signWithLocalKey,
};

/**
 * npub sessions are read-only visitors: there is no signer, so nothing can be
 * published. NIP-46 will be added here as another implementation.
 */
export function getSigner(method: AuthMethod | null): Signer | null {
  if (method === "nip07" && isNip07Available()) return nip07Signer;
  if (method === "nsec" && isLocalSignerUnlocked()) return localSigner;
  return null;
}


export function canPublish(method: AuthMethod | null): boolean {
  return getSigner(method) !== null;
}
