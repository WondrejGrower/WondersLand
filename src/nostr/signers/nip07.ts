// NIP-07 browser-extension signer. WondersLand never touches an nsec.
import type { NostrEvent } from "../types";

type Nip07 = {
  getPublicKey(): Promise<string>;
  signEvent(event: unknown): Promise<unknown>;
};


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
  if (!/^[0-9a-f]{64}$/i.test(pubkey)) throw new Error("Extension returned an invalid public key");
  return pubkey.toLowerCase();
}
