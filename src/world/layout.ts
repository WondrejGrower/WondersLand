/**
 * Shared deterministic world layout.
 *
 * Rendering (Trees.tsx) and collision (collision.ts) both read these arrays,
 * so a rendered trunk and its collider can never drift apart.
 * Plain data, no Three.js imports.
 *
 * Arrays and objects here are shared by reference on purpose: the hidden
 * layout editor mutates them in place and rebuilds colliders, so the world
 * can be rearranged live without a second source of truth. Scalars that the
 * editor can change (rotations, scales) live in the mutable `LAYOUT` object.
 */

export const GARDEN_RADIUS = 19;

export type XZ = { x: number; z: number };

/** One shared spatial plan for rendering, interaction, collision and path clearance. */
export const ARCH_POSITION: [number, number, number] = [0, 0, 12.6];
export const ARCH_POST_X = [-2.4, 2.4] as const;
export const ARCH_POST_RADIUS = 0.55;
export const SPAWN: [number, number] = [0, 15.2];
export const WELCOME_POSITION: [number, number] = [-2.4, 7.4];
export const COTTAGE_POSITION: [number, number, number] = [7.4, 0, -6.2];
export const COTTAGE_ROTATION_Y = -0.5;
export const COTTAGE_HALF: [number, number] = [3.4, 2.8];
export const COTTAGE_INTERACTION_POINT: [number, number] = [4.4, -4.1];
export const BOARD_POSITION: [number, number] = [3.1, -6.9];
export const GROW_BEDS_CENTER: [number, number] = [-6.2, -3.2];
export const GROW_BEDS_HALF: [number, number] = [2.6, 2.9];
export const GREENHOUSE_POSITION: [number, number, number] = [-12.5, 0, -12.5];
export const GREENHOUSE_ROTATION_Y = 0.7;
export const GREENHOUSE_HALF: [number, number] = [3.5, 2.2];
export const PATH_FROM: XZ = { x: 0, z: 16.5 };
/** Bend point: the walkway passes through the exact center of the arch. */
export const PATH_VIA: XZ = { x: 0, z: 12.6 };
export const PATH_TO: XZ = { x: 4.4, z: -4.1 };

/**
 * Mutable scalars shared by rendering and collision. Read these (not the
 * `*_ROTATION_Y` constants) wherever a value must follow live edits.
 */
export const LAYOUT = {
  archRotY: 0,
  archScale: 1,
  cottageRotY: COTTAGE_ROTATION_Y,
  cottageScale: 1,
  greenhouseRotY: GREENHOUSE_ROTATION_Y,
  greenhouseScale: 1,
  boardRotY: -0.5,
  boardScale: 1,
  welcomeRotY: 0.5,
  welcomeScale: 1,
};

export type Instance = {
  x: number;
  z: number;
  rot: number;
  scale: number;
  /** Vertical stretch. */
  scaleY: number;
};

export type PlaceableModelType =
  | "arch"
  | "cottage"
  | "greenhouse"
  | "garden-board"
  | "welcome-sign"
  | "grow-beds";

export type PlacedModel = {
  id: number;
  type: PlaceableModelType;
  x: number;
  z: number;
  rot: number;
  scale: number;
};

/** Session-only additions and hidden originals managed by the owner editor. */
export const PLACED_MODELS: PlacedModel[] = [];
export const HIDDEN_LAYOUT_ITEMS = new Set<string>();

/** Deterministic pseudo-random: same garden every visit, no data shipped. */
export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}


/** Tree line: boundary ring plus a few closer trees framing the plaza. */
export const TREE_INSTANCES: Instance[] = (() => {
  const random = rng(4711);
  const list: Instance[] = [];

  const count = 26;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + random() * 0.08;
    const r = GARDEN_RADIUS + 1.2 + random() * 1.6;
    const s = 0.85 + random() * 0.45;
    list.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      rot: random() * Math.PI * 2,
      scale: s,
      scaleY: s,
    });
  }

  ([
    [-8.5, 7, 0.7],
    [9.5, 7, 0.62],
    [11.5, -10, 0.8],
  ] as [number, number, number][]).forEach(([x, z, s], i) => {
    list.push({ x, z, rot: i * 1.7, scale: s, scaleY: s });
  });

  return list;
})();
