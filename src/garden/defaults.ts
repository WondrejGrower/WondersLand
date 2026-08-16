import type { Diary } from "../nostr/types";
import { categorizePlant, getGrowthStage } from "./categories";
import { GARDEN_SCHEMA_VERSION, WORLD_VERSION, type GardenConfig, type PlantPlacement } from "./config";
import { ZONES, zoneForPlant, type ZoneId } from "./zones";

/** Stable 32-bit hash — same input, same garden, on every device. */
export function hash32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function unitHash(text: string): number {
  return hash32(text) / 4294967295;
}

function defaultZones() {
  return (Object.keys(ZONES) as ZoneId[]).map((id) => ({
    id,
    unlocked: true,
    center: [...ZONES[id].center] as [number, number],
    rotationY: 0,
  }));
}

/**
 * Deterministic placement for diaries that have no explicit placement yet.
 * Ordering is by a hash of pubkey+diaryId, not by fetch order, so relays
 * returning events in a different sequence still produce the same garden.
 */
export function placeDiaries(
  pubkey: string,
  diaries: Diary[],
  existing: PlantPlacement[] = [],
): PlantPlacement[] {
  const byId = new Map(existing.map((p) => [p.diaryId, p]));
  const used = new Map<ZoneId, Set<number>>();
  for (const placement of existing) {
    const slots = used.get(placement.zone) ?? new Set<number>();
    slots.add(placement.slot);
    used.set(placement.zone, slots);
  }

  const pending = diaries
    .filter((diary) => !byId.has(diary.id))
    .sort((a, b) => hash32(pubkey + a.id) - hash32(pubkey + b.id));

  const placements: PlantPlacement[] = [...existing];
  for (const diary of pending) {
    const category = categorizePlant({
      plantSlug: diary.plantSlug,
      plant: diary.plant,
      species: diary.species,
      title: diary.title,
    });
    const zone = zoneForPlant(category, getGrowthStage({ phase: diary.phase }));
    const slots = used.get(zone) ?? new Set<number>();
    let slot = 0;
    while (slots.has(slot)) slot += 1;
    slots.add(slot);
    used.set(zone, slots);
    placements.push({ diaryId: diary.id, zone, slot });
  }
  return placements;
}

/** Build the garden a pubkey gets before it has ever saved anything. */
export function buildDefaultConfig(pubkey: string, diaries: Diary[]): GardenConfig {
  const now = Math.floor(Date.now() / 1000);
  return {
    schema: GARDEN_SCHEMA_VERSION,
    owner: pubkey.toLowerCase(),
    worldVersion: WORLD_VERSION,
    rev: 0,
    createdAt: now,
    updatedAt: now,
    zones: defaultZones(),
    plants: placeDiaries(pubkey, diaries),
    decor: [],
  };
}

/** Add placements for diaries that appeared after the config was written. */
export function reconcileDiaries(config: GardenConfig, pubkey: string, diaries: Diary[]): GardenConfig {
  const known = new Set(config.plants.map((p) => p.diaryId));
  if (diaries.every((d) => known.has(d.id))) return config;
  return { ...config, plants: placeDiaries(pubkey, diaries, config.plants) };
}
