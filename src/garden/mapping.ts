import type { Diary } from "../nostr/types";
import { plantDisplayName } from "../nostr/plants/catalog";
import { categorizePlant, getGrowthStage, type GrowthStage, type PlantCategory } from "./categories";
import { resolveModel, type ModelChoice } from "./models";
import { slotPosition, ZONES, zoneForPlant, type ZoneId } from "./zones";

export type GardenPlant = {
  /** Diary id — also the focus id used by the interaction system. */
  id: string;
  diary: Diary;
  label: string;
  species: string | undefined;
  category: PlantCategory;
  stage: GrowthStage;
  zone: ZoneId;
  model: ModelChoice;
  position: [number, number, number];
  /** Stable per-plant variation so identical models don't look cloned. */
  rotation: number;
  scale: number;
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Turn a grower's diaries into placed plants across the garden's zones. */
export function mapDiariesToGarden(diaries: Diary[]): GardenPlant[] {
  const used: Partial<Record<ZoneId, number>> = {};
  const ordered = [...diaries].sort((a, b) => a.createdAt - b.createdAt);

  return ordered.map((diary) => {
    const category = categorizePlant({
      plantSlug: diary.plantSlug,
      plant: diary.plant,
      species: diary.species,
      title: diary.title,
    });
    const stage = getGrowthStage({ phase: diary.phase });
    const zone = zoneForPlant(category, stage);
    const index = used[zone] ?? 0;
    used[zone] = index + 1;
    const variation = hash(diary.id);

    return {
      id: diary.id,
      diary,
      label: plantDisplayName(diary.plantSlug, diary.plant) || diary.title,
      species: diary.species ?? diary.cultivar,
      category,
      stage,
      zone,
      model: resolveModel(category, diary.plantSlug, stage),
      position: slotPosition(ZONES[zone], index),
      rotation: variation * Math.PI * 2,
      scale: 0.88 + variation * 0.28,
    };
  });
}
