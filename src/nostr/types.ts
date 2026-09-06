import type { Event as NostrEvent } from "nostr-tools";

export type { NostrEvent };

export type AuthMethod = "nip07" | "npub" | "nsec";

export type Profile = {
  pubkey: string;
  name?: string | undefined;
  displayName?: string | undefined;
  picture?: string | undefined;
  about?: string | undefined;
};

// Schema ported verbatim from Weedoshi's diaryStore so both apps read the
// same events.
export type DiaryItemRef = {
  eventId: string;
  authorPubkey: string;
  createdAt: number;
  addedAt: number;
  contentPreview?: string | undefined;
  image?: string | undefined;
  mediaUrls?: string[] | undefined;
  phaseLabel?: string | undefined;
};

export type Diary = {
  id: string;
  authorPubkey: string;
  title: string;
  plant?: string | undefined;
  plantSlug?: string | undefined;
  species?: string | undefined;
  cultivar?: string | undefined;
  breeder?: string | undefined;
  phase?: string | undefined;
  coverImage?: string | undefined;
  createdAt: number;
  updatedAt: number;
  /** Grower-set start of the grow clock (unix seconds). Falls back to createdAt. */
  startedAt?: number | undefined;
  /** Grower-set end of the grow clock (unix seconds). Stops the timer. */
  endedAt?: number | undefined;
  /** Relay URLs that served this diary event on the last successful fetch. Display only. */
  seenOn?: string[] | undefined;
  items: DiaryItemRef[];
};
