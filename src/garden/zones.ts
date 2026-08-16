import type { GrowthStage, PlantCategory } from "./categories";

export type ZoneId = "open-garden" | "raised-beds" | "orchard" | "greenhouse" | "house";

export type Zone = {
  id: ZoneId;
  label: string;
  /** Ground centre of the zone. */
  center: [number, number];
  /** Slot offsets from the centre, in world units. Slots are reused in order. */
  slots: Array<[number, number]>;
};

// Zones are hand-placed to stay clear of the entrance path, the arch and the
// existing scenery props in Plaza.tsx.
export const ZONES: Record<ZoneId, Zone> = {
  "open-garden": {
    id: "open-garden",
    label: "Open garden",
    center: [8.6, -1.4],
    slots: [
      [0, 0],
      [2.1, 1.4],
      [-1.6, 2.4],
      [2.6, -1.8],
      [0.4, 3.6],
      [4.2, 0.6],
    ],
  },
  "raised-beds": {
    id: "raised-beds",
    label: "Raised beds",
    center: [-7.2, -4.2],
    slots: [
      [-1.5, -0.9],
      [0, -0.9],
      [1.5, -0.9],
      [-1.5, 0.9],
      [0, 0.9],
      [1.5, 0.9],
      [-1.5, 2.7],
      [0, 2.7],
      [1.5, 2.7],
    ],
  },
  orchard: {
    id: "orchard",
    label: "Orchard",
    center: [12, 1.5],
    slots: [
      [0, 0],
      [3, 2.4],
      [-2.4, 3.2],
      [1.6, 5.4],
      [-3.2, -1.4],
      [2.8, -3],
    ],
  },
  greenhouse: {
    id: "greenhouse",
    label: "Greenhouse",
    center: [-11, -10.4],
    slots: [
      [-1.1, 0],
      [0, 0.7],
      [1.1, 0],
      [-0.6, 1.6],
      [0.7, 1.7],
      [1.9, 1],
    ],
  },
  house: {
    id: "house",
    label: "House",
    center: [-11, 8.4],
    slots: [
      [-1.2, 0],
      [0.2, 0.6],
      [1.5, -0.2],
      [-0.7, 1.8],
      [0.9, 2.1],
      [2.4, 1.2],
    ],
  },
};

export const ZONE_FOR_CATEGORY: Record<PlantCategory, ZoneId> = {
  cannabis: "open-garden",
  vegetable: "raised-beds",
  herb: "raised-beds",
  fruit: "orchard",
  indoor: "house",
  other: "open-garden",
};

/**
 * Placement is a separate concern from category: early-stage plants of any
 * category live in the greenhouse until they are established.
 */
export function zoneForPlant(category: PlantCategory, stage: GrowthStage): ZoneId {
  if (stage === "germination" || stage === "seedling") return "greenhouse";
  return ZONE_FOR_CATEGORY[category];
}

export function slotPosition(zone: Zone, index: number): [number, number, number] {
  const slot = zone.slots[index % zone.slots.length]!;
  // Overflow rings shift outward so plants never stack on one another.
  const ring = Math.floor(index / zone.slots.length);
  const spread = 1 + ring * 0.55;
  return [zone.center[0] + slot[0] * spread, 0, zone.center[1] + slot[1] * spread];
}
