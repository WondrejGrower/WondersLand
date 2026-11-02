import { DIARY_TAG, DIARY_TAG_LEGACY, KIND_DIARY, KIND_NOTE } from "./kinds";
import { extractImageUrls, firstImage, preview } from "./media";
import { decodeCustomPlantSlug, getPlantBySlug } from "./plants/catalog";
import { query, queryWithSources } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import { getJson, setJson } from "./storage";
import type { Diary, DiaryItemRef, NostrEvent } from "./types";

function tagValue(event: NostrEvent, key: string): string | undefined {
  const tag = event.tags.find((entry) => entry[0] === key && typeof entry[1] === "string");
  const value = tag?.[1]?.trim();
  return value ? value : undefined;
}

function isDiaryEvent(event: NostrEvent, dTag: string): boolean {
  const hasTag = event.tags.some(
    (tag) =>
      tag[0] === "t" &&
      typeof tag[1] === "string" &&
      (tag[1].toLowerCase() === DIARY_TAG || tag[1].toLowerCase() === DIARY_TAG_LEGACY),
  );
  return hasTag || dTag.toLowerCase().startsWith("diary-");
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function timestamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

function optionalTimestamp(value: unknown): number | undefined {
  const result = timestamp(value, NaN);
  return Number.isFinite(result) ? result : undefined;
}

function imageUrl(value: unknown): string | undefined {
  const url = text(value);
  if (!url) return undefined;
  try {
    return ["https:", "http:"].includes(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

function parseDiary(event: NostrEvent, authorPubkey: string, publicOnly = false): Diary | null {
  if (event.kind !== KIND_DIARY) return null;
  const dTag = tagValue(event, "d") ?? "";
  if (!isDiaryEvent(event, dTag) || dTag.toLowerCase().startsWith("wondersland:")) return null;
  const id = (dTag.toLowerCase().startsWith("diary-") ? dTag.replace(/^diary-/i, "") : dTag).trim();
  if (!id) return null;

  let content: unknown;
  try {
    content = JSON.parse(event.content || "{}");
  } catch {
    return null;
  }
  if (!content || typeof content !== "object" || Array.isArray(content)) return null;
  const parsed = content as Record<string, unknown>;
  // A public relay is not a privacy boundary, but Explore must still respect
  // visibility flags instead of promoting explicitly private/unlisted data.
  if (publicOnly && (
    (parsed["isPublic"] !== undefined && parsed["isPublic"] !== true) ||
    (parsed["public"] !== undefined && parsed["public"] !== true) ||
    (parsed["private"] !== undefined && parsed["private"] !== false) ||
    (parsed["visibility"] !== undefined && text(parsed["visibility"])?.toLowerCase() !== "public")
  )) return null;

  const plantSlug = tagValue(event, "plant") ?? text(parsed["plantSlug"]);
  const custom = plantSlug ? decodeCustomPlantSlug(plantSlug) : null;
  const catalogLatin = plantSlug ? getPlantBySlug(plantSlug)?.latin : undefined;

  const items = new Map<string, DiaryItemRef>();
  for (const raw of Array.isArray(parsed["items"]) ? parsed["items"] : []) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const eventId = text(item["eventId"]);
    if (!eventId || !/^[0-9a-f]{64}$/i.test(eventId)) continue;
    const author = text(item["authorPubkey"]);
    items.set(eventId, {
      eventId,
      authorPubkey: author && /^[0-9a-f]{64}$/i.test(author) ? author : authorPubkey,
      createdAt: timestamp(item["createdAt"], event.created_at),
      addedAt: timestamp(item["addedAt"], event.created_at),
      contentPreview: text(item["contentPreview"]) ?? "",
      image: imageUrl(item["image"]),
      mediaUrls: Array.isArray(item["mediaUrls"])
        ? item["mediaUrls"].map(imageUrl).filter((u): u is string => Boolean(u))
        : undefined,
      phaseLabel: text(item["phaseLabel"]),
    });
  }
  for (const tag of event.tags) {
    const eventId = tag[1];
    if (tag[0] !== "e" || !eventId || !/^[0-9a-f]{64}$/i.test(eventId) || items.has(eventId)) continue;
    items.set(eventId, {
      eventId,
      authorPubkey,
      createdAt: event.created_at,
      addedAt: event.created_at,
      contentPreview: "",
    });
  }

  return {
    id,
    authorPubkey,
    title: text(parsed["title"]) ?? tagValue(event, "title") ?? id,
    plant: text(parsed["plant"]) ?? custom ?? catalogLatin,
    plantSlug,
    species: tagValue(event, "species") ?? text(parsed["species"]),
    cultivar: tagValue(event, "cultivar") ?? text(parsed["cultivar"]),
    breeder: tagValue(event, "breeder") ?? text(parsed["breeder"]),
    phase: text(parsed["phase"]),
    coverImage: imageUrl(parsed["coverImage"]),
    createdAt: timestamp(parsed["createdAt"], event.created_at),
    updatedAt: timestamp(parsed["updatedAt"], event.created_at),
    startedAt: optionalTimestamp(parsed["startedAt"]),
    endedAt: optionalTimestamp(parsed["endedAt"]),
    sourceDTag: dTag,
    items: [...items.values()].sort((a, b) => a.createdAt - b.createdAt),
  };
}

/** Fill in preview text and images for diary entries that only carry an event id. */
async function hydrateItems(diaries: Diary[]): Promise<void> {
  const missing = new Set<string>();
  for (const diary of diaries) {
    for (const item of diary.items) {
      if (!firstImage(item) || !item.contentPreview) missing.add(item.eventId);
    }
  }
  if (missing.size === 0) return;

  const notes = await query(getEnabledRelayUrls(), { kinds: [KIND_NOTE], ids: [...missing].slice(0, 200) }, 6000);
  const byId = new Map(notes.map((note) => [note.id, note]));
  for (const diary of diaries) {
    for (const item of diary.items) {
      const note = byId.get(item.eventId);
      if (!note || note.pubkey !== item.authorPubkey) continue;
      const images = extractImageUrls(note.content || "");
      if (!item.contentPreview) item.contentPreview = preview(note.content || "");
      if (!firstImage(item) && images.length > 0) {
        item.image = images[0];
        item.mediaUrls = images;
      }
      item.createdAt = note.created_at;
    }
    diary.items.sort((a, b) => a.createdAt - b.createdAt);
    if (!diary.coverImage) diary.coverImage = diary.items.map(firstImage).find(Boolean);
  }
}

export async function fetchDiaries(pubkey: string): Promise<Diary[]> {
  const cacheKey = `diaries:${pubkey}`;
  const { events, sources } = await queryWithSources(
    getEnabledRelayUrls(),
    { kinds: [KIND_DIARY], authors: [pubkey], limit: 120 },
    7000,
  );

  // Group by the NORMALISED diary id, not by the raw `d` tag: older Weedoshi
  // copies may spell the identifier differently and would otherwise show up as
  // a second, stale diary next to the freshly edited one.
  const latest = new Map<string, NostrEvent>();
  for (const event of events) {
    const dTag = tagValue(event, "d") ?? "";
    if (!isDiaryEvent(event, dTag)) continue;
    const key = dTag.replace(/^diary-/i, "").trim().toLowerCase();
    if (!key) continue;
    const current = latest.get(key);
    if (!current) {
      latest.set(key, event);
      continue;
    }
    if (event.created_at > current.created_at) {
      latest.set(key, event);
    } else if (event.created_at === current.created_at) {
      // Same second: the copy carrying more entries is the more complete one,
      // and on a tie the later-arriving copy wins.
      const count = (e: NostrEvent) => e.tags.filter((t) => t[0] === "e").length;
      if (count(event) >= count(current)) latest.set(key, event);
    }
  }

  const diaries: Diary[] = [];
  for (const event of latest.values()) {
    const diary = parseDiary(event, pubkey);
    if (diary) diaries.push({ ...diary, seenOn: sources.get(event.id) ?? [] });
  }
  diaries.sort((a, b) => b.updatedAt - a.updatedAt);

  if (diaries.length === 0) {
    const cached = await getJson<Diary[]>(cacheKey);
    if (cached && cached.length > 0) return cached;
    return diaries;
  }

  await hydrateItems(diaries);
  await setJson(cacheKey, diaries);
  return diaries;
}

export async function getCachedDiaries(pubkey: string): Promise<Diary[]> {
  return (await getJson<Diary[]>(`diaries:${pubkey}`)) ?? [];
}

/**
 * Public community diaries for Explore. Same parser and namespace rules as a
 * grower's own diaries: only kind 30078 events tagged as Weedoshi diaries are
 * considered, the content must be a plain JSON object (encrypted/unrelated app
 * data such as private Garden Board snapshots is skipped), and only the latest
 * revision per author + diary id survives. Read-only.
 */
export async function fetchCommunityDiaries(limit = 80): Promise<Diary[]> {
  const { events, sources } = await queryWithSources(
    getEnabledRelayUrls(),
    { kinds: [KIND_DIARY], "#t": [DIARY_TAG, DIARY_TAG_LEGACY], limit },
    7000,
  );
  const latest = new Map<string, NostrEvent>();
  for (const event of events) {
    const dTag = tagValue(event, "d") ?? "";
    if (event.kind !== KIND_DIARY || !dTag || dTag.toLowerCase().startsWith("wondersland:")) continue;
    if (!isDiaryEvent(event, dTag)) continue;
    // NIP-01 address identity is author + exact d value. Select a revision
    // before checking its content/visibility so an older public copy cannot
    // reappear when the newest returned revision is private or malformed.
    const key = `${event.pubkey}:${dTag}`;
    const current = latest.get(key);
    if (!current || event.created_at > current.created_at ||
      (event.created_at === current.created_at && event.id < current.id)) latest.set(key, event);
  }
  const diaries: Diary[] = [];
  for (const event of latest.values()) {
    const diary = parseDiary(event, event.pubkey, true);
    if (diary) diaries.push({ ...diary, seenOn: sources.get(event.id) ?? [] });
  }
  diaries.sort((a, b) => b.updatedAt - a.updatedAt);
  await hydrateItems(diaries);
  return diaries;
}
