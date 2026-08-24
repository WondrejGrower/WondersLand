import type { Diary } from "../nostr/types";

/**
 * Garden Growth — derived deterministically from the canonical Nostr diary
 * data. This module is pure: no React, no Three, no network. It never becomes
 * a second source of truth; recomputing it from the same diaries always yields
 * the same result.
 */

export type GrowthStage =
  | "Seed"
  | "Sprout"
  | "Seedling"
  | "Young Garden"
  | "Living Garden"
  | "Ecosystem";

export type GrowthSignals = {
  /** Distinct documented plants/species (slug, latin name or cultivar). */
  species: number;
  /** Diary entries, counted once per referenced note. */
  entries: number;
  /** Distinct calendar days that carry at least one entry. */
  activeDays: number;
  /** Diaries that reached a harvest/cure phase. */
  completed: number;
  diaries: number;
};

export type Growth = {
  stage: GrowthStage;
  /** 1-based index of the current stage. */
  level: number;
  /** 0..1 progress towards the next stage. */
  progress: number;
  points: number;
  nextStage: GrowthStage | null;
  pointsToNext: number;
  signals: GrowthSignals;
};

const STAGES: { stage: GrowthStage; at: number }[] = [
  { stage: "Seed", at: 0 },
  { stage: "Sprout", at: 3 },
  { stage: "Seedling", at: 10 },
  { stage: "Young Garden", at: 25 },
  { stage: "Living Garden", at: 55 },
  { stage: "Ecosystem", at: 100 },
];

const COMPLETED_PHASES = ["harvest", "cure", "curing", "done", "finished"];

function dayKey(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export function growthSignals(diaries: Diary[]): GrowthSignals {
  const species = new Set<string>();
  const days = new Set<string>();
  const entries = new Set<string>();
  let completed = 0;

  for (const diary of diaries) {
    const key = (diary.plantSlug || diary.plant || diary.species || diary.cultivar || "")
      .trim()
      .toLowerCase();
    if (key) species.add(key);
    const phase = diary.phase?.trim().toLowerCase() ?? "";
    if (phase && COMPLETED_PHASES.some((p) => phase.includes(p))) completed += 1;
    for (const item of diary.items) {
      entries.add(item.eventId);
      days.add(dayKey(item.createdAt));
    }
  }

  return {
    species: species.size,
    entries: entries.size,
    activeDays: days.size,
    completed,
    diaries: diaries.length,
  };
}

/**
 * Anti-spam by construction: volume alone is capped, while breadth (distinct
 * species, distinct real days, completed grows) carries most of the weight.
 */
export function growthPoints(s: GrowthSignals): number {
  const breadth = s.species * 6 + s.activeDays * 2 + s.completed * 10;
  const volume = Math.min(s.entries, 40) * 0.5;
  return Math.round(breadth + volume);
}

export function computeGrowth(diaries: Diary[]): Growth {
  const signals = growthSignals(diaries);
  const points = growthPoints(signals);

  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (points >= (STAGES[i]?.at ?? 0)) index = i;
  }
  const current = STAGES[index]!;
  const next = STAGES[index + 1] ?? null;
  const span = next ? next.at - current.at : 0;
  const progress = next ? Math.min(1, Math.max(0, (points - current.at) / span)) : 1;

  return {
    stage: current.stage,
    level: index + 1,
    progress,
    points,
    nextStage: next?.stage ?? null,
    pointsToNext: next ? Math.max(0, next.at - points) : 0,
    signals,
  };
}

export type Suggestion = { title: string; body: string };

/** Gentle, non-punitive next step. Never a streak threat, never a deadline. */
export function nextStep(diaries: Diary[]): Suggestion {
  const s = growthSignals(diaries);
  if (s.diaries === 0) {
    return {
      title: "Start your first diary",
      body: "Pick one plant you are growing right now and give it a page. Everything here grows from what you document.",
    };
  }
  if (s.entries === 0) {
    return {
      title: "Add your first entry",
      body: "One line about what changed today is already a good entry.",
    };
  }
  if (s.species < 3) {
    return {
      title: "Grow your variety",
      body: "Documenting a different species adds a new plant to your 3D garden and widens your Discovery Book.",
    };
  }
  const oldest = [...diaries].sort((a, b) => a.updatedAt - b.updatedAt)[0];
  return {
    title: "Catch up when you can",
    body: oldest
      ? `${oldest.title} has been quiet for a while. Whenever it changes, it is here waiting.`
      : "Keep documenting real changes — the garden follows your notes.",
  };
}
