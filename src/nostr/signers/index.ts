import type { AuthMethod, NostrEvent } from "../types";
import { guardEvent } from "../secretGuard";
import {
  getNip07PublicKey,
  isNip07Available,
  setExpectedNip07Pubkey,
  signWithNip07,
} from "./nip07";
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

/**
 * Fail-closed outbound check (audit F2): no template reaches a signing
 * implementation, and no signed event reaches a caller, without being screened
 * for private-key material first.
 */
function guarded(signer: Signer): Signer {
  return {
    method: signer.method,
    getPublicKey: signer.getPublicKey,
    async signEvent(template) {
      guardEvent(template, `${signer.method} sign`);
      const event = await signer.signEvent(template);
      guardEvent(event, `${signer.method} signed event`);
      return event;
    },
  };
}

export const nip07Signer: Signer = guarded({
  method: "nip07",
  getPublicKey: getNip07PublicKey,
  signEvent: signWithNip07,
});

/**
 * In-memory nsec signer (advanced). Key material stays inside ./local.ts.
 */
export const localSigner: Signer = guarded({
  method: "nsec",
  getPublicKey: async () => {
    const pubkey = getLocalPublicKey();
    if (!pubkey) throw new Error("Session key is gone — sign in with your nsec again");
    return pubkey;
  },
  signEvent: signWithLocalKey,
});

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

export { setExpectedNip07Pubkey };
