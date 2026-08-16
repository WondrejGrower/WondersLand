import type { GrowthStage, PlantCategory } from "./categories";

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
  // A generic "fruit" stand-in is a tree today; growth form is not yet modelled,
  // so strawberries and grapes also get it until a GrowthForm trait exists.
  fruit: "fruit-tree",
  indoor: "houseplant",
  other: "herb",
};

export function resolveModel(
  category: PlantCategory,
  plantSlug?: string,
  stage: GrowthStage = "unknown",
): ModelChoice {
  // Stage wins visually while the plant is tiny, whatever it will become.
  if (stage === "germination" || stage === "seedling") {
    return { key: "seedling", dedicated: false };
  }
  const dedicated = plantSlug ? DEDICATED[plantSlug] : undefined;
  if (dedicated) return { key: dedicated, dedicated: true };
  if (category === "cannabis") return { key: "cannabis", dedicated: true };
  return { key: GENERIC[category], dedicated: false };
}
