/**
 * Lightweight XZ collision.
 *
 * Movement is ground based, so obstacles are 2D circles and rotated boxes.
 * No physics engine, no BVH, no per-triangle tests. Resolution pushes the
 * player out along the surface normal, which naturally produces sliding.
 *
 * Physical colliders are deliberately smaller than the matching interaction
 * radii, so the player can always stand close enough to press E / tap.
 */
import { ROCK_INSTANCES, TREE_INSTANCES } from "./layout";
import {
  ARCH_POSITION,
  ARCH_POST_RADIUS,
  ARCH_POST_X,
  GREENHOUSE_HALF,
  GREENHOUSE_POSITION,
  GREENHOUSE_ROTATION_Y,
  ISLAND_CENTER,
  ISLAND_RADIUS,
  PLAZA_ROCKS,
} from "./Plaza";
import { COTTAGE_POSITION, COTTAGE_ROTATION_Y, COTTAGE_HALF } from "./Cottage";
import { GROW_BEDS_CENTER, GROW_BEDS_HALF, WORLD_INTERACTABLES } from "./interactables";

export const PLAYER_RADIUS = 0.42;

export type Collider =
  | { kind: "circle"; x: number; z: number; r: number }
  | { kind: "box"; x: number; z: number; hw: number; hd: number; rot: number };

function circle(x: number, z: number, r: number): Collider {
  return { kind: "circle", x, z, r };
}

/** Static scenery colliders, built once at module load. */
export const WORLD_COLLIDERS: Collider[] = (() => {
  const list: Collider[] = [];

  // Cottage + greenhouse: rotated boxes matching their solid footprint.
  list.push({
    kind: "box",
    x: COTTAGE_POSITION[0],
    z: COTTAGE_POSITION[2],
    hw: COTTAGE_HALF[0],
    hd: COTTAGE_HALF[1],
    rot: COTTAGE_ROTATION_Y,
  });
  list.push({
    kind: "box",
    x: GREENHOUSE_POSITION[0],
    z: GREENHOUSE_POSITION[2],
    hw: GREENHOUSE_HALF[0],
    hd: GREENHOUSE_HALF[1],
    rot: GREENHOUSE_ROTATION_Y,
  });

  // Welcome sign and the two portals: solid circles from the shared data.
  for (const it of WORLD_INTERACTABLES) {
    if (it.collider) list.push(circle(it.position[0], it.position[1], it.collider));
  }

  // Raised grow beds: the two long timber rims. The ends stay open so the
  // player can still step between the beds and reach the plants.
  for (const dz of [-1, 1]) {
    list.push({
      kind: "box",
      x: GROW_BEDS_CENTER[0],
      z: GROW_BEDS_CENTER[1] + dz * GROW_BEDS_HALF[1],
      hw: GROW_BEDS_HALF[0],
      hd: 0.14,
      rot: 0,
    });
  }

  // Central planted island.
  list.push(circle(ISLAND_CENTER[0], ISLAND_CENTER[1], ISLAND_RADIUS));

  // Entrance arch posts — the gap between them stays walkable.
  for (const x of ARCH_POST_X) {
    list.push(circle(ARCH_POSITION[0] + x, ARCH_POSITION[2], ARCH_POST_RADIUS));
  }

  // Hand-placed framing rocks.
  for (const [x, z, s] of PLAZA_ROCKS) list.push(circle(x, z, s * 0.9));

  // Scattered rocks: only the substantial ones. Pebbles stay walkable.
  for (const rock of ROCK_INSTANCES) {
    if (rock.scale < 0.8) continue;
    list.push(circle(rock.x, rock.z, rock.scale * 0.4));
  }

  // Tree trunks only — canopies overhang freely.
  for (const tree of TREE_INSTANCES) {
    list.push(circle(tree.x, tree.z, 0.45 * tree.scale));
  }

  return list;
})();

// Scratch scalars: resolveMove never allocates.
let outX = 0;
let outZ = 0;

function pushOutCircle(x: number, z: number, c: { x: number; z: number; r: number }, radius: number) {
  const dx = x - c.x;
  const dz = z - c.z;
  const min = c.r + radius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return false;
  const d = Math.sqrt(d2);
  if (d < 1e-5) {
    outX = c.x + min;
    outZ = c.z;
    return true;
  }
  outX = c.x + (dx / d) * min;
  outZ = c.z + (dz / d) * min;
  return true;
}

function pushOutBox(
  x: number,
  z: number,
  b: { x: number; z: number; hw: number; hd: number; rot: number },
  radius: number,
) {
  const cos = Math.cos(-b.rot);
  const sin = Math.sin(-b.rot);
  const dx = x - b.x;
  const dz = z - b.z;
  // Into box-local space.
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  const ex = b.hw + radius;
  const ez = b.hd + radius;
  if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) return false;
  // Least-penetration axis.
  const penX = ex - Math.abs(lx);
  const penZ = ez - Math.abs(lz);
  let nx = lx;
  let nz = lz;
  if (penX < penZ) {
    nx = lx >= 0 ? ex : -ex;
  } else {
    nz = lz >= 0 ? ez : -ez;
  }
  // Back to world space.
  const c2 = Math.cos(b.rot);
  const s2 = Math.sin(b.rot);
  outX = b.x + (nx * c2 - nz * s2);
  outZ = b.z + (nx * s2 + nz * c2);
  return true;
}

/**
 * Resolve a desired position against a collider list.
 * Writes the result into `resolved`. Allocation free.
 */
export const resolved = { x: 0, z: 0 };

export function resolveMove(
  toX: number,
  toZ: number,
  colliders: readonly Collider[],
  extra: readonly Collider[] | null,
  radius = PLAYER_RADIUS,
) {
  let x = toX;
  let z = toZ;

  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i]!;
      const hit =
        c.kind === "circle" ? pushOutCircle(x, z, c, radius) : pushOutBox(x, z, c, radius);
      if (hit) {
        x = outX;
        z = outZ;
        moved = true;
      }
    }
    if (extra) {
      for (let i = 0; i < extra.length; i++) {
        const c = extra[i]!;
        const hit =
          c.kind === "circle" ? pushOutCircle(x, z, c, radius) : pushOutBox(x, z, c, radius);
        if (hit) {
          x = outX;
          z = outZ;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  resolved.x = x;
  resolved.z = z;
}

/** Dev-only guard: warn if the spawn point starts inside solid scenery. */
export function assertSpawnClear(x: number, z: number) {
  resolveMove(x, z, WORLD_COLLIDERS, null);
  if (Math.abs(resolved.x - x) > 1e-4 || Math.abs(resolved.z - z) > 1e-4) {
    console.warn(
      `[collision] spawn (${x}, ${z}) overlaps a collider; pushed to (${resolved.x.toFixed(2)}, ${resolved.z.toFixed(2)})`,
    );
  }
}
