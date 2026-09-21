/**
 * The single, deterministic list of world interactables.
 *
 * Rendering, proximity, collision and navigation all consume this same data.
 * and the prompt UI all read this file, so a visible object, its collider and
 * its prompt can never drift apart. Plain data — no Three.js imports.
 */

import {
  BOARD_POSITION,
  COTTAGE_INTERACTION_POINT,
  COTTAGE_POSITION,
  GROW_BEDS_CENTER,
  GROW_BEDS_HALF,
  SPAWN,
  WELCOME_POSITION,
} from "./layout";

export type WorldZoneId = "spawn" | "welcome" | "path" | "house" | "grow-beds" | "garden-board";

export type WorldAction = "about" | "indoor" | "tasks";

export type WorldInteractableId =
  | "welcome-sign"
  | "my-garden-house"
  | "garden-board";

export type WorldInteractable = {
  id: WorldInteractableId;
  zone: WorldZoneId;
  /** Ground position (x, z). */
  position: [number, number];
  /** How close the player must stand for the prompt to appear. */
  radius: number;
  /** Height of the focus cue above the ground. */
  focusRadius: number;
  label: string;
  /** Verb shown in the contextual prompt. */
  verb: string;
  action: WorldAction;
  /** Solid circle radius; omitted when a box collider lives elsewhere. */
  collider?: number;
  /**
   * Where the avatar should stand to use this object. Defaults to `position`,
   * which is right for anything you can walk up to from any side.
   */
  interactionPoint?: [number, number];
  /** How close counts as in range for click-to-interact. Defaults from radius. */
  interactionRadius?: number;
  /** Decoration keeps this much distance away, so the object can breathe. */
  clearance: number;
};

/** Player spawn, on the stone path looking up toward the house. */
export { SPAWN };

/** Outdoor grow-bed area — matches the "raised-beds" plant zone. */
export { GROW_BEDS_CENTER, GROW_BEDS_HALF };

export const WORLD_INTERACTABLES: WorldInteractable[] = [
  {
    id: "welcome-sign",
    zone: "welcome",
    position: WELCOME_POSITION,
    radius: 3.4,
    focusRadius: 1.1,
    label: "Welcome sign",
    verb: "read",
    action: "about",
    collider: 0.55,
    clearance: 2.4,
  },
  {
    id: "my-garden-house",
    zone: "house",
    position: [COTTAGE_POSITION[0], COTTAGE_POSITION[2]],
    radius: 5,
    focusRadius: 2.6,
    label: "My Garden",
    verb: "enter",
    action: "indoor",
    clearance: 5,
    // The cottage is solid: stand at its door side, not inside the wall.
    interactionPoint: COTTAGE_INTERACTION_POINT,
    interactionRadius: 2.4,
  },
  {
    // Temporary wooden board beside the house; a proper asset can replace the
    // geometry later without touching this entry.
    id: "garden-board",
    zone: "house",
    position: BOARD_POSITION,
    radius: 2.6,
    focusRadius: 0.9,
    label: "Garden board",
    verb: "open",
    action: "tasks",
    collider: 0.5,
    clearance: 1.8,
  },
];

export function getInteractable(id: string): WorldInteractable | undefined {
  return WORLD_INTERACTABLES.find((it) => it.id === id);
}

/**
 * Re-derive the entries whose coordinates are copied out of layout.ts.
 * Only the hidden layout editor calls this; at runtime nothing moves.
 */
export function rebuildInteractables() {
  const house = getInteractable("my-garden-house");
  if (house) {
    house.position[0] = COTTAGE_POSITION[0];
    house.position[1] = COTTAGE_POSITION[2];
  }
}

/** True when (x, z) sits inside the breathing room of any interactable. */
export function nearInteractable(x: number, z: number, extra = 0): boolean {
  for (const it of WORLD_INTERACTABLES) {
    if (Math.hypot(it.position[0] - x, it.position[1] - z) < it.clearance + extra) return true;
  }
  const bx = Math.abs(x - GROW_BEDS_CENTER[0]) - GROW_BEDS_HALF[0] - extra;
  const bz = Math.abs(z - GROW_BEDS_CENTER[1]) - GROW_BEDS_HALF[1] - extra;
  return bx < 0 && bz < 0;
}
