/**
 * The garden has a small, fixed set of planting spots. One visible diary fills
 * one spot, in order; anything beyond the last spot is not planted yet.
 * Deliberately dumb data — no zones, no hashing, no reflow logic.
 */
import { GROW_BEDS_CENTER } from "../world/interactables";

export type PlantSlot = {
  id: number;
  /** World position of the spot. */
  position: [number, number, number];
  /** Fixed facing so identical models still look hand-planted. */
  rotationY: number;
};

const [CX, CZ] = GROW_BEDS_CENTER;

const OFFSETS: Array<[number, number, number]> = [
  [-1.6, -1.35, 0.2],
  [0, -1.35, -0.35],
  [1.6, -1.35, 0.6],
  [-1.6, 1.35, -0.5],
  [0, 1.35, 0.4],
  [1.6, 1.35, -0.2],
];

export const PLANT_SLOTS: readonly PlantSlot[] = OFFSETS.map(([dx, dz, rot], i) => ({
  id: i,
  position: [CX + dx, 0, CZ + dz] as [number, number, number],
  rotationY: rot,
}));
