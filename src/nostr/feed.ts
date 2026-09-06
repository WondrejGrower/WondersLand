import { clientOf } from "./clientTag";
import { DIARY_TAG, DIARY_TAG_LEGACY, KIND_CONTACTS, KIND_DIARY, KIND_NOTE, KIND_PROFILE } from "./kinds";
import { DEFAULT_HASHTAGS, type LensConfig } from "./lens/config";
import { rankNotes } from "./lens/rank";
import type { LensContext, LensSignal } from "./lens/signals";
import { extractImageUrls, preview } from "./media";
import { query, queryPerRelay, queryWithSources, type EventSources } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { NostrEvent, Profile } from "./types";

/**
 * Read-only feeds: kind-1 notes from the enabled relays. Protocol code stays
 * here; UI never touches relays directly and the 3D frame loop never calls
 * into this module.
 *
 * The grow feed is ranked by the Grow Lens (see ./lens): candidates come from
 * hashtags, your contacts and known grow-diary authors, then every note is
 * scored by transparent signals the user can inspect and re-weight.
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
  /** NIP-89 client attribution from the note's `client` tag. Display only. */
  client?: string | undefined;
  author?: Profile | undefined;
  /** Grow Lens score and its breakdown. Present for the grow feed only. */
  score?: number | undefined;
  signals?: LensSignal[] | undefined;
};

export type FeedPage = {
  posts: FeedPost[];
  /** created_at of the oldest event seen, for the next `until` cursor. */
  cursor: number | null;
};

/** Kept for compatibility: the default hashtag recall list. */
export const FEED_TAGS = DEFAULT_HASHTAGS;

const URL_RE = /https?:\/\/\S+/gi;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;

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

function toPost(note: NostrEvent, sources?: EventSources): FeedPost {
  return {
    relays: sources?.get(note.id) ?? [],
    id: note.id,
    pubkey: note.pubkey,
    createdAt: note.created_at,
    client: clientOf(note.tags),
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

type Candidates = {
  events: NostrEvent[];
  sources: EventSources;
  follows: Set<string>;
  growers: Set<string>;
};

/** Who the viewer follows (NIP-02 kind 3). Empty when signed out. */
async function fetchFollows(relays: string[], viewerPubkey?: string): Promise<Set<string>> {
  if (!viewerPubkey) return new Set();
  const events = await query(relays, { kinds: [KIND_CONTACTS], authors: [viewerPubkey], limit: 3 }, 5000);
  const newest = events.sort((a, b) => b.created_at - a.created_at)[0];
  if (!newest) return new Set();
  return new Set(
    newest.tags
      .filter((tag) => tag[0] === "p" && typeof tag[1] === "string")
      .map((tag) => tag[1] as string)
      .slice(0, 300),
  );
}

/** Pubkeys that publish grow diaries — the strongest "this person grows" signal. */
async function fetchGrowers(relays: string[]): Promise<Set<string>> {
  const events = await query(
    relays,
    { kinds: [KIND_DIARY], "#t": [DIARY_TAG, DIARY_TAG_LEGACY], limit: 120 },
    6000,
  );
  return new Set(events.map((event) => event.pubkey));
}

function mergeSources(into: EventSources, from: EventSources): void {
  for (const [id, urls] of from) {
    const current = into.get(id) ?? [];
    into.set(id, [...new Set([...current, ...urls])]);
  }
}

/** Recall stage: gather candidate notes from every enabled source. */
async function collectGrowCandidates(
  relays: string[],
  config: LensConfig,
  limit: number,
  until: number | undefined,
  viewerPubkey: string | undefined,
): Promise<Candidates> {
  const base = { kinds: [KIND_NOTE], ...(until ? { until } : {}) };
  const perRelayLimit = Math.max(8, Math.ceil(limit / Math.max(1, relays.length)));

  const [follows, growers] = await Promise.all([
    config.sources.follows ? fetchFollows(relays, viewerPubkey) : Promise.resolve(new Set<string>()),
    config.sources.diaryAuthors ? fetchGrowers(relays) : Promise.resolve(new Set<string>()),
  ]);

  const jobs: Promise<{ events: NostrEvent[]; sources: EventSources }>[] = [];

  if (config.sources.hashtags && config.hashtags.length > 0) {
    jobs.push(
      queryPerRelay(relays, { ...base, limit: perRelayLimit, "#t": config.hashtags }, 7000).then(
        ({ perRelay, sources }) => ({ events: [...perRelay.values()].flat(), sources }),
      ),
    );
  }
  if (follows.size > 0) {
    jobs.push(queryWithSources(relays, { ...base, authors: [...follows].slice(0, 200), limit }, 6000));
  }
  if (growers.size > 0) {
    jobs.push(queryWithSources(relays, { ...base, authors: [...growers].slice(0, 200), limit }, 6000));
  }

  const results = await Promise.all(jobs);
  const sources: EventSources = new Map();
  const seen = new Map<string, NostrEvent>();
  for (const result of results) {
    mergeSources(sources, result.sources);
    for (const event of result.events) seen.set(event.id, event);
  }
  return { events: [...seen.values()], sources, follows, growers };
}

async function fetchGrowPage(
  relays: string[],
  config: LensConfig,
  limit: number,
  until: number | undefined,
  viewerPubkey: string | undefined,
): Promise<{ notes: NostrEvent[]; sources: EventSources; ranked: Map<string, { score: number; signals: LensSignal[] }> }> {
  const { events, sources, follows, growers } = await collectGrowCandidates(
    relays,
    config,
    limit,
    until,
    viewerPubkey,
  );
  const ctx: LensContext = { config, now: Date.now(), follows, growers };
  const ranked = rankNotes(events, ctx, limit);
  const byId = new Map(ranked.map((r) => [r.event.id, { score: r.score, signals: r.signals }]));
  return { notes: ranked.map((r) => r.event), sources, ranked: byId };
}

async function fetchNostrPage(
  relays: string[],
  limit: number,
  until: number | undefined,
): Promise<{ notes: NostrEvent[]; sources: EventSources }> {
  const perRelayLimit = Math.max(8, Math.ceil(limit / Math.max(1, relays.length)));
  const { perRelay, sources } = await queryPerRelay(
    relays,
    { kinds: [KIND_NOTE], limit: perRelayLimit, ...(until ? { until } : {}) },
    7000,
  );
  // Round-robin across relays so one fast relay cannot dominate the page.
  const queues = [...perRelay.values()].map((events) => events.filter(isReadableNote));
  const notes: NostrEvent[] = [];
  let progressed = true;
  while (notes.length < limit && progressed) {
    progressed = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        notes.push(next);
        progressed = true;
        if (notes.length >= limit) break;
      }
    }
  }
  return { notes, sources };
}

/**
 * One page of either feed. `until` continues an existing feed
 * (`oldestCreatedAt - 1`); omit it for the first page.
 */
export async function fetchFeedPage(
  mode: FeedMode,
  limit = 40,
  until?: number,
  options?: { config?: LensConfig; viewerPubkey?: string | null },
): Promise<FeedPage> {
  const relays = getEnabledRelayUrls();

  let notes: NostrEvent[];
  let sources: EventSources;
  let ranked: Map<string, { score: number; signals: LensSignal[] }> | null = null;

  if (mode === "grow" && options?.config) {
    const page = await fetchGrowPage(
      relays,
      options.config,
      limit,
      until,
      options.viewerPubkey ?? undefined,
    );
    notes = page.notes;
    sources = page.sources;
    ranked = page.ranked;
  } else {
    const page = await fetchNostrPage(relays, limit, until);
    notes = page.notes;
    sources = page.sources;
  }

  const cursor = notes.length > 0 ? Math.min(...notes.map((n) => n.created_at)) : null;
  const posts = notes.map((note) => {
    const post = toPost(note, sources);
    const rank = ranked?.get(note.id);
    if (rank) {
      post.score = rank.score;
      post.signals = rank.signals;
    }
    return post;
  });

  await hydrateAuthors(relays, posts);

  return { posts: posts.sort((a, b) => b.createdAt - a.createdAt), cursor };
}

export async function fetchFeed(limit = 40): Promise<FeedPost[]> {
  return (await fetchFeedPage("grow", limit)).posts;
}
