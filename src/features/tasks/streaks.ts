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
