import type { NostrEvent } from "../types";
import { SIGNAL_LABELS, type LensConfig, type LensSignalId } from "./config";

/**
 * Pure scoring signals. No network, no UI, no state — every signal returns the
 * points it contributed and a human sentence explaining why, so the feed can
 * show the user exactly how a note was ranked.
 */

export type LensSignal = {
  id: LensSignalId;
  label: string;
  points: number;
  detail: string;
};

export type LensContext = {
  config: LensConfig;
  /** Milliseconds; injected so tests are deterministic. */
  now: number;
  /** Pubkeys from the viewer's contact list. */
  follows: Set<string>;
  /** Pubkeys known to publish grow diaries. */
  growers: Set<string>;
};

const GROW_WORDS =
  /\b(grow|grown|growing|garden|gardening|plant|plants|seed|seedling|soil|compost|harvest|flower|flowering|veg|leaf|leaves|root|roots|watering|nutrient|nutrients|repot|sprout|bloom|cultivar|strain|trichome|canopy|tent|photoperiod|autoflower|terp|cure|trim)\b/gi;

const URL_RE = /https?:\/\/\S+/gi;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;
const IMAGE_RE = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?\S*)?/i;

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export function noteBody(content: string): string {
  return content.replace(URL_RE, " ").replace(HASHTAG_RE, " ").replace(/\s+/g, " ").trim();
}

/** Notes that carry no readable text at all never enter the ranking. */
export function isEmptyNote(event: NostrEvent): boolean {
  return !(event.content ?? "").trim();
}

export function scoreNote(event: NostrEvent, ctx: LensContext): {
  score: number;
  signals: LensSignal[];
} {
  const { config, now } = ctx;
  const content = (event.content ?? "").trim();
  const body = noteBody(content);
  const signals: LensSignal[] = [];
  const add = (id: LensSignalId, points: number, detail: string) => {
    if (points === 0) return;
    signals.push({ id, label: SIGNAL_LABELS[id], points: round(points), detail });
  };

  // 1. Grow vocabulary in the text itself — catches untagged grow posts.
  const extra = config.keywords.filter((word) => word && body.toLowerCase().includes(word));
  const matches = [...new Set((body.match(GROW_WORDS) ?? []).map((w) => w.toLowerCase()))];
  const hits = matches.length + extra.length;
  if (hits > 0) {
    const share = Math.min(1, hits / 3);
    add(
      "vocabulary",
      config.weights.vocabulary * share,
      `${hits} grow ${hits === 1 ? "word" : "words"}: ${[...matches, ...extra].slice(0, 4).join(", ")}`,
    );
  }

  // 2. Hashtags from the user's own list.
  const tags = event.tags.filter((t) => t[0] === "t").map((t) => (t[1] ?? "").toLowerCase());
  const wanted = new Set(config.hashtags);
  const matchedTags = tags.filter((t) => wanted.has(t));
  if (matchedTags.length > 0) {
    const share = Math.min(1, matchedTags.length / 2);
    add("hashtags", config.weights.hashtags * share, `#${matchedTags.slice(0, 3).join(", #")}`);
  }

  // 3. Freshness: full points today, gone after two weeks.
  const ageDays = Math.max(0, (now - event.created_at * 1000) / 86_400_000);
  const fresh = Math.max(0, 1 - ageDays / 14);
  if (fresh > 0) {
    add(
      "freshness",
      config.weights.freshness * fresh,
      ageDays < 1 ? "posted today" : `posted ${Math.round(ageDays)} days ago`,
    );
  }

  // 4. Photos.
  if (IMAGE_RE.test(content)) add("media", config.weights.media, "the note links a photo");

  // 5. People you follow.
  if (ctx.follows.has(event.pubkey)) add("follows", config.weights.follows, "in your contact list");

  // 6. Authors who keep a grow diary on Nostr.
  if (ctx.growers.has(event.pubkey)) add("grower", config.weights.grower, "publishes grow diaries");

  // 7. Spam penalties — the old hard filter, now as negative points.
  const urls = content.match(URL_RE) ?? [];
  const hashtags = content.match(HASHTAG_RE) ?? [];
  const letters = body.replace(/[^\p{L}]/gu, "");
  const caps = body.replace(/[^\p{Lu}]/gu, "").length;
  const reasons: string[] = [];
  let penalty = 0;
  if (urls.length > 3) {
    penalty += 1;
    reasons.push(`${urls.length} links`);
  }
  if (tags.length > 12 || hashtags.length > 8) {
    penalty += 1;
    reasons.push("tag stuffing");
  }
  if (body.length < 12) {
    penalty += 1;
    reasons.push("almost no text");
  }
  if (letters.length >= 24 && caps / letters.length > 0.7) {
    penalty += 1;
    reasons.push("all caps");
  }
  if (penalty > 0) {
    add("spam", -config.weights.spam * Math.min(1, penalty / 2), reasons.join(", "));
  }

  const score = round(signals.reduce((sum, signal) => sum + signal.points, 0));
  return { score, signals };
}
