import {
  GARDEN_SCHEMA_VERSION,
  type GardenConfig,
  type PlacedAsset,
  type PlantPlacement,
  type Vec3,
  type ZonePlacement,
} from "./config";
import type { ModelKey } from "./models";
import { ZONES, type ZoneId } from "./zones";

const MAX_PLANTS = 500;
const MAX_DECOR = 500;
const WORLD_BOUND = 60;

const MODEL_KEYS: ModelKey[] = ["cannabis", "vegetable", "herb", "fruit-tree", "houseplant", "seedling"];

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, bound = WORLD_BOUND): number {
  return Math.max(-bound, Math.min(bound, value));
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function zoneId(value: unknown): ZoneId | null {
  return typeof value === "string" && value in ZONES ? (value as ZoneId) : null;
}

function vec3(value: unknown): Vec3 | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const [x, y, z] = value;
  if (![x, y, z].every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  return [clamp(x as number), clamp(y as number, 20), clamp(z as number)];
}

/** A garden config must never carry key material — reject the whole event if it does. */
function containsSecret(raw: string): boolean {
  return /nsec1[0-9a-z]{20,}/i.test(raw) || /\b[0-9a-f]{64}\b:priv/i.test(raw);
}

function parsePlant(input: unknown): PlantPlacement | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const diaryId = str(record["diaryId"]);
  const zone = zoneId(record["zone"]);
  if (!diaryId || !zone) return null;

  const placement: PlantPlacement = {
    diaryId,
    zone,
    slot: Math.max(0, Math.floor(num(record["slot"], 0))),
  };
  const position = vec3(record["position"]);
  if (position) placement.position = position;
  if (typeof record["rotationY"] === "number" && Number.isFinite(record["rotationY"])) {
    placement.rotationY = record["rotationY"];
  }
  if (typeof record["scale"] === "number" && Number.isFinite(record["scale"])) {
    placement.scale = Math.max(0.2, Math.min(4, record["scale"]));
  }
  const model = record["modelOverride"];
  if (typeof model === "string" && MODEL_KEYS.includes(model as ModelKey)) {
    placement.modelOverride = model as ModelKey;
  }
  if (record["pinned"] === true) placement.pinned = true;
  return placement;
}

function parseDecor(input: unknown): PlacedAsset | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const id = str(record["id"]);
  const assetId = str(record["assetId"]);
  const position = vec3(record["position"]);
  if (!id || !assetId || !position) return null;
  return {
    id,
    assetId,
    position,
    rotationY: num(record["rotationY"], 0),
    scale: Math.max(0.1, Math.min(8, num(record["scale"], 1))),
  };
}

function parseZone(input: unknown): ZonePlacement | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const id = zoneId(record["id"]);
  if (!id) return null;
  const center = Array.isArray(record["center"]) ? record["center"] : [];
  return {
    id,
    unlocked: record["unlocked"] !== false,
    center: [clamp(num(center[0], ZONES[id].center[0])), clamp(num(center[1], ZONES[id].center[1]))],
    rotationY: num(record["rotationY"], 0),
  };
}

/**
 * Turn untrusted JSON from a relay (or a stale cache) into a GardenConfig, or
 * null. Unknown fields are dropped, numbers clamped, arrays capped.
 */
export function parseGardenConfig(raw: string, expectedOwner: string): GardenConfig | null {
  if (!raw || raw.length > 512_000) return null;
  if (containsSecret(raw)) return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  const owner = str(record["owner"])?.toLowerCase();
  if (!owner || owner !== expectedOwner.toLowerCase()) return null;

  const schema = Math.floor(num(record["schema"], 0));
  if (schema < 1 || schema > GARDEN_SCHEMA_VERSION + 100) return null;

  const now = Math.floor(Date.now() / 1000);
  const plants = (Array.isArray(record["plants"]) ? record["plants"] : [])
    .slice(0, MAX_PLANTS)
    .map(parsePlant)
    .filter((p): p is PlantPlacement => p !== null);
  const decor = (Array.isArray(record["decor"]) ? record["decor"] : [])
    .slice(0, MAX_DECOR)
    .map(parseDecor)
    .filter((d): d is PlacedAsset => d !== null);
  const zones = (Array.isArray(record["zones"]) ? record["zones"] : [])
    .slice(0, 32)
    .map(parseZone)
    .filter((z): z is ZonePlacement => z !== null);

  return {
    schema,
    owner,
    worldVersion: Math.max(1, Math.floor(num(record["worldVersion"], 1))),
    rev: Math.max(0, Math.floor(num(record["rev"], 0))),
    createdAt: Math.floor(num(record["createdAt"], now)),
    updatedAt: Math.floor(num(record["updatedAt"], now)),
    zones,
    plants,
    decor,
  };
}
