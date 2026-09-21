/**
 * The garden has a small, fixed set of planting spots. One visible diary fills
 * one spot, in order; anything beyond the last spot is not planted yet.
 * Deliberately dumb data — no zones, no hashing, no reflow logic.
 *
 * Positions are mutable so the hidden layout editor can drag a spot and have
 * the planted diary follow it.
 */
export type PlantSlot = {
  id: number;
  /** World position of the spot. */
  position: [number, number, number];
  /** Fixed facing so identical models still look hand-planted. */
  rotationY: number;
};

export const PLANT_SLOTS: PlantSlot[] = [
  { id: 0, position: [-7.8, 0, -4.55], rotationY: 0.2 },
  { id: 1, position: [-6.2, 0, -4.55], rotationY: -0.35 },
  { id: 2, position: [-4.6, 0, -4.55], rotationY: 0.6 },
  { id: 3, position: [-7.8, 0, -1.85], rotationY: -0.5 },
  { id: 4, position: [-6.2, 0, -1.85], rotationY: 0.4 },
  { id: 5, position: [-4.6, 0, -1.85], rotationY: -0.2 },
];
