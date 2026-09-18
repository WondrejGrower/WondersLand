/**
 * Path abstraction.
 *
 * Today this is a direct-ground planner: a straight line when the way is
 * clear, one sidestep waypoint when it is not. The character controller only
 * ever consumes an array of waypoints, so a real NavMesh (Recast) can replace
 * `planPath` later without touching input or locomotion code.
 *
 * Paths are computed on destination change only — never per frame.
 */
import { PLAYER_RADIUS, WORLD_COLLIDERS, resolveMove, resolved, type Collider } from "../collision";
import { GARDEN_RADIUS } from "../layout";

export type Waypoint = { x: number; z: number };

/** Diary plants come and go; the player component keeps this list current. */
let dynamic: readonly Collider[] = [];

export function setDynamicColliders(list: readonly Collider[]) {
  dynamic = list;
}

/** True when a body of `radius` cannot stand at (x, z). */
export function isBlocked(x: number, z: number, radius = PLAYER_RADIUS): boolean {
  resolveMove(x, z, WORLD_COLLIDERS, dynamic, radius);
  return Math.abs(resolved.x - x) > 1e-3 || Math.abs(resolved.z - z) > 1e-3;
}

/** Keep a destination inside the walkable disc. */
export function clampToWorld(x: number, z: number): Waypoint {
  const limit = GARDEN_RADIUS - 1;
  const d = Math.hypot(x, z);
  if (d <= limit || d === 0) return { x, z };
  const k = limit / d;
  return { x: x * k, z: z * k };
}

const STEP = 0.4;

/** Sample the segment; false as soon as any sample is inside scenery. */
export function lineClear(ax: number, az: number, bx: number, bz: number): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(len / STEP));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (isBlocked(ax + dx * t, az + dz * t)) return false;
  }
  return true;
}

const SIDESTEPS = [1.6, 3.2, 5.0];

/**
 * Waypoints from (ax, az) to (bx, bz). Never empty: if nothing works we return
 * the direct target and let collision sliding do its job, exactly like WASD.
 */
export function planPath(ax: number, az: number, bx: number, bz: number): Waypoint[] {
  const goal = clampToWorld(bx, bz);
  if (lineClear(ax, az, goal.x, goal.z)) return [goal];

  const dx = goal.x - ax;
  const dz = goal.z - az;
  const len = Math.hypot(dx, dz) || 1;
  // Unit normal to the direct line.
  const nx = -dz / len;
  const nz = dx / len;
  const mx = ax + dx * 0.5;
  const mz = az + dz * 0.5;

  for (const offset of SIDESTEPS) {
    for (const sign of [1, -1]) {
      const via = clampToWorld(mx + nx * offset * sign, mz + nz * offset * sign);
      if (isBlocked(via.x, via.z)) continue;
      if (lineClear(ax, az, via.x, via.z) && lineClear(via.x, via.z, goal.x, goal.z)) {
        return [via, goal];
      }
    }
  }

  return [goal];
}
