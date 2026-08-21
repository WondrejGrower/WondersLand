import { KIND_NOTE, KIND_PROFILE } from "./kinds";
import { extractImageUrls, preview } from "./media";
import { query } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { NostrEvent, Profile } from "./types";

/**
 * Public grow feed: kind-1 notes from the wider growing community, read-only.
 * Protocol code stays here; UI never touches relays directly and the 3D frame
 * loop never calls into this module.
 */

export type FeedPost = {
  id: string;
  pubkey: string;
  createdAt: number;
  text: string;
  images: string[];
  author?: Profile | undefined;
};

/** Hashtags growers already use; keeps the feed on-topic without a backend. */
const FEED_TAGS = [
  "weedoshi-diary",
  "weedoshi",
  "grow",
  "growmie",
  "growing",
  "garden",
  "gardening",
  "plants",
  "homegrow",
];

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

export async function fetchFeed(limit = 40): Promise<FeedPost[]> {
  const relays = getEnabledRelayUrls();
  const notes = await query(relays, { kinds: [KIND_NOTE], "#t": FEED_TAGS, limit }, 7000);

  const posts: FeedPost[] = notes
    .filter((note) => (note.content ?? "").trim().length > 0)
    .slice(0, limit)
    .map((note) => ({
      id: note.id,
      pubkey: note.pubkey,
      createdAt: note.created_at,
      text: preview(note.content ?? "", 420),
      images: extractImageUrls(note.content ?? ""),
    }));

  const authors = [...new Set(posts.map((p) => p.pubkey))].slice(0, 60);
  if (authors.length > 0) {
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

  return posts.sort((a, b) => b.createdAt - a.createdAt);
}
