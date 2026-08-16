import type { ModelKey } from "./models";
import type { ZoneId } from "./zones";

/** Shape version of GardenConfig. Bump when the JSON structure changes. */
export const GARDEN_SCHEMA_VERSION = 1;

/** Generation of the world geometry these coordinates were authored against. */
export const WORLD_VERSION = 1;

export type Vec3 = [number, number, number];

export type PlacedAsset = {
  id: string;
  assetId: string;
  position: Vec3;
  rotationY: number;
  scale: number;
};

export type ZonePlacement = {
  id: ZoneId;
  unlocked: boolean;
  center: [number, number];
  rotationY: number;
};

export type PlantPlacement = {
  diaryId: string;
  zone: ZoneId;
  slot: number;
  position?: Vec3;
  rotationY?: number;
  scale?: number;
  modelOverride?: ModelKey;
  /** Placed by hand — never auto-reflowed when the world changes. */
  pinned?: boolean;
};

export type GardenConfig = {
  schema: number;
  owner: string;
  worldVersion: number;
  /** Application-level revision counter. Never used for event ordering. */
  rev: number;
  createdAt: number;
  updatedAt: number;
  zones: ZonePlacement[];
  plants: PlantPlacement[];
  decor: PlacedAsset[];
};

export type GardenSyncStatus = "idle" | "loading" | "ready" | "saving" | "error" | "conflict";
