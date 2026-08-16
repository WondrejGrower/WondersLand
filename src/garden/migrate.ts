import { GARDEN_SCHEMA_VERSION, WORLD_VERSION, type GardenConfig } from "./config";
import { ZONES } from "./zones";

/**
 * Upgrade an older GardenConfig to the current schema. Migrations run on read;
 * the next save writes the new version. The event address never changes.
 */
export function migrateConfig(config: GardenConfig): GardenConfig {
  let next = config;

  // v1 is the first schema — future steps chain here:
  // if (next.schema < 2) next = { ...next, schema: 2, ... };

  if (next.schema !== GARDEN_SCHEMA_VERSION) {
    next = { ...next, schema: Math.min(next.schema, GARDEN_SCHEMA_VERSION) };
  }

  // World geometry moved: non-pinned plants go back to their zone slots.
  if (next.worldVersion !== WORLD_VERSION) {
    next = {
      ...next,
      worldVersion: WORLD_VERSION,
      zones: next.zones.map((zone) =>
        zone.center[0] === ZONES[zone.id].center[0] && zone.center[1] === ZONES[zone.id].center[1]
          ? zone
          : { ...zone, center: [...ZONES[zone.id].center] as [number, number] },
      ),
      plants: next.plants.map((plant) => {
        if (plant.pinned) return plant;
        const { position: _position, ...rest } = plant;
        return rest;
      }),
    };
  }

  return next;
}

/** True when the stored config is newer than this build understands. */
export function isFutureSchema(config: GardenConfig): boolean {
  return config.schema > GARDEN_SCHEMA_VERSION;
}
