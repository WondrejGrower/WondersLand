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
export const ARCH_POSITION: [number, number, number] = [0, 0, 12.9];
export const ARCH_POST_X = [-2.4, 2.4] as const;
export const ARCH_POST_RADIUS = 0.55;
export const SPAWN: [number, number] = [0, 15.2];
export const WELCOME_POSITION: [number, number] = [-2.6, 9.7];
export const COTTAGE_POSITION: [number, number, number] = [0.7, 0, -9];
export const COTTAGE_ROTATION_Y = -0.2;
export const COTTAGE_HALF: [number, number] = [3.4, 2.8];
export const COTTAGE_INTERACTION_POINT: [number, number] = [4.4, -4.1];
export const BOARD_POSITION: [number, number] = [3, -2.2];
export const GROW_BEDS_CENTER: [number, number] = [-6.2, -3.2];
export const GROW_BEDS_HALF: [number, number] = [2.6, 2.9];
export const GREENHOUSE_POSITION: [number, number, number] = [-15.2, 0, -6.8];
export const GREENHOUSE_ROTATION_Y = 0.7;
export const GREENHOUSE_HALF: [number, number] = [3.5, 2.2];
export const PATH_FROM: XZ = { x: 0, z: 16.5 };
/** Bend point: the walkway passes through the exact center of the arch. */
export const PATH_VIA: XZ = { x: 0, z: 12.6 };
export const PATH_TO: XZ = { x: 0, z: -4.5 };

/**
 * Mutable scalars shared by rendering and collision. Read these (not the
 * `*_ROTATION_Y` constants) wherever a value must follow live edits.
 */
export const LAYOUT = {
  archRotY: 0,
  archScale: 1,
  cottageRotY: COTTAGE_ROTATION_Y,
  cottageScale: 1.4,
  greenhouseRotY: GREENHOUSE_ROTATION_Y,
  greenhouseScale: 1,
  boardRotY: -0.75,
  boardScale: 1.5,
  welcomeRotY: 0.5,
  welcomeScale: 0.85,
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
export const TREE_INSTANCES: Instance[] = [
  { x: 21.134, z: 0.105, rot: 0.327, scale: 1.066, scaleY: 1.066 },
  { x: 19.707, z: 5.036, rot: 4, scale: 1.282, scaleY: 1.282 },
  { x: 18.15, z: 9.646, rot: 5.578, scale: 0.984, scaleY: 0.984 },
  { x: 15.48, z: 15.117, rot: 1.818, scale: 1.144, scaleY: 1.144 },
  { x: 12, z: 18.047, rot: 1.688, scale: 0.856, scaleY: 0.856 },
  { x: 6.821, z: 19.062, rot: 0.441, scale: 1.24, scaleY: 1.24 },
  { x: 2.435, z: 21.08, rot: 1.906, scale: 1.036, scaleY: 1.036 },
  { x: -3.588, z: 20.352, rot: 5.048, scale: 1.095, scaleY: 1.095 },
  { x: -8.023, z: 18.698, rot: 4.373, scale: 0.859, scaleY: 0.859 },
  { x: -13.302, z: 16.499, rot: 5.077, scale: 1.102, scaleY: 1.102 },
  { x: -15.311, z: 13.479, rot: 5.096, scale: 1.209, scaleY: 1.209 },
  { x: -19.418, z: 9.786, rot: 4.676, scale: 0.99, scaleY: 0.99 },
  { x: -20.782, z: 4.173, rot: 5.028, scale: 0.922, scaleY: 0.922 },
  { x: -21.369, z: -0.891, rot: 3.275, scale: 1.142, scaleY: 1.142 },
  { x: -19.487, z: -5.37, rot: 4.973, scale: 0.977, scaleY: 0.977 },
  { x: -18.949, z: -10.306, rot: 1.684, scale: 0.888, scaleY: 0.888 },
  { x: -14.701, z: -14.505, rot: 0.891, scale: 1.189, scaleY: 1.189 },
  { x: -11.627, z: -17.06, rot: 2.304, scale: 1.01, scaleY: 1.01 },
  { x: -7.269, z: -19.942, rot: 4.719, scale: 1.08, scaleY: 1.08 },
  { x: -1.301, z: -20.462, rot: 3.443, scale: 0.968, scaleY: 0.968 },
  { x: 2.667, z: -21.063, rot: 2.758, scale: 0.895, scaleY: 0.895 },
  { x: 7.863, z: -19.792, rot: 0.309, scale: 1.226, scaleY: 1.226 },
  { x: 12.79, z: -17.573, rot: 2.419, scale: 0.966, scaleY: 0.966 },
  { x: 16.061, z: -12.366, rot: 5.251, scale: 1.22, scaleY: 1.22 },
  { x: 19.111, z: -9.271, rot: 3.955, scale: 1.202, scaleY: 1.202 },
  { x: 20.771, z: -3.642, rot: 5.551, scale: 1.064, scaleY: 1.064 },
  { x: -8.5, z: 7, rot: 0, scale: 0.7, scaleY: 0.7 },
  { x: 9.5, z: 7, rot: 1.7, scale: 0.62, scaleY: 0.62 },
  { x: 11.5, z: -10, rot: 3.4, scale: 0.8, scaleY: 0.8 },
];
