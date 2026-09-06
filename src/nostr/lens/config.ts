import { getJson, setJson } from "../storage";

/**
 * Grow Lens configuration: the whole ranking is described by this object.
 * It lives in the browser, it is shown to the user, and it can be exported as
 * JSON so any other Nostr client could reuse the same lens.
 */

export const LENS_SIGNAL_IDS = [
  "vocabulary",
  "hashtags",
  "freshness",
  "media",
  "follows",
  "grower",
  "spam",
] as const;

export type LensSignalId = (typeof LENS_SIGNAL_IDS)[number];

export type LensConfig = {
  version: 1;
  /** How much each signal can add (or, for `spam`, subtract). */
  weights: Record<LensSignalId, number>;
  /** Where candidate notes come from before ranking. */
  sources: { hashtags: boolean; follows: boolean; diaryAuthors: boolean };
  /** Relay-side `#t` filter and local tag matching. */
  hashtags: string[];
  /** Extra words that count as grow vocabulary, on top of the built-in list. */
  keywords: string[];
  /** Notes below this score never reach the feed. */
  minScore: number;
  /** Diversity: how many notes one author may occupy on a page. */
  maxPerAuthor: number;
};

/** Hashtags growers already use; keeps the grow feed on-topic without a backend. */
export const DEFAULT_HASHTAGS = [
  "weedoshi-diary",
  "weedoshi",
  "growmie",
  "growing",
  "garden",
  "gardening",
  "homegrow",
  "livingsoil",
  "notill",
  "no-till",
  "compost",
  "regenerative",
  "cannabis",
  "microgrowery",
  "autoflower",
];

export const SIGNAL_LABELS: Record<LensSignalId, string> = {
  vocabulary: "Grow words in the text",
  hashtags: "Grow hashtags",
  freshness: "Posted recently",
  media: "Has a photo",
  follows: "Someone you follow",
  grower: "Known grower (keeps a diary)",
  spam: "Spam penalty",
};

export const SIGNAL_HINTS: Record<LensSignalId, string> = {
  vocabulary: "Words like soil, seedling, harvest, trichome in the note itself.",
  hashtags: "Tags from your hashtag list below.",
  freshness: "Full points today, fading to zero over two weeks.",
  media: "Grow posts are visual — photos get a small boost.",
  follows: "Authors from your Nostr contact list.",
  grower: "Authors who publish grow diaries on Nostr.",
  spam: "Link walls, tag stuffing, shouting and empty text lose points.",
};

export const DEFAULT_LENS_CONFIG: LensConfig = {
  version: 1,
  weights: {
    vocabulary: 3,
    hashtags: 3,
    freshness: 2,
    media: 1,
    follows: 3,
    grower: 3,
    spam: 4,
  },
  sources: { hashtags: true, follows: true, diaryAuthors: true },
  hashtags: [...DEFAULT_HASHTAGS],
  keywords: [],
  minScore: 2,
  maxPerAuthor: 2,
};

const KEY = "lens-config";

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function strings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const list = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
  return [...new Set(list)];
}

/** Accepts anything (stored JSON, pasted file) and returns a usable config. */
export function normalizeLensConfig(input: unknown): LensConfig {
  const raw = (input ?? {}) as Partial<LensConfig>;
  const rawWeights = (raw.weights ?? {}) as Partial<Record<LensSignalId, number>>;
  const weights = {} as Record<LensSignalId, number>;
  for (const id of LENS_SIGNAL_IDS) {
    weights[id] = clampNumber(rawWeights[id], DEFAULT_LENS_CONFIG.weights[id], 0, 10);
  }
  const sources = raw.sources ?? DEFAULT_LENS_CONFIG.sources;
  return {
    version: 1,
    weights,
    sources: {
      hashtags: sources.hashtags !== false,
      follows: sources.follows !== false,
      diaryAuthors: sources.diaryAuthors !== false,
    },
    hashtags: strings(raw.hashtags, DEFAULT_LENS_CONFIG.hashtags),
    keywords: strings(raw.keywords, DEFAULT_LENS_CONFIG.keywords),
    minScore: clampNumber(raw.minScore, DEFAULT_LENS_CONFIG.minScore, 0, 12),
    maxPerAuthor: Math.round(clampNumber(raw.maxPerAuthor, DEFAULT_LENS_CONFIG.maxPerAuthor, 1, 10)),
  };
}

export async function loadLensConfig(): Promise<LensConfig> {
  const stored = await getJson<unknown>(KEY);
  return normalizeLensConfig(stored ?? DEFAULT_LENS_CONFIG);
}

export async function saveLensConfig(config: LensConfig): Promise<void> {
  await setJson(KEY, config);
}

export function exportLensConfig(config: LensConfig): string {
  return JSON.stringify(config, null, 2);
}

export function importLensConfig(json: string): LensConfig {
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("Not a Grow Lens config");
  return normalizeLensConfig(parsed);
}
