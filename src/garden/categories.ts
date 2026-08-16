import { decodeCustomPlantSlug } from "../nostr/plants/catalog";

export type PlantCategory = "cannabis" | "fruit" | "vegetable" | "herb" | "indoor" | "other";

/** Life-cycle phase of a diary. Independent from what the plant *is*. */
export type GrowthStage =
  | "germination"
  | "seedling"
  | "vegetative"
  | "flowering"
  | "harvested"
  | "unknown";

const INDOOR = new Set([
  "anthurium-andraeanum",
  "begonia-rex",
  "calathea-ornata",
  "chlorophytum-comosum",
  "crassula-ovata",
  "dracaena-fragrans",
  "epipremnum-aureum",
  "ficus-elastica",
  "ficus-lyrata",
  "monstera-deliciosa",
  "pelargonium-x-hortorum",
  "phalaenopsis-aphrodite",
  "philodendron-hederaceum",
  "pilea-peperomioides",
  "sansevieria-trifasciata",
  "spathiphyllum-wallisii",
  "tradescantia-zebrina",
  "zamioculcas-zamiifolia",
]);

const FRUIT = new Set([
  "ananas-comosus",
  "camellia-sinensis",
  "carica-papaya",
  "citrullus-lanatus",
  "citrus-limon",
  "citrus-paradisi",
  "citrus-sinensis",
  "coffea-arabica",
  "cucumis-melo",
  "ficus-carica",
  "fragaria-x-ananassa",
  "malus-domestica",
  "mangifera-indica",
  "musa-acuminata",
  "olea-europaea",
  "persea-americana",
  "prunus-armeniaca",
  "prunus-avium",
  "prunus-domestica",
  "prunus-persica",
  "psidium-guajava",
  "punica-granatum",
  "pyrus-communis",
  "rubus-fruticosus",
  "rubus-idaeus",
  "vaccinium-corymbosum",
  "vitis-vinifera",
]);

const HERB = new Set([
  "allium-schoenoprasum",
  "anethum-graveolens",
  "coriandrum-sativum",
  "humulus-lupulus",
  "lavandula-angustifolia",
  "mentha-piperita",
  "mentha-spicata",
  "ocimum-basilicum",
  "origanum-vulgare",
  "petroselinum-crispum",
  "rosmarinus-officinalis",
  "salvia-officinalis",
  "thymus-vulgaris",
]);

const VEGETABLE = new Set([
  "allium-cepa",
  "allium-sativum",
  "beta-vulgaris",
  "brassica-oleracea",
  "capsicum-annuum",
  "cucumis-sativus",
  "cucurbita-pepo",
  "daucus-carota",
  "lactuca-sativa",
  "phaseolus-vulgaris",
  "pisum-sativum",
  "raphanus-sativus",
  "solanum-lycopersicum",
  "solanum-melongena",
  "solanum-tuberosum",
  "spinacia-oleracea",
  "zea-mays",
]);

const KEYWORDS: Array<[PlantCategory, string[]]> = [
  ["cannabis", ["cannabis", "weed", "hemp", "marijuana", "ganja", "sativa", "indica", "ruderalis", "kush", "haze"]],
  ["indoor", ["houseplant", "indoor", "monstera", "pothos", "philodendron", "orchid", "succulent", "cactus", "ficus"]],
  ["fruit", ["fruit", "berry", "apple", "pear", "cherry", "plum", "peach", "grape", "lemon", "orange", "fig", "melon", "strawberry"]],
  ["herb", ["herb", "mint", "basil", "thyme", "sage", "oregano", "rosemary", "lavender", "parsley", "dill", "chive", "hops"]],
  ["vegetable", ["tomato", "pepper", "chili", "lettuce", "carrot", "onion", "garlic", "bean", "pea", "potato", "cucumber", "squash", "corn", "cabbage", "kale", "spinach"]],
];

function fromText(text: string): PlantCategory | null {
  const lower = text.toLowerCase();
  for (const [category, words] of KEYWORDS) {
    if (words.some((word) => lower.includes(word))) return category;
  }
  return null;
}

/**
 * Decide WHAT the plant is. Catalog slugs win; free-text names fall back to
 * keyword matching; anything unrecognised stays `other` rather than being
 * silently filed as a vegetable.
 *
 * Category is deliberately independent from growth stage and from physical
 * growth form (tree / vine / shrub / herbaceous), which are separate traits.
 */
export function categorizePlant(input: {
  plantSlug?: string | undefined;
  plant?: string | undefined;
  species?: string | undefined;
  title?: string | undefined;
}): PlantCategory {
  const slug = input.plantSlug;
  if (slug && !slug.startsWith("custom:")) {
    if (slug.startsWith("cannabis-")) return "cannabis";
    if (INDOOR.has(slug)) return "indoor";
    if (FRUIT.has(slug)) return "fruit";
    if (HERB.has(slug)) return "herb";
    if (VEGETABLE.has(slug)) return "vegetable";
  }

  const text = [
    slug ? decodeCustomPlantSlug(slug) : null,
    input.plant,
    input.species,
    input.title,
  ]
    .filter(Boolean)
    .join(" ");
  return fromText(text) ?? "other";
}

const STAGE_KEYWORDS: Array<[GrowthStage, string[]]> = [
  ["harvested", ["harvest", "cure", "curing", "dried", "drying", "done", "finished"]],
  ["flowering", ["flower", "bloom", "bud", "fruiting", "ripening"]],
  ["vegetative", ["veg", "growth", "growing", "mature"]],
  ["seedling", ["seedling", "sprout", "clone", "cutting", "transplant"]],
  ["germination", ["germination", "germinating", "soak", "seed"]],
];

/** Decide WHAT STAGE the plant is currently in. */
export function getGrowthStage(input: { phase?: string | undefined }): GrowthStage {
  const phase = (input.phase ?? "").toLowerCase().trim();
  if (!phase) return "unknown";
  for (const [stage, words] of STAGE_KEYWORDS) {
    if (words.some((word) => phase.includes(word))) return stage;
  }
  return "unknown";
}
