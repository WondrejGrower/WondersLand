/**
 * Offline-tolerant sync engine.
 *
 * Every mutation is already committed to IndexedDB by the store before it gets
 * here. This module only decides *when* to talk to relays, keeps a persisted
 * queue of pending work, and never blocks the UI.
 */
import type { Signer } from "../../nostr/signers";
import { publishBoard, publishLog, signerCanEncrypt } from "./nostr";
import { loadQueue, saveQueue, type QueueItem } from "./storage";
import type { ActivityLog, BoardSnapshot } from "./types";

export type SyncStatus = "local" | "syncing" | "synced" | "error" | "no-encryption";

type Hooks = {
  getPubkey: () => string | null;
  getSigner: () => Signer | null;
  getBoard: () => BoardSnapshot;
  getLog: (entryId: string) => ActivityLog | undefined;
  getBaseCreatedAt: () => number;
  setBaseCreatedAt: (createdAt: number) => void;
  setStatus: (status: SyncStatus, error?: string | null) => void;
};

let hooks: Hooks | null = null;
let queue: QueueItem[] = [];
let debounceId: ReturnType<typeof setTimeout> | null = null;
let running = false;

const SNAPSHOT_DEBOUNCE_MS = 4000;

export function configureSync(next: Hooks): void {
  hooks = next;
}

export async function restoreQueue(pubkey: string): Promise<void> {
  queue = await loadQueue(pubkey);
}

export function pendingCount(): number {
  return queue.length;
}

function persistQueue(): void {
  const pubkey = hooks?.getPubkey();
  if (pubkey) void saveQueue(pubkey, queue);
}

function enqueue(item: QueueItem): void {
  // Rapid edits collapse into one snapshot publish.
  if (item.kind === "snapshot" && queue.some((q) => q.kind === "snapshot")) return;
  queue.push(item);
  persistQueue();
}

/** Queue a snapshot publish and debounce it, so typing does not spam relays. */
export function scheduleSnapshotSync(): void {
  enqueue({ kind: "snapshot" });
  if (debounceId) clearTimeout(debounceId);
  debounceId = setTimeout(() => {
    debounceId = null;
    void flushQueue();
  }, SNAPSHOT_DEBOUNCE_MS);
}

export function enqueueLogSync(entryId: string): void {
  enqueue({ kind: "log", entryId });
}

/** Publish everything pending. Safe to call at any time; never throws. */
export async function flushQueue(): Promise<void> {
  if (!hooks || running) return;
  const signer = hooks.getSigner();
  if (queue.length === 0) {
    hooks.setStatus(signerCanEncrypt(signer) ? "synced" : "no-encryption");
    return;
  }
  if (!signerCanEncrypt(signer) || !signer) {
    // Stay local rather than publish anything readable.
    hooks.setStatus("no-encryption");
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    hooks.setStatus("local");
    return;
  }

  running = true;
  hooks.setStatus("syncing");
  try {
    while (queue.length > 0) {
      const item = queue[0]!;
      if (item.kind === "snapshot") {
        const { event } = await publishBoard(signer, hooks.getBoard(), hooks.getBaseCreatedAt());
        hooks.setBaseCreatedAt(event.created_at);
      } else {
        const log = hooks.getLog(item.entryId);
        if (log) await publishLog(signer, log);
      }
      queue.shift();
      persistQueue();
    }
    hooks.setStatus("synced", null);
  } catch (err) {
    hooks.setStatus("error", err instanceof Error ? err.message : "Could not reach the relays");
  } finally {
    running = false;
  }
}

export function clearQueue(): void {
  queue = [];
  if (debounceId) clearTimeout(debounceId);
  debounceId = null;
  persistQueue();
}

/** Retry as soon as the browser says the network is back. */
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushQueue());
}
