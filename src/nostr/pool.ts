import { SimplePool, type Filter } from "nostr-tools";
import type { NostrEvent } from "./types";

let pool: SimplePool | null = null;

function getPool(): SimplePool {
  if (!pool) pool = new SimplePool();
  return pool;
}

/** One-shot query across relays with a hard timeout so the UI never hangs. */
export async function query(
  relays: string[],
  filter: Filter,
  maxWaitMs = 6000,
): Promise<NostrEvent[]> {
  if (relays.length === 0) return [];
  const p = getPool();
  const seen = new Map<string, NostrEvent>();

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sub.close();
      } catch {
        // already closed
      }
      resolve();
    };
    const timer = setTimeout(finish, maxWaitMs);
    const sub = p.subscribeMany(relays, filter, {
      onevent: (event) => {
        seen.set(event.id, event as NostrEvent);
      },
      oneose: finish,
    });
  });

  return [...seen.values()].sort((a, b) => b.created_at - a.created_at);
}

export type PublishResult = { relay: string; ok: boolean; error?: string };

/** Publish one signed event to every relay, reporting each one separately. */
export async function publish(
  relays: string[],
  event: NostrEvent,
  maxWaitMs = 8000,
): Promise<PublishResult[]> {
  if (relays.length === 0) return [];
  const p = getPool();
  const timeout = <T,>(promise: Promise<T>) =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), maxWaitMs)),
    ]);

  const settled = await Promise.allSettled(
    p.publish(relays, event).map((promise) => timeout(promise)),
  );
  return settled.map((result, index) => ({
    relay: relays[index] ?? "",
    ok: result.status === "fulfilled",
    ...(result.status === "rejected"
      ? { error: result.reason instanceof Error ? result.reason.message : "failed" }
      : {}),
  }));
}

export function closePool(relays: string[]): void {
  if (!pool) return;
  try {
    pool.close(relays);
  } catch {
    // ignore
  }
  pool = null;
}

