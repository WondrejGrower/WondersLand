/**
 * Local-first persistence for the board. Reuses the project's IndexedDB
 * wrapper (with its localStorage fallback) so nothing new has to be taught
 * about storage. Everything here is keyed per identity.
 *
 * No key material is ever written here — only board content the user typed.
 */
import { getJson, purgeKey, setJson } from "../../nostr/storage";
import { sanitizeBoard, sanitizeLog, type ActivityLog, type BoardSnapshot } from "./types";

const boardKey = (pubkey: string) => `tasks:${pubkey}:board`;
const logsKey = (pubkey: string) => `tasks:${pubkey}:logs`;
const queueKey = (pubkey: string) => `tasks:${pubkey}:queue`;

export type LocalBoard = {
  board: BoardSnapshot;
  /** created_at of the last Nostr snapshot we reconciled with. */
  baseCreatedAt: number;
};

export async function loadBoard(pubkey: string): Promise<LocalBoard | null> {
  const raw = await getJson<LocalBoard>(boardKey(pubkey));
  if (!raw) return null;
  const board = sanitizeBoard(raw.board);
  if (!board) return null;
  return { board, baseCreatedAt: raw.baseCreatedAt ?? 0 };
}

export function saveBoard(pubkey: string, value: LocalBoard): Promise<void> {
  return setJson(boardKey(pubkey), value);
}

export async function loadLogs(pubkey: string): Promise<ActivityLog[]> {
  const raw = await getJson<unknown[]>(logsKey(pubkey));
  if (!Array.isArray(raw)) return [];
  const out: ActivityLog[] = [];
  for (const item of raw) {
    const log = sanitizeLog(item);
    if (log) out.push(log);
  }
  return out;
}

export function saveLogs(pubkey: string, logs: ActivityLog[]): Promise<void> {
  // Bounded: the board only ever needs recent history for streaks.
  return setJson(logsKey(pubkey), logs.slice(-1000));
}

/** Pending outbound work, replayed when the relays are reachable again. */
export type QueueItem =
  | { kind: "snapshot" }
  | { kind: "log"; entryId: string };

export async function loadQueue(pubkey: string): Promise<QueueItem[]> {
  const raw = await getJson<QueueItem[]>(queueKey(pubkey));
  return Array.isArray(raw) ? raw.slice(0, 500) : [];
}

export function saveQueue(pubkey: string, queue: QueueItem[]): Promise<void> {
  return setJson(queueKey(pubkey), queue.slice(0, 500));
}

export async function clearBoardStorage(pubkey: string): Promise<void> {
  await Promise.all([
    purgeKey(boardKey(pubkey)),
    purgeKey(logsKey(pubkey)),
    purgeKey(queueKey(pubkey)),
  ]);
}

/** Merge log lists, deduplicated by entryId, oldest first. */
export function mergeLogs(a: ActivityLog[], b: ActivityLog[]): ActivityLog[] {
  const byId = new Map<string, ActivityLog>();
  for (const log of [...a, ...b]) byId.set(log.entryId, log);
  return [...byId.values()].sort((x, y) =>
    x.occurredAt === y.occurredAt ? x.entryId.localeCompare(y.entryId) : x.occurredAt - y.occurredAt,
  );
}
