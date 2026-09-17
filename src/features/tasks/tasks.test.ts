import { describe, expect, it, vi } from "vitest";
import { currentStreak, completedToday, dayCountSince, completionDays } from "./streaks";
import { dateKeyOf, sanitizeBoard, sanitizeLog, TASKS_SCHEMA_VERSION, type ActivityLog } from "./types";
import { isNewer, signerCanEncrypt } from "./nostr";
import { mergeLogs } from "./storage";
import type { NostrEvent } from "../../nostr/types";

const DAY = 86_400_000;

function log(itemId: string, at: number, action: ActivityLog["action"]): ActivityLog {
  return {
    schemaVersion: TASKS_SCHEMA_VERSION,
    entryId: `${itemId}-${at}-${action}`,
    itemId,
    action,
    occurredAt: at,
    dateKey: dateKeyOf(at),
  };
}

describe("streaks", () => {
  const now = Date.now();

  it("counts consecutive days ending today", () => {
    const logs = [
      log("h", now - 2 * DAY, "habit_completed"),
      log("h", now - DAY, "habit_completed"),
      log("h", now, "habit_completed"),
    ];
    expect(currentStreak(logs, "h", now)).toBe(3);
    expect(completedToday(logs, "h", now)).toBe(true);
  });

  it("keeps yesterday's streak alive before today is ticked", () => {
    const logs = [log("h", now - DAY, "habit_completed")];
    expect(currentStreak(logs, "h", now)).toBe(1);
    expect(completedToday(logs, "h", now)).toBe(false);
  });

  it("lets a later un-completion cancel the day", () => {
    const logs = [
      log("h", now - 1000, "habit_completed"),
      log("h", now, "habit_uncompleted"),
    ];
    expect(completionDays(logs, "h").size).toBe(0);
    expect(currentStreak(logs, "h", now)).toBe(0);
  });

  it("counts the start day as day 1", () => {
    expect(dayCountSince(now, now)).toBe(1);
    expect(dayCountSince(now - 3 * DAY, now)).toBe(4);
  });
});

describe("sanitizers", () => {
  it("rejects junk and keeps a valid board", () => {
    expect(sanitizeBoard(null)).toBeNull();
    expect(sanitizeBoard({ tasks: "nope" })).toBeNull();
    const board = sanitizeBoard({
      schemaVersion: 1,
      tasks: [{ id: "a", title: "water", createdAt: 1, order: 0 }, "junk"],
      habits: [],
      timers: [],
      streakGoals: [],
      activeTimers: [],
      updatedAt: 5,
    });
    expect(board?.tasks).toHaveLength(1);
  });

  it("rejects a log without an action", () => {
    expect(sanitizeLog({ entryId: "x", itemId: "y", occurredAt: 1 })).toBeNull();
  });
});

describe("sync helpers", () => {
  it("deduplicates logs by entryId", () => {
    const a = log("h", 1000, "habit_completed");
    expect(mergeLogs([a], [a, log("h", 2000, "habit_uncompleted")])).toHaveLength(2);
  });

  it("resolves snapshot conflicts deterministically", () => {
    const older = { created_at: 10, id: "bbb" } as NostrEvent;
    const newer = { created_at: 11, id: "zzz" } as NostrEvent;
    expect(isNewer(newer, older)).toBe(true);
    expect(isNewer({ created_at: 10, id: "aaa" } as NostrEvent, older)).toBe(true);
    expect(isNewer({ created_at: 10, id: "ccc" } as NostrEvent, older)).toBe(false);
  });

  it("treats a signer without NIP-44 as unable to sync", () => {
    expect(signerCanEncrypt(null)).toBe(false);
    expect(
      signerCanEncrypt({
        method: "nip07",
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
      } as never),
    ).toBe(false);
    expect(
      signerCanEncrypt({
        method: "nsec",
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
        canEncrypt: () => true,
        encryptSelf: vi.fn(),
        decryptSelf: vi.fn(),
      } as never),
    ).toBe(true);
  });
});
