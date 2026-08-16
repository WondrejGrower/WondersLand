import type { PlantCategory } from "./categories";

export type ModelKey = "cannabis" | "vegetable" | "herb" | "fruit-tree" | "houseplant" | "seedling";

export type ModelChoice = {
  key: ModelKey;
  /** true when the model actually depicts this species, false for a stand-in. */
  dedicated: boolean;
};

// Species that have a purpose-built model in the world. Everything else falls
// back to a generic representative for its category.
const DEDICATED: Record<string, ModelKey> = {
  "cannabis-sativa": "cannabis",
  "cannabis-indica": "cannabis",
  "cannabis-ruderalis": "cannabis",
};

const GENERIC: Record<PlantCategory, ModelKey> = {
  cannabis: "cannabis",
  vegetable: "vegetable",
  herb: "herb",
  fruit: "fruit-tree",
  indoor: "houseplant",
  seedling: "seedling",
};

export function resolveModel(category: PlantCategory, plantSlug?: string): ModelChoice {
  const dedicated = plantSlug ? DEDICATED[plantSlug] : undefined;
  if (dedicated) return { key: dedicated, dedicated: true };
  if (category === "cannabis") return { key: "cannabis", dedicated: true };
  return { key: GENERIC[category], dedicated: false };
}
