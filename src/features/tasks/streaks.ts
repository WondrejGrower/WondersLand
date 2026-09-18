/**
 * Derived streaks. Nothing here is a stored counter: every number is a pure
 * function of the completion log, so two devices always agree.
 */
import { dateKeyOf, type ActivityLog } from "./types";

const DAY = 86_400_000;

/** Day keys for the last `count` days, oldest first, ending today. */
export function recentDayKeys(now: number, count = 7): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(dateKeyOf(now - i * DAY));
  return keys;
}

/** The set of days an item was completed on (later un-completions cancel out). */
export function completionDays(logs: ActivityLog[], itemId: string): Set<string> {
  const byDay = new Map<string, { at: number; done: boolean }>();
  for (const log of logs) {
    if (log.itemId !== itemId) continue;
    const done =
      log.action === "habit_completed" ||
      log.action === "task_completed" ||
      log.action === "timer_completed";
    const undone = log.action === "habit_uncompleted" || log.action === "task_uncompleted";
    if (!done && !undone) continue;
    const current = byDay.get(log.dateKey);
    // Deterministic: latest timestamp wins, entryId breaks an exact tie.
    if (!current || log.occurredAt > current.at) byDay.set(log.dateKey, { at: log.occurredAt, done });
  }
  const days = new Set<string>();
  for (const [day, value] of byDay) if (value.done) days.add(day);
  return days;
}

/**
 * Current daily streak: consecutive completed days ending today, or ending
 * yesterday when today has not been ticked yet (the day is not over).
 */
export function currentStreak(logs: ActivityLog[], itemId: string, now = Date.now()): number {
  const days = completionDays(logs, itemId);
  if (days.size === 0) return 0;
  let cursor = now;
  if (!days.has(dateKeyOf(cursor))) {
    cursor -= DAY;
    if (!days.has(dateKeyOf(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dateKeyOf(cursor))) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

export function completedToday(logs: ActivityLog[], itemId: string, now = Date.now()): boolean {
  return completionDays(logs, itemId).has(dateKeyOf(now));
}

// ---------------------------------------------------------------------------
// Weekly cadence. Weeks are ISO-style: Monday 00:00 local -> Sunday 23:59.
// Everything is derived from the completion log; no counter is ever stored.
// ---------------------------------------------------------------------------

/** Midnight of the Monday that starts the week containing `at`. */
export function weekStart(at: number): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

/** Stable key for a week, e.g. "2026-09-14" (its Monday). */
export function weekKeyOf(at: number): string {
  return dateKeyOf(weekStart(at));
}

function parseDayKey(key: string): number {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
}

/** Completions of a weekly habit inside the week containing `now`. */
export function weeklyProgress(logs: ActivityLog[], itemId: string, now = Date.now()): number {
  const week = weekKeyOf(now);
  let count = 0;
  for (const day of completionDays(logs, itemId)) {
    if (weekKeyOf(parseDayKey(day)) === week) count += 1;
  }
  return count;
}

/**
 * Consecutive weeks where the target was met, ending with the current week —
 * or with last week when the current one is still in progress.
 */
export function weeklyStreak(
  logs: ActivityLog[],
  itemId: string,
  target: number,
  now = Date.now(),
): number {
  const goal = Math.max(1, Math.min(7, Math.round(target)));
  const perWeek = new Map<string, number>();
  for (const day of completionDays(logs, itemId)) {
    const key = weekKeyOf(parseDayKey(day));
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }
  let cursor = weekStart(now);
  if ((perWeek.get(dateKeyOf(cursor)) ?? 0) < goal) {
    cursor = weekStart(cursor - DAY); // this week is not over yet
  }
  let streak = 0;
  while ((perWeek.get(dateKeyOf(cursor)) ?? 0) >= goal) {
    streak += 1;
    cursor = weekStart(cursor - DAY);
  }
  return streak;
}

/** HH:MM:SS once an hour is involved, M:SS below that. */
export function clockLabel(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Whole days since a start date, counting the start day as day 1. */
export function dayCountSince(startedAt: number, now = Date.now()): number {
  const start = new Date(startedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((today.getTime() - start.getTime()) / DAY) + 1);
}

/**
 * Exact elapsed time since a journey started. Derived from wall-clock only, so
 * a reload, a backgrounded tab or a sleeping phone all resolve correctly.
 * Under a day: HH:MM:SS. A day or more: "Xd HH:MM:SS".
 */
export function elapsedLabel(startedAt: number, now = Date.now()): string {
  const total = Math.max(0, Math.floor((now - startedAt) / 1000));
  const days = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}
