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

function parseDiary(event: NostrEvent, authorPubkey: string): Diary | null {
  const dTag = tagValue(event, "d") ?? "";
  if (!isDiaryEvent(event, dTag)) return null;
  const id = (dTag.toLowerCase().startsWith("diary-") ? dTag.replace(/^diary-/i, "") : dTag).trim();
  if (!id) return null;

  let parsed: Partial<Diary> & { items?: DiaryItemRef[] } = {};
  try {
    parsed = JSON.parse(event.content || "{}") as Partial<Diary>;
  } catch {
    parsed = {};
  }

  const plantSlug = tagValue(event, "plant") ?? parsed.plantSlug;
  const custom = plantSlug ? decodeCustomPlantSlug(plantSlug) : null;
  const catalogLatin = plantSlug ? getPlantBySlug(plantSlug)?.latin : undefined;

  const items = new Map<string, DiaryItemRef>();
  for (const item of Array.isArray(parsed.items) ? parsed.items : []) {
    if (!item || typeof item.eventId !== "string" || !item.eventId.trim()) continue;
    items.set(item.eventId, {
      eventId: item.eventId,
      authorPubkey: item.authorPubkey || authorPubkey,
      createdAt: typeof item.createdAt === "number" ? item.createdAt : event.created_at,
      addedAt: typeof item.addedAt === "number" ? item.addedAt : event.created_at,
      contentPreview: typeof item.contentPreview === "string" ? item.contentPreview : "",
      image: typeof item.image === "string" ? item.image : undefined,
      mediaUrls: Array.isArray(item.mediaUrls) ? item.mediaUrls.filter((u) => typeof u === "string") : undefined,
      phaseLabel: typeof item.phaseLabel === "string" ? item.phaseLabel : undefined,
    });
  }
  for (const tag of event.tags) {
    if (tag[0] !== "e" || typeof tag[1] !== "string" || items.has(tag[1])) continue;
    items.set(tag[1], {
      eventId: tag[1],
      authorPubkey,
      createdAt: event.created_at,
      addedAt: event.created_at,
      contentPreview: "",
    });
  }

  return {
    id,
    authorPubkey,
    title: parsed.title?.trim() || tagValue(event, "title") || id,
    plant: parsed.plant?.trim() || custom || catalogLatin,
    plantSlug,
    species: tagValue(event, "species") ?? parsed.species,
    cultivar: tagValue(event, "cultivar") ?? parsed.cultivar,
    breeder: tagValue(event, "breeder") ?? parsed.breeder,
    phase: parsed.phase,
    coverImage: parsed.coverImage,
    createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : event.created_at,
    updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : event.created_at,
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
      if (!note) continue;
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

  const latest = new Map<string, NostrEvent>();
  for (const event of events) {
    const dTag = tagValue(event, "d") ?? "";
    if (!isDiaryEvent(event, dTag)) continue;
    const current = latest.get(dTag);
    if (!current || current.created_at < event.created_at) latest.set(dTag, event);
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
