export const CHAPTERS = [
  { label: "Soil", at: 0, number: "01" },
  { label: "Roots", at: 0.29, number: "02" },
  { label: "Leaf", at: 0.64, number: "03" },
  { label: "Flower", at: 1, number: "04" },
] as const;

export const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
export function chapterAt(p: number) {
  return p < 0.15 ? 0 : p < 0.46 ? 1 : p < 0.82 ? 2 : 3;
}
export function smoothstep(a: number, b: number, value: number) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function interpolate(p: number, points: readonly (readonly [number, number])[]): number {
  for (let i = 1; i < points.length; i++) {
    const [end, b] = points[i]!,
      [start, a] = points[i - 1]!;
    if (p <= end) return a + (b - a) * smoothstep(start, end, p);
  }
  return points[points.length - 1]![1];
}

/** Pixel count, rather than device DPR alone, bounds GPU work on large screens. */
export function pixelRatio(width: number, height: number, deviceRatio: number) {
  const mobile = width < 700;
  return Math.min(
    deviceRatio,
    mobile ? 1.25 : 1.5,
    Math.sqrt((mobile ? 600_000 : 1_250_000) / Math.max(1, width * height)),
  );
}

export function cameraPose(progress: number, mobile: boolean) {
  const p = clamp(progress);
  return {
    focusY:
      interpolate(p, [
        [0, -1.25],
        [0.29, 0.5],
        [0.64, 3.05],
        [1, 5.35],
      ]) + (mobile ? 1.75 : 0),
    distance:
      interpolate(p, [
        [0, 7.5],
        [0.29, 9],
        [0.64, 8.1],
        [1, 7.1],
      ]) * (mobile ? 1.45 : 1),
    yaw: interpolate(p, [
      [0, -0.19],
      [0.29, 0.13],
      [0.64, -0.15],
      [1, 0.16],
    ]),
  };
}
