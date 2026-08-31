import type { Diary } from "../nostr/types";
import { plantDisplayName } from "../nostr/plants/catalog";
import { categorizePlant, getGrowthStage, type GrowthStage, type PlantCategory } from "./categories";
import type { GardenConfig, PlantPlacement } from "./config";
import { unitHash } from "./defaults";
import { resolveModel, type ModelChoice } from "./models";
import { PLANT_SLOTS } from "./slots";
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
  /** Index of the fixed planting spot this plant occupies. */
  slotIndex: number;
  /** Stable per-plant variation so identical models don't look cloned. */
  rotation: number;
  scale: number;
};


function describe(diary: Diary) {
  const category = categorizePlant({
    plantSlug: diary.plantSlug,
    plant: diary.plant,
    species: diary.species,
    title: diary.title,
  });
  const stage = getGrowthStage({ phase: diary.phase });
  return { category, stage };
}

function toPlant(diary: Diary, placement: PlantPlacement): GardenPlant {
  const { category, stage } = describe(diary);
  const variation = unitHash(diary.id);
  const zone = ZONES[placement.zone] ? placement.zone : "open-garden";
  const model = placement.modelOverride
    ? { key: placement.modelOverride, dedicated: false }
    : resolveModel(category, diary.plantSlug, stage);

  return {
    id: diary.id,
    diary,
    label: plantDisplayName(diary.plantSlug, diary.plant) || diary.title,
    species: diary.species ?? diary.cultivar,
    category,
    stage,
    zone,
    model,
    position: placement.position ?? slotPosition(ZONES[zone], placement.slot),
    slotIndex: placement.slot,
    rotation: placement.rotationY ?? variation * Math.PI * 2,
    scale: placement.scale ?? 0.88 + variation * 0.28,
  };
}

/** Render list for a garden: placements from the config, diaries for content. */
export function mapConfigToGarden(config: GardenConfig, diaries: Diary[]): GardenPlant[] {
  const byId = new Map(diaries.map((diary) => [diary.id, diary]));
  const plants: GardenPlant[] = [];
  for (const placement of config.plants) {
    const diary = byId.get(placement.diaryId);
    // A placement without its diary is kept in the config but not rendered.
    if (diary) plants.push(toPlant(diary, placement));
  }
  return plants;
}

/**
 * The world mapping: visible diaries fill the fixed planting spots in order.
 * Oldest diary first, so existing plants keep their spot and a new diary takes
 * the first free one. Deleting or hiding a diary frees its spot again.
 */
export function mapDiariesToSlots(diaries: Diary[]): GardenPlant[] {
  return [...diaries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, PLANT_SLOTS.length)
    .map((diary, index) => {
      const slot = PLANT_SLOTS[index]!;
      const plant = toPlant(diary, { diaryId: diary.id, zone: "open-garden", slot: index });
      return {
        ...plant,
        position: [...slot.position] as [number, number, number],
        slotIndex: slot.id,
        rotation: slot.rotationY,
      };
    });
}


/**
 * Placement-free fallback used before a config exists (and by tests): plants
 * fall into their semantic zone in diary order.
 */
export function mapDiariesToGarden(diaries: Diary[]): GardenPlant[] {
  const used: Partial<Record<ZoneId, number>> = {};
  return [...diaries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((diary) => {
      const { category, stage } = describe(diary);
      const zone = zoneForPlant(category, stage);
      const slot = used[zone] ?? 0;
      used[zone] = slot + 1;
      return toPlant(diary, { diaryId: diary.id, zone, slot });
    });
}
