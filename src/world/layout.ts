/**
 * Shared deterministic world layout.
 *
 * Rendering (Trees.tsx) and collision (collision.ts) both read these arrays,
 * so a rendered trunk and its collider can never drift apart.
 * Plain data, no Three.js imports.
 */

export const GARDEN_RADIUS = 19;

/** One shared spatial plan for rendering, interaction, collision and path clearance. */
export const ARCH_POSITION: [number, number, number] = [0, 0, 17];
export const ARCH_POST_X = [-2.4, 2.4] as const;
export const ARCH_POST_RADIUS = 0.55;
export const SPAWN: [number, number] = [0, 13.5];
export const WELCOME_POSITION: [number, number] = [-2.2, 10.2];
export const COTTAGE_POSITION: [number, number, number] = [7, 0, -5];
export const COTTAGE_ROTATION_Y = -0.35;
export const COTTAGE_HALF: [number, number] = [3.4, 2.8];
export const COTTAGE_INTERACTION_POINT: [number, number] = [3.7, -2.2];
export const BOARD_POSITION: [number, number] = [2.3, -7.8];
export const GROW_BEDS_CENTER: [number, number] = [-6.2, -3.2];
export const GROW_BEDS_HALF: [number, number] = [2.6, 2.9];
export const GREENHOUSE_POSITION: [number, number, number] = [-12.5, 0, -12.5];
export const GREENHOUSE_ROTATION_Y = 0.7;
export const GREENHOUSE_HALF: [number, number] = [3.5, 2.2];
export const PATH_FROM = { x: 0, z: 16 } as const;
export const PATH_TO = { x: 3.1, z: -1.7 } as const;

export type Instance = {
  x: number;
  z: number;
  rot: number;
  scale: number;
  /** Vertical stretch. */
  scaleY: number;
};

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
