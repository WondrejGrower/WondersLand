/**
 * Nostr transport for the private board.
 *
 * Nostr is history and sync, never the live database. Two event shapes:
 *   - kind 30078, ["d","wondersland:tasks:v1"] — the current board snapshot
 *   - kind 78,    ["d","wondersland:tasks:v1"] — one immutable activity log
 *
 * Both contents are NIP-44 encrypted to self by the signer. Plaintext board
 * content never reaches a relay.
 */
import { verifyEvent } from "nostr-tools";
import { withClientTag } from "../../nostr/clientTag";
import { publish, query, type PublishResult } from "../../nostr/pool";
import { getEnabledRelayUrls } from "../../nostr/relays";
import type { EventTemplate, Signer } from "../../nostr/signers";
import type { NostrEvent } from "../../nostr/types";
import {
  sanitizeBoard,
  sanitizeLog,
  TASKS_SCHEMA_VERSION,
  type ActivityLog,
  type BoardSnapshot,
} from "./types";

export const TASKS_D_TAG = "wondersland:tasks:v1";
export const TASKS_BOARD_KIND = 30078;
export const TASKS_LOG_KIND = 78;

export function signerCanEncrypt(signer: Signer | null): boolean {
  return !!signer?.encryptSelf && !!signer.decryptSelf && signer.canEncrypt?.() !== false;
}

function baseTags(): string[][] {
  return [
    ["d", TASKS_D_TAG],
    ["encrypted", "nip44"],
    ["schema", String(TASKS_SCHEMA_VERSION)],
  ];
}

async function encryptedTemplate(
  signer: Signer,
  kind: number,
  payload: unknown,
  createdAt: number,
): Promise<EventTemplate> {
  if (!signer.encryptSelf) throw new Error("This signer cannot encrypt");
  const content = await signer.encryptSelf(JSON.stringify(payload));
  return withClientTag({ kind, created_at: createdAt, tags: baseTags(), content });
}

/** NIP-01 addressable ordering: newest created_at wins, lowest id breaks ties. */
export function isNewer(candidate: NostrEvent, current: NostrEvent | null): boolean {
  if (!current) return true;
  if (candidate.created_at !== current.created_at) return candidate.created_at > current.created_at;
  return candidate.id < current.id;
}

export async function publishBoard(
  signer: Signer,
  board: BoardSnapshot,
  lastCreatedAt: number,
): Promise<{ event: NostrEvent; results: PublishResult[] }> {
  const now = Math.floor(Date.now() / 1000);
  const createdAt = Math.max(now, lastCreatedAt + 1);
  const template = await encryptedTemplate(signer, TASKS_BOARD_KIND, board, createdAt);
  const event = await signer.signEvent(template);
  const results = await publish(getEnabledRelayUrls(), event);
  if (!results.some((r) => r.ok)) throw new Error("No relay accepted the board");
  return { event, results };
}

export async function publishLog(signer: Signer, log: ActivityLog): Promise<NostrEvent> {
  const createdAt = Math.floor(log.occurredAt / 1000);
  const template = await encryptedTemplate(signer, TASKS_LOG_KIND, log, createdAt);
  const event = await signer.signEvent(template);
  const results = await publish(getEnabledRelayUrls(), event);
  if (!results.some((r) => r.ok)) throw new Error("No relay accepted the entry");
  return event;
}

async function decryptJson(signer: Signer, event: NostrEvent): Promise<unknown | null> {
  if (!signer.decryptSelf) return null;
  try {
    const plaintext = await signer.decryptSelf(event.content);
    return JSON.parse(plaintext) as unknown;
  } catch {
    // A payload we cannot read is simply ignored; it is never surfaced raw.
    return null;
  }
}

/** Newest readable snapshot on the relays, or null. */
export async function fetchBoard(
  pubkey: string,
  signer: Signer,
): Promise<{ event: NostrEvent; board: BoardSnapshot } | null> {
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [TASKS_BOARD_KIND], authors: [pubkey], "#d": [TASKS_D_TAG], limit: 10 },
    6000,
  );
  let best: NostrEvent | null = null;
  for (const event of events) {
    if (event.pubkey !== pubkey) continue;
    if (!isNewer(event, best)) continue;
    try {
      if (!verifyEvent(event)) continue;
    } catch {
      continue;
    }
    best = event;
  }
  if (!best) return null;
  const board = sanitizeBoard(await decryptJson(signer, best));
  return board ? { event: best, board } : null;
}

/** Activity history, deduplicated by entryId by the caller. */
export async function fetchLogs(
  pubkey: string,
  signer: Signer,
  limit = 300,
): Promise<ActivityLog[]> {
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [TASKS_LOG_KIND], authors: [pubkey], "#d": [TASKS_D_TAG], limit },
    6000,
  );
  const out: ActivityLog[] = [];
  for (const event of events) {
    if (event.pubkey !== pubkey) continue;
    try {
      if (!verifyEvent(event)) continue;
    } catch {
      continue;
    }
    const log = sanitizeLog(await decryptJson(signer, event));
    if (log) out.push(log);
  }
  return out;
}
