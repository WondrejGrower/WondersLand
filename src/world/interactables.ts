/**
 * The single, deterministic list of world interactables.
 *
 * Rendering (Portals, FocusRing), proximity (Player), collision (collision.ts)
 * and the prompt UI all read this file, so a visible object, its collider and
 * its prompt can never drift apart. Plain data — no Three.js imports.
 */

export type WorldZoneId =
  | "spawn"
  | "welcome"
  | "path"
  | "house"
  | "grow-beds"
  | "plaza-portal"
  | "friend-portal";

export type WorldAction = "about" | "indoor" | "coming-soon";

export type WorldInteractableId =
  | "welcome-sign"
  | "my-garden-house"
  | "plaza-portal"
  | "friend-portal";

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
  /** Decoration keeps this much distance away, so the object can breathe. */
  clearance: number;
  comingSoon?: { title: string; body: string };
};

/** Player spawn, on the stone path looking up toward the house. */
export const SPAWN: [number, number] = [2.25, 8];

/** Outdoor grow-bed area — matches the "raised-beds" plant zone. */
export const GROW_BEDS_CENTER: [number, number] = [-7.2, -4.2];
export const GROW_BEDS_HALF: [number, number] = [2.6, 2.9];

export const WORLD_INTERACTABLES: readonly WorldInteractable[] = [
  {
    id: "welcome-sign",
    zone: "welcome",
    position: [0.3, 6.0],
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
    position: [6, -4],
    radius: 5,
    focusRadius: 2.6,
    label: "My Garden",
    verb: "enter",
    action: "indoor",
    clearance: 5,
  },
  {
    id: "plaza-portal",
    zone: "plaza-portal",
    position: [-7.4, 9.6],
    radius: 3.2,
    focusRadius: 1.4,
    label: "Plaza portal",
    verb: "use",
    action: "coming-soon",
    collider: 0.9,
    clearance: 3,
    comingSoon: {
      title: "The Plaza is coming soon",
      body: "A shared meeting ground where growers gather, show off their gardens and swap notes. It is not open yet — for now the Grow Feed is where the community lives.",
    },
  },
  {
    id: "friend-portal",
    zone: "friend-portal",
    position: [11.4, 6.2],
    radius: 3.2,
    focusRadius: 1.4,
    label: "Visit a friend",
    verb: "use",
    action: "coming-soon",
    collider: 0.9,
    clearance: 3,
    comingSoon: {
      title: "Visiting is coming soon",
      body: "Step through to walk someone else's garden, grown from their public Nostr diaries. Until then you can follow other growers in the Grow Feed.",
    },
  },
] as const;

export function getInteractable(id: string): WorldInteractable | undefined {
  return WORLD_INTERACTABLES.find((it) => it.id === id);
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
