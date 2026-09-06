/**
 * Shared deterministic world layout.
 *
 * Rendering (Trees.tsx) and collision (collision.ts) both read these arrays,
 * so a rendered trunk and its collider can never drift apart.
 * Plain data, no Three.js imports.
 */

export const GARDEN_RADIUS = 19;

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
    [-7.5, 6, 0.7],
    [8.5, 5.5, 0.62],
    [10, -8, 0.8],
  ] as [number, number, number][]).forEach(([x, z, s], i) => {
    list.push({ x, z, rot: i * 1.7, scale: s, scaleY: s });
  });

  return list;
})();
