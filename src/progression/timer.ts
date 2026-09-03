import type { Diary } from "../nostr/types";

/**
 * Live grow timer — derived purely from the canonical diary data. A diary's
 * `createdAt` starts the clock; a harvest/cure/finished phase stops it. Nothing
 * new is stored and nothing is published: this is a read-only projection.
 */

export type GrowTimer = {
  /** Unix seconds the grow started. */
  startedAt: number;
  /** Unix seconds the grow finished, or null while it is still running. */
  endedAt: number | null;
  running: boolean;
  /** Whole days elapsed, 1-based ("Day 1" is the founding day). */
  days: number;
  /** hh:mm:ss inside the current day (empty for finished grows). */
  hms: string;
  /** Compact label: `Day 14` or `42 days`. */
  short: string;
  /** Full label: `Day 14 · 06:23:41` or `Finished · 42 days`. */
  label: string;
};

const FINISHED_PHASES = ["harvest", "cure", "curing", "dried", "drying", "done", "finished"];

export function isFinishedPhase(phase: string | undefined): boolean {
  const value = phase?.trim().toLowerCase();
  if (!value) return false;
  return FINISHED_PHASES.some((p) => value.includes(p));
}

/** When a grow stopped, if it stopped: newest finishing entry wins. */
function endOf(diary: Diary): number | null {
  const finishing = diary.items
    .filter((item) => isFinishedPhase(item.phaseLabel))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (finishing) return finishing.createdAt;
  if (isFinishedPhase(diary.phase)) return diary.updatedAt;
  return null;
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

/**
 * @param nowMs current time in ms; pass a ticking value to animate the clock.
 */
export function growTimer(diary: Diary, nowMs: number = Date.now()): GrowTimer {
  const startedAt = diary.createdAt;
  const endedAt = endOf(diary);
  const running = endedAt === null;
  const now = Math.floor(nowMs / 1000);
  const until = Math.max(endedAt ?? now, startedAt);
  const elapsed = Math.max(0, until - startedAt);

  const wholeDays = Math.floor(elapsed / 86400);
  const rest = elapsed - wholeDays * 86400;
  const hms = `${pad(rest / 3600)}:${pad((rest % 3600) / 60)}:${pad(rest % 60)}`;

  if (!running) {
    const total = wholeDays;
    const short = `${total} ${total === 1 ? "day" : "days"}`;
    return {
      startedAt,
      endedAt,
      running,
      days: total,
      hms: "",
      short,
      label: `Finished · ${short}`,
    };
  }

  const days = wholeDays + 1;
  return {
    startedAt,
    endedAt: null,
    running,
    days,
    hms,
    short: `Day ${days}`,
    label: `Day ${days} · ${hms}`,
  };
}
