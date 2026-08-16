import type { Event as NostrEvent } from "nostr-tools";

export type { NostrEvent };

export type AuthMethod = "nip07" | "npub";

export type Profile = {
  pubkey: string;
  name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
};

// Schema ported verbatim from Weedoshi's diaryStore so both apps read the
// same events.
export type DiaryItemRef = {
  eventId: string;
  authorPubkey: string;
  createdAt: number;
  addedAt: number;
  contentPreview?: string;
  image?: string;
  mediaUrls?: string[];
  phaseLabel?: string;
};

export type Diary = {
  id: string;
  authorPubkey: string;
  title: string;
  plant?: string;
  plantSlug?: string;
  species?: string;
  cultivar?: string;
  breeder?: string;
  phase?: string;
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  items: DiaryItemRef[];
};
