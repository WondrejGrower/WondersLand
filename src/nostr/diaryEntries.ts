// Read-only helper for the diary reader. Entries stay kind:1 notes referenced by
// the kind:30078 diary event — this only resolves those references to full text
// and media for display. Nothing here writes or changes the persisted schema.
import { KIND_NOTE } from "./kinds";
import { extractImageUrls } from "./media";
import { query } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { Diary, DiaryItemRef } from "./types";

export type DiaryEntry = {
  eventId: string;
  authorPubkey: string;
  createdAt: number;
  /** Full note text with image URLs stripped out. */
  text: string;
  images: string[];
  phaseLabel?: string | undefined;
  /** True when the referenced note could not be read from the relays. */
  missing: boolean;
};

function stripImages(content: string): string {
  return content
    .replace(/(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|avif))(?:\?[^\s"'<>]*)?/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function fromRef(ref: DiaryItemRef): DiaryEntry {
  return {
    eventId: ref.eventId,
    authorPubkey: ref.authorPubkey,
    createdAt: ref.createdAt,
    text: ref.contentPreview ?? "",
    images: ref.mediaUrls ?? (ref.image ? [ref.image] : []),
    phaseLabel: ref.phaseLabel,
    missing: true,
  };
}

/**
 * Resolve a diary's item refs into full entries. Falls back to the cached
 * preview text stored on the ref when a note cannot be fetched.
 */
export async function fetchDiaryEntries(diary: Diary): Promise<DiaryEntry[]> {
  const refs = [...diary.items].sort((a, b) => a.createdAt - b.createdAt);
  if (refs.length === 0) return [];

  const ids = refs.map((ref) => ref.eventId).slice(0, 300);
  let byId = new Map<string, { content: string; created_at: number }>();
  try {
    const notes = await query(getEnabledRelayUrls(), { kinds: [KIND_NOTE], ids }, 7000);
    byId = new Map(notes.map((note) => [note.id, note]));
  } catch {
    byId = new Map();
  }

  return refs.map((ref) => {
    const note = byId.get(ref.eventId);
    if (!note) return fromRef(ref);
    const images = extractImageUrls(note.content || "");
    return {
      eventId: ref.eventId,
      authorPubkey: ref.authorPubkey,
      createdAt: note.created_at || ref.createdAt,
      text: stripImages(note.content || ""),
      images: images.length > 0 ? images : (ref.mediaUrls ?? (ref.image ? [ref.image] : [])),
      phaseLabel: ref.phaseLabel,
      missing: false,
    };
  });
}
