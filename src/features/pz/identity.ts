/**
 * Dedicated game-only Nostr identity for the Project Zomboid party.
 *
 * Fully isolated from the main WondersLand signer/session:
 *  - its own storage key (never under the `wl:` prefix the main session uses),
 *  - its own in-module secret (never registered with the main secret matcher),
 *  - never exported, logged, put in a URL, React state or the checklist export.
 *
 * It persists across refreshes on purpose so friends keep one game identity.
 * The only way the nsec leaves this module is the explicit "Copy backup" action.
 */
import { finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import { collectEventStrings, guardEvent, SecretLeakError } from "../../nostr/secretGuard";
import type { EventTemplate } from "../../nostr/signers";
import type { NostrEvent } from "../../nostr/types";

const STORAGE_KEY = "wondersland-pz-game-identity:v1";

type Stored = { v: 1; sk: string; nick: string; role: string; party: string };

export type GameProfile = { pubkey: string; npub: string; nick: string; role: string; party: string };

let secret: Uint8Array | null = null;

const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(32);
  for (let k = 0; k < 32; k += 1) out[k] = parseInt(hex.slice(k * 2, k * 2 + 2), 16);
  return out;
}

function read(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Stored>;
    if (s.v !== 1 || typeof s.sk !== "string" || !/^[0-9a-f]{64}$/.test(s.sk)) return null;
    return {
      v: 1,
      sk: s.sk,
      nick: typeof s.nick === "string" ? s.nick : "",
      role: typeof s.role === "string" ? s.role : "",
      party: typeof s.party === "string" ? s.party : "",
    };
  } catch {
    return null;
  }
}

function profileFrom(s: Stored): GameProfile {
  if (secret) secret.fill(0);
  secret = fromHex(s.sk);
  const pubkey = getPublicKey(secret);
  return { pubkey, npub: nip19.npubEncode(pubkey), nick: s.nick, role: s.role, party: s.party };
}

export function loadGameIdentity(): GameProfile | null {
  const s = read();
  return s ? profileFrom(s) : null;
}

/** Creates the game key on first use; afterwards only updates nick/role/party. */
export function saveGameProfile(p: { nick: string; role: string; party: string }): GameProfile {
  const existing = read();
  const next: Stored = existing
    ? { ...existing, ...p }
    : { v: 1, sk: toHex(generateSecretKey()), ...p };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return profileFrom(next);
}

export function signGameEvent(template: EventTemplate): NostrEvent {
  if (!secret) throw new Error("No game identity yet");
  guardEvent(template, "pz sign");
  const own = toHex(secret);
  if (collectEventStrings(template).some((v) => typeof v === "string" && v.toLowerCase().includes(own))) {
    throw new SecretLeakError("pz sign");
  }
  return finalizeEvent(template, secret) as NostrEvent;
}

/** Explicit backup: straight to the clipboard, never rendered or stored elsewhere. */
export async function copyGameKeyBackup(): Promise<void> {
  const s = read();
  if (!s) throw new Error("No game identity yet");
  await navigator.clipboard.writeText(nip19.nsecEncode(fromHex(s.sk)));
}

export function forgetGameIdentity(): void {
  if (secret) secret.fill(0);
  secret = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
