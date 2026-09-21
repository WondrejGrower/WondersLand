import { describe, expect, it, vi } from "vitest";
import {
  clockLabel,
  currentStreak,
  completedToday,
  dayCountSince,
  completionDays,
  elapsedLabel,
  weekKeyOf,
  weeklyProgress,
  remainingSeconds,
  weeklyStreak,
} from "./streaks";
import { moveInList, useTasksStore } from "./useTasksStore";
import { dateKeyOf, sanitizeBoard, sanitizeLog, TASKS_SCHEMA_VERSION, type ActivityLog } from "./types";
import { isNewer, signerCanEncrypt } from "./nostr";
import { mergeLogs } from "./storage";
import { activityHistory, diaryHistory } from "../history";
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

describe("journey elapsed", () => {
  it("shows HH:MM:SS under a day and Xd HH:MM:SS after", () => {
    const start = 1_000_000_000_000;
    expect(elapsedLabel(start, start + 3_723_000)).toBe("01:02:03");
    expect(elapsedLabel(start, start + 86_400_000 + 3_723_000)).toBe("1d 01:02:03");
    expect(elapsedLabel(start, start - 5_000)).toBe("00:00:00");
  });

  it("migrates a legacy goal that only has createdAt", () => {
    const board = sanitizeBoard({
      schemaVersion: 1,
      streakGoals: [{ id: "g1", title: "Journey", createdAt: 1234, type: "custom" }],
    });
    expect(board?.streakGoals[0]?.startedAt).toBe(1234);
  });

  it("keeps an empty timer list instead of reseeding defaults", () => {
    const board = sanitizeBoard({ schemaVersion: 1, timers: [] });
    expect(board?.timers).toHaveLength(0);
  });
});

describe("weekly habits", () => {
  // Anchor mid-week so the maths does not depend on "today".
  const wednesday = new Date(2026, 8, 16, 12, 0, 0).getTime(); // Wed 16 Sep 2026

  it("counts progress inside the current Monday-Sunday week", () => {
    const logs = [
      log("w", wednesday - 2 * DAY, "habit_completed"), // Monday
      log("w", wednesday, "habit_completed"),
      log("w", wednesday - 4 * DAY, "habit_completed"), // previous Saturday
    ];
    expect(weeklyProgress(logs, "w", wednesday)).toBe(2);
  });

  it("counts consecutive weeks that met the target", () => {
    const logs = [
      // previous week: 2 completions
      log("w", wednesday - 9 * DAY, "habit_completed"),
      log("w", wednesday - 8 * DAY, "habit_completed"),
      // week before that: 2 completions
      log("w", wednesday - 16 * DAY, "habit_completed"),
      log("w", wednesday - 15 * DAY, "habit_completed"),
      // current week so far: 1
      log("w", wednesday, "habit_completed"),
    ];
    expect(weeklyStreak(logs, "w", 2, wednesday)).toBe(2);
    expect(weeklyStreak(logs, "w", 3, wednesday)).toBe(0);
  });

  it("uses Monday as the week boundary", () => {
    const sunday = new Date(2026, 8, 20, 22, 0, 0).getTime();
    const monday = new Date(2026, 8, 21, 8, 0, 0).getTime();
    expect(weekKeyOf(sunday)).toBe("2026-09-14");
    expect(weekKeyOf(monday)).toBe("2026-09-21");
    const logs = [log("w", sunday, "habit_completed")];
    expect(weeklyProgress(logs, "w", monday)).toBe(0);
    expect(weeklyProgress(logs, "w", sunday)).toBe(1);
  });
});

describe("timer formatting", () => {
  it("switches to HH:MM:SS at an hour", () => {
    expect(clockLabel(59)).toBe("0:59");
    expect(clockLabel(25 * 60)).toBe("25:00");
    expect(clockLabel(3600)).toBe("01:00:00");
    expect(clockLabel(4 * 3600 + 5 * 60 + 9)).toBe("04:05:09");
  });
});

describe("reordering", () => {
  const items = [
    { id: "a", order: 0 },
    { id: "b", order: 1 },
    { id: "c", order: 2 },
  ];

  it("swaps with the neighbour and renumbers from zero", () => {
    expect(moveInList(items, "c", -1).map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(moveInList(items, "c", -1).map((i) => i.order)).toEqual([0, 1, 2]);
    expect(moveInList(items, "a", 1).map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("is a no-op at the edges", () => {
    expect(moveInList(items, "a", -1)).toBe(items);
    expect(moveInList(items, "c", 1)).toBe(items);
    expect(moveInList(items, "zz", 1)).toBe(items);
  });
});

describe("timer pause/resume across real time", () => {
  const start = 1_000_000_000_000;

  it("freezes while paused and resumes where it stopped", () => {
    const preset = { startedAt: start, pausedMs: 0, durationSeconds: 600 };
    expect(remainingSeconds(preset, start + 60_000)).toBe(540);
    // paused after one minute; ten real minutes pass
    const paused = { ...preset, pausedAt: start + 60_000 };
    expect(remainingSeconds(paused, start + 660_000)).toBe(540);
    // resumed: the paused span is excluded
    const resumed = { ...preset, pausedMs: 600_000 };
    expect(remainingSeconds(resumed, start + 720_000)).toBe(480);
  });

  it("never goes below zero after a long sleep", () => {
    expect(remainingSeconds({ startedAt: start, pausedMs: 0, durationSeconds: 60 }, start + 1e9)).toBe(0);
  });
});

describe("board actions", () => {
  const store = useTasksStore;

  it("clears completed tasks without touching the log", () => {
    store.setState({
      board: {
        ...store.getState().board,
        tasks: [
          { id: "a", title: "open", completed: false, createdAt: 1, order: 0 },
          { id: "b", title: "done", completed: true, createdAt: 1, order: 1 },
        ],
      },
      logs: [log("b", 1, "task_completed")],
    });
    store.getState().clearCompletedTasks();
    expect(store.getState().board.tasks.map((t) => t.id)).toEqual(["a"]);
    expect(store.getState().logs).toHaveLength(1);
  });

  it("edits a habit's cadence and target without deleting logs", () => {
    store.setState({
      board: {
        ...store.getState().board,
        habits: [{ id: "h", title: "Water", cadence: "daily", createdAt: 1, order: 0 }],
      },
      logs: [log("h", 1, "habit_completed")],
    });
    store.getState().updateHabit("h", { title: "Water plants", cadence: "weekly", target: 12 });
    const habit = store.getState().board.habits[0]!;
    expect(habit.title).toBe("Water plants");
    expect(habit.cadence).toBe("weekly");
    expect(habit.target).toBe(7); // clamped to 1-7
    expect(store.getState().logs).toHaveLength(1);
    store.getState().updateHabit("h", { cadence: "daily" });
    expect(store.getState().board.habits[0]!.target).toBeUndefined();
  });

  it("renames a journey and resets it with a single activity event", () => {
    store.setState({
      board: {
        ...store.getState().board,
        streakGoals: [{ id: "j", title: "Journey", startedAt: 1, createdAt: 1, type: "custom" }],
      },
      logs: [],
    });
    store.getState().renameStreakGoal("j", "Fresh start");
    store.getState().resetStreakGoal("j");
    const goal = store.getState().board.streakGoals[0]!;
    expect(goal.title).toBe("Fresh start");
    expect(goal.startedAt).toBeGreaterThan(1);
    expect(store.getState().logs.filter((l) => l.action === "streak_reset")).toHaveLength(1);
  });

  it("keeps reordering out of the activity log", () => {
    store.setState({
      board: {
        ...store.getState().board,
        tasks: [
          { id: "a", title: "a", createdAt: 1, order: 0 },
          { id: "b", title: "b", createdAt: 1, order: 1 },
        ],
      },
      logs: [],
    });
    store.getState().moveItem("tasks", "b", -1);
    expect(store.getState().board.tasks.map((t) => t.id)).toEqual(["b", "a"]);
    expect(store.getState().logs).toHaveLength(0);
  });
});

describe("house history", () => {
  it("sorts diary entries newest first across diaries", () => {
    const diaries = [
      {
        id: "d1",
        authorPubkey: "p",
        title: "First grow",
        plant: "Plant A",
        createdAt: 1,
        updatedAt: 1,
        items: [
          { eventId: "old", authorPubkey: "p", createdAt: 10, addedAt: 10 },
          { eventId: "new", authorPubkey: "p", createdAt: 30, addedAt: 30 },
        ],
      },
      {
        id: "d2",
        authorPubkey: "p",
        title: "Second grow",
        createdAt: 1,
        updatedAt: 1,
        items: [{ eventId: "mid", authorPubkey: "p", createdAt: 20, addedAt: 20 }],
      },
    ];
    expect(diaryHistory(diaries).map((item) => item.id)).toEqual(["new", "mid", "old"]);
  });

  it("shows completed activity and preserves metadata after an item is removed", () => {
    const board = { ...useTasksStore.getState().board, tasks: [], habits: [], timers: [], streakGoals: [] };
    const logs = [
      { ...log("gone", 20, "task_completed"), metadata: { title: "Water seedlings" } },
      log("unknown", 10, "timer_completed"),
      log("ignored", 30, "timer_cancelled"),
    ];
    const history = activityHistory(board, logs);
    expect(history.map((item) => item.title)).toEqual(["Removed timer", "Water seedlings", "Removed timer"]);
    expect(history.map((item) => item.action)).toContain("timer_cancelled");
  });

  it("sanitizes private history metadata without changing schema version", () => {
    const sanitized = sanitizeLog({
      ...log("t", 1, "task_completed"),
      metadata: { title: "Done", durationSeconds: 60, nested: { unsafe: true } },
    });
    expect(sanitized?.metadata).toEqual({ title: "Done", durationSeconds: 60 });
    expect(sanitized?.schemaVersion).toBe(1);
  });
});
