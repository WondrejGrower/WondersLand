import type { Event as NostrEvent } from "nostr-tools";

export type { NostrEvent };

export type AuthMethod = "nip07" | "npub";

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
  items: DiaryItemRef[];
};
