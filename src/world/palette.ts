// The single source of 3D color. Keeps the world visually consistent with the
// 2D tokens in src/styles.css. Plain hex — Three.js does not read CSS.
export const palette = {
  skyTop: "#8fb7d9",
  skyBottom: "#f2e3c6",
  fog: "#dfe6dd",
  ground: "#9bab6f",
  groundDark: "#7d8f58",
  soil: "#6b5540",
  hedge: "#5c7a4a",
  rock: "#a89f92",
  grass: "#89a35c",
  stem: "#5f7a3c",
  leaf: "#4e7a35",
  leafLight: "#6d9c46",
  bud: "#7f9b52",
  sun: "#fff3d6",
} as const;
