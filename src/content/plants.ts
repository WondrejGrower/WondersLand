export type Plant = {
  id: string;
  name: string;
  species: string;
  description: string;
  notes: string[];
  position: [number, number, number];
};

export const CANNABIS: Plant = {
  id: "cannabis",
  name: "Cannabis",
  species: "Cannabis sativa L.",
  description:
    "A fast-growing annual herb with palmate leaves of five to nine serrated leaflets. It has travelled with people for thousands of years, grown for fibre, seed and resin.",
  notes: [
    "Leaves grow in opposite pairs low on the stem and alternate near the top.",
    "The plant is dioecious: most individuals are either male or female.",
    "Flowering is triggered by longer nights, not by age.",
    "Hemp varieties are cultivated mainly for stem fibre and seed oil.",
  ],
  position: [6, 0, -4],
};

export const INTERACT_RADIUS = 3.2;
