import { KIND_NOTE, KIND_PROFILE } from "./kinds";
import { extractImageUrls, preview } from "./media";
import { query, queryPerRelay } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { NostrEvent, Profile } from "./types";

/**
 * Read-only feeds: kind-1 notes from the enabled relays. Protocol code stays
 * here; UI never touches relays directly and the 3D frame loop never calls
 * into this module.
 */

export type FeedMode = "grow" | "nostr";

export type FeedPost = {
  id: string;
  pubkey: string;
  createdAt: number;
  text: string;
  images: string[];
  /** Relay URLs that served this note. Display only. */
  relays: string[];
  author?: Profile | undefined;
};

export type FeedPage = {
  posts: FeedPost[];
  /** created_at of the oldest event seen, for the next `until` cursor. */
  cursor: number | null;
};

/** Hashtags growers already use; keeps the grow feed on-topic without a backend. */
const FEED_TAGS = [
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

const GROW_TAG_SET = new Set(FEED_TAGS.map((t) => t.toLowerCase()));

const GROW_WORDS =
  /\b(grow|grown|growing|garden|gardening|plant|plants|seed|seedling|soil|compost|harvest|flower|flowering|veg|leaf|leaves|root|roots|water|watering|nutrient|nutrients|pot|repot|sprout|bloom|cultivar|strain|trichome|canopy|tent|light cycle|photoperiod|autoflower|terp|cure|trim)\b/i;

const URL_RE = /https?:\/\/\S+/gi;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;

/** Local relevance/spam gate: relay `#t` filtering alone lets tag spam through. */
export function isRelevantGrowNote(event: NostrEvent): boolean {
  const content = (event.content ?? "").trim();
  if (!content) return false;

  const tags = event.tags.filter((t) => t[0] === "t").map((t) => (t[1] ?? "").toLowerCase());
  // The relay claimed a match; make sure the event really carries a grow tag.
  if (!tags.some((t) => GROW_TAG_SET.has(t))) return false;

  // Tag stuffing: a handful of topics is normal, a wall of them is spam.
  if (tags.length > 12) return false;

  const urls = content.match(URL_RE) ?? [];
  if (urls.length > 3) return false;

  const hashtags = content.match(HASHTAG_RE) ?? [];
  if (hashtags.length > 8) return false;

  // Text left once links and hashtags are stripped.
  const body = content.replace(URL_RE, " ").replace(HASHTAG_RE, " ").replace(/\s+/g, " ").trim();
  if (body.length < 12) return false;
  if (hashtags.length > 0 && body.length < hashtags.length * 8) return false;

  const letters = body.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 24) {
    const caps = body.replace(/[^\p{Lu}]/gu, "").length;
    if (caps / letters.length > 0.7) return false;
  }

  // Some grow signal must survive: either a topical word or a real sentence.
  if (!GROW_WORDS.test(body) && body.length < 60) return false;

  return true;
}

/** Generic low-effort spam gate for the broad Nostr feed. */
function isReadableNote(event: NostrEvent): boolean {
  const content = (event.content ?? "").trim();
  if (!content) return false;
  const hashtags = content.match(HASHTAG_RE) ?? [];
  if (hashtags.length > 12) return false;
  const body = content.replace(URL_RE, " ").replace(HASHTAG_RE, " ").replace(/\s+/g, " ").trim();
  return body.length >= 4;
}

function toProfile(event: NostrEvent): Profile {
  try {
    const meta = JSON.parse(event.content || "{}") as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return {
      pubkey: event.pubkey,
      name: str(meta["name"]),
      displayName: str(meta["display_name"]) ?? str(meta["displayName"]),
      picture: str(meta["picture"]),
      about: str(meta["about"]),
    };
  } catch {
    return { pubkey: event.pubkey };
  }
}

function toPost(note: NostrEvent, sources?: Map<string, string[]>): FeedPost {
  return {
    relays: sources?.get(note.id) ?? [],
    id: note.id,
    pubkey: note.pubkey,
    createdAt: note.created_at,
    text: preview(note.content ?? "", 420),
    images: extractImageUrls(note.content ?? ""),
  };
}

async function hydrateAuthors(relays: string[], posts: FeedPost[]): Promise<void> {
  const authors = [...new Set(posts.map((p) => p.pubkey))].slice(0, 60);
  if (authors.length === 0) return;
  const metas = await query(relays, { kinds: [KIND_PROFILE], authors, limit: authors.length * 2 }, 5000);
  const newest = new Map<string, NostrEvent>();
  for (const event of metas) {
    const current = newest.get(event.pubkey);
    if (!current || current.created_at < event.created_at) newest.set(event.pubkey, event);
  }
  for (const post of posts) {
    const meta = newest.get(post.pubkey);
    if (meta) post.author = toProfile(meta);
  }
}

/**
 * One page of either feed. `until` continues an existing feed
 * (`oldestCreatedAt - 1`); omit it for the first page.
 */
export async function fetchFeedPage(
  mode: FeedMode,
  limit = 40,
  until?: number,
): Promise<FeedPage> {
  const relays = getEnabledRelayUrls();
  const { events: notes, sources } = await queryWithSources(
    relays,
    {
      kinds: [KIND_NOTE],
      limit,
      ...(mode === "grow" ? { "#t": FEED_TAGS } : {}),
      ...(until ? { until } : {}),
    },
    7000,
  );

  const cursor = notes.length > 0 ? Math.min(...notes.map((n) => n.created_at)) : null;

  const keep = mode === "grow" ? isRelevantGrowNote : isReadableNote;
  const posts = notes.filter(keep).map((note) => toPost(note, sources));

  await hydrateAuthors(relays, posts);

  return { posts: posts.sort((a, b) => b.createdAt - a.createdAt), cursor };
}

export async function fetchFeed(limit = 40): Promise<FeedPost[]> {
  return (await fetchFeedPage("grow", limit)).posts;
}
