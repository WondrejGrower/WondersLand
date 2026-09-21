/**
 * Board state. IndexedDB is the source of truth for the UI; Nostr reconciles
 * in the background. Every mutation: update memory -> persist -> enqueue sync.
 */
import { create } from "zustand";
import { getSigner } from "../../nostr/signers";
import { useNostrStore } from "../../state/useNostrStore";
import { fetchBoard, fetchLogs, signerCanEncrypt } from "./nostr";
import {
  loadBoard,
  loadLogs,
  mergeLogs,
  saveBoard,
  saveLogs,
  clearBoardStorage,
} from "./storage";
import {
  clearQueue,
  configureSync,
  enqueueLogSync,
  flushQueue,
  pendingCount,
  restoreQueue,
  scheduleSnapshotSync,
  type SyncStatus,
} from "./sync";
import { completedToday } from "./streaks";
import {
  dateKeyOf,
  emptyBoard,
  MAX_TIMER_SECONDS,
  newId,
  TASKS_SCHEMA_VERSION,
  type ActivityAction,
  type ActivityLog,
  type BoardSnapshot,
  type Task,
} from "./types";

type TasksState = {
  pubkey: string | null;
  board: BoardSnapshot;
  logs: ActivityLog[];
  baseCreatedAt: number;
  loaded: boolean;
  status: SyncStatus;
  error: string | null;
  pending: number;

  init: (pubkey: string) => Promise<void>;
  reset: () => void;

  addTask: (title: string) => void;
  renameTask: (id: string, title: string) => void;
  toggleTask: (id: string) => void;
  archiveTask: (id: string) => void;
  clearCompletedTasks: () => void;

  addHabit: (title: string, cadence?: "daily" | "weekly", target?: number) => void;
  updateHabit: (
    id: string,
    patch: { title?: string; cadence?: "daily" | "weekly"; target?: number },
  ) => void;
  toggleHabitToday: (id: string) => void;
  archiveHabit: (id: string) => void;

  /** Pure reordering: persisted in the snapshot, never logged as activity. */
  moveItem: (list: "tasks" | "habits" | "timers", id: string, direction: -1 | 1) => void;

  addTimerPreset: (title: string, durationSeconds: number, icon?: string) => void;
  updateTimerPreset: (
    id: string,
    patch: { title?: string; durationSeconds?: number; icon?: string },
  ) => void;
  removeTimerPreset: (id: string) => void;

  startTimer: (presetId: string) => void;
  pauseTimer: (presetId: string) => void;
  resumeTimer: (presetId: string) => void;
  cancelTimer: (presetId: string) => void;
  completeTimer: (presetId: string) => void;

  addStreakGoal: (title: string) => void;
  renameStreakGoal: (id: string, title: string) => void;
  resetStreakGoal: (id: string) => void;
  archiveStreakGoal: (id: string) => void;
};

/** Weekly targets are 1–7 completions per week. */
function clampTarget(value: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(7, n));
}

/**
 * Swap an item with its neighbour and renumber `order` from zero, so the
 * ordering is explicit in the snapshot and survives relay reconciliation.
 */
export function moveInList<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= sorted.length) return items;
  const moved = sorted[index]!;
  sorted[index] = sorted[target]!;
  sorted[target] = moved;
  return sorted.map((item, i) => ({ ...item, order: i }));
}

export const useTasksStore = create<TasksState>((set, get) => {
  function persist(board: BoardSnapshot) {
    const pubkey = get().pubkey;
    if (pubkey) void saveBoard(pubkey, { board, baseCreatedAt: get().baseCreatedAt });
  }

  /** Local commit + queued sync. The UI never waits for a relay. */
  function mutate(update: (board: BoardSnapshot) => BoardSnapshot) {
    const board = { ...update(get().board), updatedAt: Date.now() };
    set({ board });
    persist(board);
    scheduleSnapshotSync();
    set({ pending: pendingCount() });
  }

  function log(
    itemId: string,
    action: ActivityAction,
    metadata?: Record<string, string | number | boolean>,
  ) {
    const occurredAt = Date.now();
    const entry: ActivityLog = {
      schemaVersion: TASKS_SCHEMA_VERSION,
      entryId: newId(),
      itemId,
      action,
      occurredAt,
      dateKey: dateKeyOf(occurredAt),
      ...(metadata ? { metadata } : {}),
    };
    const logs = [...get().logs, entry];
    set({ logs });
    const pubkey = get().pubkey;
    if (pubkey) void saveLogs(pubkey, logs);
    enqueueLogSync(entry.entryId);
    set({ pending: pendingCount() });
  }

  configureSync({
    getPubkey: () => get().pubkey,
    getSigner: () => getSigner(useNostrStore.getState().method),
    getBoard: () => get().board,
    getLog: (entryId) => get().logs.find((l) => l.entryId === entryId),
    getBaseCreatedAt: () => get().baseCreatedAt,
    setBaseCreatedAt: (createdAt) => {
      set({ baseCreatedAt: createdAt });
      persist(get().board);
    },
    setStatus: (status, error) =>
      set({ status, error: error ?? null, pending: pendingCount() }),
  });

  const nextOrder = (items: { order: number }[]) =>
    items.reduce((max, item) => Math.max(max, item.order), -1) + 1;

  return {
    pubkey: null,
    board: emptyBoard(),
    logs: [],
    baseCreatedAt: 0,
    loaded: false,
    status: "local",
    error: null,
    pending: 0,

    init: async (pubkey) => {
      if (get().pubkey === pubkey && get().loaded) {
        void flushQueue();
        return;
      }
      set({ pubkey, loaded: false, status: "local", error: null });

      // 1. Local first — the board paints before any relay is touched.
      const [local, logs] = await Promise.all([loadBoard(pubkey), loadLogs(pubkey)]);
      await restoreQueue(pubkey);
      set({
        board: local?.board ?? emptyBoard(),
        baseCreatedAt: local?.baseCreatedAt ?? 0,
        logs,
        loaded: true,
        pending: pendingCount(),
      });

      // 2. Background reconcile.
      const signer = getSigner(useNostrStore.getState().method);
      if (!signerCanEncrypt(signer) || !signer) {
        set({ status: "no-encryption" });
        return;
      }
      set({ status: "syncing" });
      try {
        const [remote, remoteLogs] = await Promise.all([
          fetchBoard(pubkey, signer),
          fetchLogs(pubkey, signer),
        ]);
        if (get().pubkey !== pubkey) return;
        const mergedLogs = mergeLogs(get().logs, remoteLogs);
        set({ logs: mergedLogs });
        void saveLogs(pubkey, mergedLogs);

        // Last-write-wins on the snapshot; a newer local edit is kept and
        // republished instead of being clobbered.
        if (remote && remote.event.created_at > get().baseCreatedAt) {
          const localNewer = get().board.updatedAt > remote.board.updatedAt;
          set({ baseCreatedAt: remote.event.created_at });
          if (!localNewer) set({ board: remote.board });
          void saveBoard(pubkey, {
            board: get().board,
            baseCreatedAt: remote.event.created_at,
          });
        }
        await flushQueue();
      } catch (err) {
        set({
          status: "error",
          error: err instanceof Error ? err.message : "Could not reach the relays",
        });
      }
    },

    reset: () => {
      clearQueue();
      set({
        pubkey: null,
        board: emptyBoard(),
        logs: [],
        baseCreatedAt: 0,
        loaded: false,
        status: "local",
        error: null,
        pending: 0,
      });
    },

    // --- tasks -------------------------------------------------------------
    addTask: (title) => {
      const clean = title.trim();
      if (!clean) return;
      mutate((board) => ({
        ...board,
        tasks: [
          ...board.tasks,
          {
            id: newId(),
            title: clean.slice(0, 200),
            completed: false,
            createdAt: Date.now(),
            order: nextOrder(board.tasks),
          } satisfies Task,
        ],
      }));
    },

    renameTask: (id, title) => {
      const clean = title.trim();
      if (!clean) return;
      mutate((board) => ({
        ...board,
        tasks: board.tasks.map((t) => (t.id === id ? { ...t, title: clean.slice(0, 200) } : t)),
      }));
    },

    toggleTask: (id) => {
      const task = get().board.tasks.find((t) => t.id === id);
      if (!task) return;
      const completed = !task.completed;
      mutate((board) => ({
        ...board,
        tasks: board.tasks.map((t) =>
          t.id === id ? { ...t, completed, completedOn: completed ? dateKeyOf(Date.now()) : "" } : t,
        ),
      }));
      log(id, completed ? "task_completed" : "task_uncompleted", { title: task.title });
    },

    archiveTask: (id) =>
      mutate((board) => ({ ...board, tasks: board.tasks.filter((t) => t.id !== id) })),

    /** Drops completed rows from the board. Activity history is untouched. */
    clearCompletedTasks: () =>
      mutate((board) => ({ ...board, tasks: board.tasks.filter((t) => !t.completed) })),

    // --- habits ------------------------------------------------------------
    addHabit: (title, cadence = "daily", target) => {
      const clean = title.trim();
      if (!clean) return;
      mutate((board) => ({
        ...board,
        habits: [
          ...board.habits,
          {
            id: newId(),
            title: clean.slice(0, 200),
            cadence,
            ...(cadence === "weekly" ? { target: clampTarget(target ?? 3) } : {}),
            createdAt: Date.now(),
            order: nextOrder(board.habits),
          },
        ],
      }));
    },

    /** Config only: completion logs stay exactly as they are. */
    updateHabit: (id, patch) => {
      mutate((board) => ({
        ...board,
        habits: board.habits.map((h) => {
          if (h.id !== id) return h;
          const title = patch.title?.trim();
          const cadence = patch.cadence ?? h.cadence;
          const { target: _previous, ...rest } = h;
          const base = {
            ...rest,
            ...(title ? { title: title.slice(0, 200) } : {}),
            cadence,
          };
          return cadence === "weekly"
            ? { ...base, target: clampTarget(patch.target ?? h.target ?? 3) }
            : base;
        }),
      }));
    },

    toggleHabitToday: (id) => {
      const habit = get().board.habits.find((item) => item.id === id);
      if (!habit) return;
      const done = completedToday(get().logs, id);
      log(id, done ? "habit_uncompleted" : "habit_completed", { title: habit.title });
    },

    archiveHabit: (id) =>
      mutate((board) => ({ ...board, habits: board.habits.filter((h) => h.id !== id) })),

    moveItem: (list, id, direction) =>
      mutate((board) => ({
        ...board,
        [list]: moveInList(board[list] as { id: string; order: number }[], id, direction),
      })),


    // --- timers ------------------------------------------------------------
    addTimerPreset: (title, durationSeconds, icon) => {
      const clean = title.trim();
      const duration = Math.round(durationSeconds);
      if (!clean || !Number.isFinite(duration) || duration <= 0) return;
      if (duration > MAX_TIMER_SECONDS) return;
      const trimmedIcon = icon?.trim().slice(0, 4);
      mutate((board) => ({
        ...board,
        timers: [
          ...board.timers,
          {
            id: newId(),
            title: clean.slice(0, 80),
            durationSeconds: duration,
            ...(trimmedIcon ? { icon: trimmedIcon } : {}),
            order: nextOrder(board.timers),
          },
        ],
      }));
    },

    updateTimerPreset: (id, patch) => {
      mutate((board) => ({
        ...board,
        timers: board.timers.map((t) => {
          if (t.id !== id) return t;
          const title = patch.title?.trim();
          const duration =
            patch.durationSeconds !== undefined ? Math.round(patch.durationSeconds) : undefined;
          const icon = patch.icon?.trim().slice(0, 4);
          return {
            ...t,
            ...(title ? { title: title.slice(0, 80) } : {}),
            ...(duration && duration > 0 && duration <= MAX_TIMER_SECONDS
              ? { durationSeconds: duration }
              : {}),
            ...(patch.icon !== undefined ? { icon: icon || "" } : {}),
          };
        }),
      }));
    },

    /** Deleting a preset stops any run of it, so no orphan timer is left. */
    removeTimerPreset: (id) =>
      mutate((board) => ({
        ...board,
        timers: board.timers.filter((t) => t.id !== id),
        activeTimers: board.activeTimers.filter((t) => t.presetId !== id),
      })),

    startTimer: (presetId) => {
      const preset = get().board.timers.find((t) => t.id === presetId);
      if (!preset) return;
      mutate((board) => ({
        ...board,
        activeTimers: [
          ...board.activeTimers.filter((t) => t.presetId !== presetId),
          {
            presetId,
            startedAt: Date.now(),
            pausedMs: 0,
            durationSeconds: preset.durationSeconds,
          },
        ],
      }));
      log(presetId, "timer_started", {
        title: preset.title,
        durationSeconds: preset.durationSeconds,
      });
    },

    pauseTimer: (presetId) =>
      mutate((board) => ({
        ...board,
        activeTimers: board.activeTimers.map((t) =>
          t.presetId === presetId && !t.pausedAt ? { ...t, pausedAt: Date.now() } : t,
        ),
      })),

    resumeTimer: (presetId) =>
      mutate((board) => ({
        ...board,
        activeTimers: board.activeTimers.map((t) => {
          if (t.presetId !== presetId || !t.pausedAt) return t;
          const { pausedAt, ...rest } = t;
          return { ...rest, pausedMs: t.pausedMs + (Date.now() - pausedAt) };
        }),
      })),

    cancelTimer: (presetId) => {
      const preset = get().board.timers.find((item) => item.id === presetId);
      mutate((board) => ({
        ...board,
        activeTimers: board.activeTimers.filter((t) => t.presetId !== presetId),
      }));
      log(presetId, "timer_cancelled", preset ? { title: preset.title } : undefined);
    },

    completeTimer: (presetId) => {
      const preset = get().board.timers.find((item) => item.id === presetId);
      const active = get().board.activeTimers.find((item) => item.presetId === presetId);
      if (!get().board.activeTimers.some((t) => t.presetId === presetId)) return;
      mutate((board) => ({
        ...board,
        activeTimers: board.activeTimers.filter((t) => t.presetId !== presetId),
      }));
      log(presetId, "timer_completed", {
        title: preset?.title ?? "Timer",
        ...(active ? { durationSeconds: active.durationSeconds } : {}),
      });
    },

    // --- streak goals ------------------------------------------------------
    addStreakGoal: (title) => {
      const clean = title.trim();
      if (!clean) return;
      mutate((board) => ({
        ...board,
        streakGoals: [
          ...board.streakGoals,
          {
            id: newId(),
            title: clean.slice(0, 200),
            startedAt: Date.now(),
            createdAt: Date.now(),
            type: "custom",
          },
        ],
      }));
    },

    renameStreakGoal: (id, title) => {
      const clean = title.trim();
      if (!clean) return;
      mutate((board) => ({
        ...board,
        streakGoals: board.streakGoals.map((g) =>
          g.id === id ? { ...g, title: clean.slice(0, 200) } : g,
        ),
      }));
    },

    resetStreakGoal: (id) => {
      const goal = get().board.streakGoals.find((item) => item.id === id);
      mutate((board) => ({
        ...board,
        streakGoals: board.streakGoals.map((g) =>
          g.id === id ? { ...g, startedAt: Date.now() } : g,
        ),
      }));
      log(id, "streak_reset", goal ? { title: goal.title } : undefined);
    },

    archiveStreakGoal: (id) =>
      mutate((board) => ({
        ...board,
        streakGoals: board.streakGoals.filter((g) => g.id !== id),
      })),
  };
});

/** Wipe the local board for an identity (used on sign-out flows). */
export async function forgetLocalBoard(pubkey: string): Promise<void> {
  await clearBoardStorage(pubkey);
}
