/**
 * Tasks / Habits / Timers board — data model.
 *
 * Plain data only: no Nostr, no React, no Three.js. The board is the user's
 * private productivity state; it is stored locally first and synced to Nostr
 * encrypted to self.
 */

export const TASKS_SCHEMA_VERSION = 1;

export type Task = {
  id: string;
  title: string;
  completed?: boolean;
  /** dateKey of the day the task was last completed. */
  completedOn?: string;
  archived?: boolean;
  createdAt: number;
  order: number;
};

export type Habit = {
  id: string;
  title: string;
  cadence: "daily" | "weekly";
  target?: number;
  archived?: boolean;
  createdAt: number;
  order: number;
};

export type TimerPreset = {
  id: string;
  title: string;
  durationSeconds: number;
  icon?: string;
  order: number;
};

export type StreakGoal = {
  id: string;
  title: string;
  /** Exact epoch ms the journey started (reset writes a fresh value). */
  startedAt: number;
  /** Legacy records may only carry this; used as a startedAt fallback. */
  createdAt?: number;
  type: string;
  archived?: boolean;
};

/** Hard ceiling for a custom timer preset: 12 hours. */
export const MAX_TIMER_SECONDS = 12 * 60 * 60;

/**
 * A running timer. Never published per second: only the transitions are
 * synced and the remaining time is derived from these three numbers.
 */
export type ActiveTimer = {
  presetId: string;
  /** Epoch ms when the timer was started. */
  startedAt: number;
  /** Epoch ms of the current pause, when paused. */
  pausedAt?: number;
  /** Total milliseconds spent paused so far. */
  pausedMs: number;
  durationSeconds: number;
};

export type BoardSnapshot = {
  schemaVersion: number;
  tasks: Task[];
  habits: Habit[];
  timers: TimerPreset[];
  streakGoals: StreakGoal[];
  activeTimers: ActiveTimer[];
  updatedAt: number;
};

export type ActivityAction =
  | "task_completed"
  | "task_uncompleted"
  | "habit_completed"
  | "habit_uncompleted"
  | "timer_started"
  | "timer_completed"
  | "timer_cancelled"
  | "streak_reset";

export type ActivityLog = {
  schemaVersion: number;
  entryId: string;
  itemId: string;
  action: ActivityAction;
  /** Epoch ms. */
  occurredAt: number;
  /** Local calendar day, YYYY-MM-DD. */
  dateKey: string;
  metadata?: Record<string, string | number | boolean>;
};

/** Collision-safe local id. */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  c?.getRandomValues?.(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Local calendar day key. Deterministic for a given timezone. */
export function dateKeyOf(at: number): string {
  const d = new Date(at);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function emptyBoard(): BoardSnapshot {
  const now = Date.now();
  return {
    schemaVersion: TASKS_SCHEMA_VERSION,
    tasks: [],
    habits: [],
    timers: [
      { id: "focus-25", title: "Focus", durationSeconds: 25 * 60, icon: "🌿", order: 0 },
      { id: "break-5", title: "Break", durationSeconds: 5 * 60, icon: "🍵", order: 1 },
    ],
    streakGoals: [],
    activeTimers: [],
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Validation. Decrypted relay content is untrusted input.
// ---------------------------------------------------------------------------

const str = (v: unknown, max = 200): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function sanitizeBoard(input: unknown): BoardSnapshot | null {
  const raw = obj(input);
  if (!raw) return null;
  const version = num(raw["schemaVersion"]);
  if (version === null || version > TASKS_SCHEMA_VERSION) return null;

  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 500) : []);

  const tasks: Task[] = [];
  for (const item of list(raw["tasks"])) {
    const t = obj(item);
    const id = t && str(t["id"], 64);
    const title = t && str(t["title"], 200);
    if (!t || !id || !title) continue;
    tasks.push({
      id,
      title,
      completed: t["completed"] === true,
      ...(str(t["completedOn"], 10) ? { completedOn: str(t["completedOn"], 10)! } : {}),
      archived: t["archived"] === true,
      createdAt: num(t["createdAt"]) ?? Date.now(),
      order: num(t["order"]) ?? tasks.length,
    });
  }

  const habits: Habit[] = [];
  for (const item of list(raw["habits"])) {
    const h = obj(item);
    const id = h && str(h["id"], 64);
    const title = h && str(h["title"], 200);
    if (!h || !id || !title) continue;
    habits.push({
      id,
      title,
      cadence: h["cadence"] === "weekly" ? "weekly" : "daily",
      ...(num(h["target"]) !== null ? { target: num(h["target"])! } : {}),
      archived: h["archived"] === true,
      createdAt: num(h["createdAt"]) ?? Date.now(),
      order: num(h["order"]) ?? habits.length,
    });
  }

  const timers: TimerPreset[] = [];
  for (const item of list(raw["timers"])) {
    const p = obj(item);
    const id = p && str(p["id"], 64);
    const title = p && str(p["title"], 80);
    const duration = p && num(p["durationSeconds"]);
    if (!p || !id || !title || duration === null || duration <= 0 || duration > 86_400) continue;
    timers.push({
      id,
      title,
      durationSeconds: Math.round(duration),
      ...(str(p["icon"], 4) ? { icon: str(p["icon"], 4)! } : {}),
      order: num(p["order"]) ?? timers.length,
    });
  }

  const streakGoals: StreakGoal[] = [];
  for (const item of list(raw["streakGoals"])) {
    const g = obj(item);
    const id = g && str(g["id"], 64);
    const title = g && str(g["title"], 200);
    // Migration: older records may only carry createdAt.
    const createdAt = g && num(g["createdAt"]);
    const startedAt = (g && num(g["startedAt"])) ?? createdAt;
    if (!g || !id || !title || startedAt === null) continue;
    streakGoals.push({
      id,
      title,
      startedAt,
      ...(createdAt !== null && createdAt !== undefined ? { createdAt } : {}),
      type: str(g["type"], 40) ?? "custom",
      archived: g["archived"] === true,
    });
  }

  const activeTimers: ActiveTimer[] = [];
  for (const item of list(raw["activeTimers"])) {
    const a = obj(item);
    const presetId = a && str(a["presetId"], 64);
    const startedAt = a && num(a["startedAt"]);
    const duration = a && num(a["durationSeconds"]);
    if (!a || !presetId || startedAt === null || duration === null || duration <= 0) continue;
    activeTimers.push({
      presetId,
      startedAt,
      ...(num(a["pausedAt"]) !== null ? { pausedAt: num(a["pausedAt"])! } : {}),
      pausedMs: Math.max(0, num(a["pausedMs"]) ?? 0),
      durationSeconds: Math.round(duration),
    });
  }

  return {
    schemaVersion: TASKS_SCHEMA_VERSION,
    tasks,
    habits,
    // Defaults only seed a board that never had a timers list; a user who
    // deleted every preset keeps an empty section.
    timers: Array.isArray(raw["timers"]) ? timers : emptyBoard().timers,
    streakGoals,
    activeTimers,
    updatedAt: num(raw["updatedAt"]) ?? Date.now(),
  };
}

const ACTIONS: ActivityAction[] = [
  "task_completed",
  "task_uncompleted",
  "habit_completed",
  "habit_uncompleted",
  "timer_started",
  "timer_completed",
  "timer_cancelled",
  "streak_reset",
];

export function sanitizeLog(input: unknown): ActivityLog | null {
  const raw = obj(input);
  if (!raw) return null;
  const version = num(raw["schemaVersion"]);
  if (version === null || version > TASKS_SCHEMA_VERSION) return null;
  const entryId = str(raw["entryId"], 64);
  const itemId = str(raw["itemId"], 64);
  const action = str(raw["action"], 40);
  const occurredAt = num(raw["occurredAt"]);
  if (!entryId || !itemId || !action || occurredAt === null) return null;
  if (!ACTIONS.includes(action as ActivityAction)) return null;
  return {
    schemaVersion: TASKS_SCHEMA_VERSION,
    entryId,
    itemId,
    action: action as ActivityAction,
    occurredAt,
    dateKey: str(raw["dateKey"], 10) ?? dateKeyOf(occurredAt),
  };
}
