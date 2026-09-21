/**
 * Character controller.
 *
 * The single owner of "where the avatar is and what it is trying to do".
 * Inputs (WASD, click-to-move, future NPC scripts) only call the commands
 * below; the locomotion loop in Player.tsx reads this state each frame.
 *
 * Plain mutable module state on purpose: this is per-frame data, so it must
 * never live in React state and never allocate.
 */
import { Vector3 } from "three";
import { planPath, type Waypoint } from "../nav/path";

export type InteractRequest = { kind: "world" | "plant"; id: string };

export const character = {
  pos: new Vector3(),
  /** Facing of the avatar. */
  charYaw: 0,
  /** Camera orbit angle. */
  camYaw: 0,
  /** Camera distance multiplier applied on top of the base distance. */
  zoom: 1,
  /** Direction command for this frame, written by WASD / joystick. */
  forward: 0,
  strafe: 0,
  /** Actual locomotion result from Player, shared with avatar animation. */
  moving: false,
  /** Active path from the last moveTo, consumed waypoint by waypoint. */
  path: [] as Waypoint[],
  pathIndex: 0,
  /** Interaction to run once the avatar reaches its interaction radius. */
  pending: null as InteractRequest | null,
  /** Destination marker: seconds of life left (<= 0 means hidden). */
  marker: { x: 0, z: 0, life: 0 },
  /** Briefly highlighted interactable id. */
  highlight: { id: null as string | null, life: 0 },
};

export function clearPath() {
  character.path.length = 0;
  character.pathIndex = 0;
}

/** Walk to a world position, routed around known obstacles. */
export function moveTo(x: number, z: number) {
  const path = planPath(character.pos.x, character.pos.z, x, z);
  character.path = path;
  character.pathIndex = 0;
}

/** Continuous direction command (camera-relative axes). Cancels any path. */
export function moveDirection(forward: number, strafe: number) {
  character.forward = forward;
  character.strafe = strafe;
  if (forward !== 0 || strafe !== 0) {
    if (character.path.length > 0) clearPath();
    character.pending = null;
  }
}

/** Stop everything the avatar is autonomously doing. */
export function stop() {
  clearPath();
  character.pending = null;
  character.forward = 0;
  character.strafe = 0;
  character.moving = false;
}

export function hasDestination(): boolean {
  return character.pathIndex < character.path.length;
}

/** Current waypoint, or null when the path is finished. */
export function currentWaypoint(): Waypoint | null {
  return character.path[character.pathIndex] ?? null;
}

export function advanceWaypoint() {
  character.pathIndex += 1;
  if (character.pathIndex >= character.path.length) clearPath();
}

export function showMarker(x: number, z: number, life = 0.9) {
  character.marker.x = x;
  character.marker.z = z;
  character.marker.life = life;
}

export function highlightTarget(id: string, life = 0.8) {
  character.highlight.id = id;
  character.highlight.life = life;
}

export function distanceTo(x: number, z: number): number {
  return Math.hypot(character.pos.x - x, character.pos.z - z);
}
