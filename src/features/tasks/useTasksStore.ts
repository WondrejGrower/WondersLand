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

  addHabit: (title: string, cadence?: "daily" | "weekly") => void;
  toggleHabitToday: (id: string) => void;
  archiveHabit: (id: string) => void;

  startTimer: (presetId: string) => void;
  pauseTimer: (presetId: string) => void;
  resumeTimer: (presetId: string) => void;
  cancelTimer: (presetId: string) => void;
  completeTimer: (presetId: string) => void;

  addStreakGoal: (title: string) => void;
  resetStreakGoal: (id: string) => void;
  archiveStreakGoal: (id: string) => void;
};

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

  function log(itemId: string, action: ActivityAction) {
    const occurredAt = Date.now();
    const entry: ActivityLog = {
      schemaVersion: TASKS_SCHEMA_VERSION,
      entryId: newId(),
      itemId,
      action,
      occurredAt,
      dateKey: dateKeyOf(occurredAt),
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
      log(id, completed ? "task_completed" : "task_uncompleted");
    },

    archiveTask: (id) =>
      mutate((board) => ({ ...board, tasks: board.tasks.filter((t) => t.id !== id) })),

    // --- habits ------------------------------------------------------------
    addHabit: (title, cadence = "daily") => {
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
            createdAt: Date.now(),
            order: nextOrder(board.habits),
          },
        ],
      }));
    },

    toggleHabitToday: (id) => {
      const done = completedToday(get().logs, id);
      log(id, done ? "habit_uncompleted" : "habit_completed");
    },

    archiveHabit: (id) =>
      mutate((board) => ({ ...board, habits: board.habits.filter((h) => h.id !== id) })),

    // --- timers ------------------------------------------------------------
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
      log(presetId, "timer_started");
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
      mutate((board) => ({
        ...board,
        activeTimers: board.activeTimers.filter((t) => t.presetId !== presetId),
      }));
      log(presetId, "timer_cancelled");
    },

    completeTimer: (presetId) => {
      if (!get().board.activeTimers.some((t) => t.presetId === presetId)) return;
      mutate((board) => ({
        ...board,
        activeTimers: board.activeTimers.filter((t) => t.presetId !== presetId),
      }));
      log(presetId, "timer_completed");
    },

    // --- streak goals ------------------------------------------------------
    addStreakGoal: (title) => {
      const clean = title.trim();
      if (!clean) return;
      mutate((board) => ({
        ...board,
        streakGoals: [
          ...board.streakGoals,
          { id: newId(), title: clean.slice(0, 200), startedAt: Date.now(), type: "custom" },
        ],
      }));
    },

    resetStreakGoal: (id) => {
      mutate((board) => ({
        ...board,
        streakGoals: board.streakGoals.map((g) =>
          g.id === id ? { ...g, startedAt: Date.now() } : g,
        ),
      }));
      log(id, "streak_reset");
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
