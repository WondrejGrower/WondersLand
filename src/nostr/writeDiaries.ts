// Weedoshi-compatible diary WRITE path.
//
// Non-negotiable: WondersLand never invents a format. Everything written here
// must parse back through `parseDiary` in ./diaries.ts and stay readable by
// Weedoshi. Diary = addressable kind 30078 with `d: diary-<id>` and
// `t: weedoshi-diary`; an entry is a kind 1 note published first, then
// referenced from the diary event (`items[]` + an `e` tag). Entry text never
// moves inside the diary event.
import { uploadBlob } from "./blossom";
import { withClientTag } from "./clientTag";
import { DIARY_TAG, KIND_DELETE, KIND_DIARY, KIND_NOTE } from "./kinds";
import { extractImageUrls, preview } from "./media";
import { getPlantBySlug } from "./plants/catalog";
import { publish, type PublishResult } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { EventTemplate, Signer } from "./signers";
import type { Diary, DiaryItemRef, NostrEvent } from "./types";

export type DiaryInput = {
  title: string;
  plant?: string | undefined;
  cultivar?: string | undefined;
  breeder?: string | undefined;
  phase?: string | undefined;
  /** `undefined` keeps the current cover, `""` clears it, a URL replaces it. */
  coverImage?: string | undefined;
};


export type WriteResult = { diary: Diary; results: PublishResult[] };

const now = () => Math.floor(Date.now() / 1000);

/** Stable slug for a free-typed plant name, matching Weedoshi's encoding. */
export function plantSlugFor(plant: string | undefined): string | undefined {
  const name = plant?.trim();
  if (!name) return undefined;
  const direct = getPlantBySlug(name);
  if (direct) return direct.id;
  return `custom:${encodeURIComponent(name)}`;
}

function newDiaryId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function defined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key as keyof T] === undefined) delete value[key as keyof T];
  }
  return value;
}

/**
 * Serialize a diary exactly the way `parseDiary` expects to read it. Every tag
 * Weedoshi may look at is written even when WondersLand ignores it.
 */
export function diaryEventTemplate(diary: Diary): EventTemplate {
  const tags: string[][] = [
    ["d", `diary-${diary.id}`],
    ["t", DIARY_TAG],
    ["title", diary.title],
  ];
  if (diary.plantSlug) tags.push(["plant", diary.plantSlug]);
  if (diary.species) tags.push(["species", diary.species]);
  if (diary.cultivar) tags.push(["cultivar", diary.cultivar]);
  if (diary.breeder) tags.push(["breeder", diary.breeder]);
  for (const item of diary.items) tags.push(["e", item.eventId]);

  const content = defined({
    title: diary.title,
    plant: diary.plant,
    plantSlug: diary.plantSlug,
    species: diary.species,
    cultivar: diary.cultivar,
    breeder: diary.breeder,
    phase: diary.phase,
    coverImage: diary.coverImage,
    createdAt: diary.createdAt,
    updatedAt: diary.updatedAt,
    items: diary.items.map((item) => defined({ ...item })),
  });

  return {
    kind: KIND_DIARY,
    created_at: Math.max(diary.updatedAt, now()),
    tags,
    content: JSON.stringify(content),
  };
}

async function publishSigned(signer: Signer, template: EventTemplate): Promise<{
  event: NostrEvent;
  results: PublishResult[];
}> {
  const event = await signer.signEvent(withClientTag(template));
  const results = await publish(getEnabledRelayUrls(), event);
  if (results.length > 0 && !results.some((r) => r.ok)) {
    throw new Error("No relay accepted the event — your draft is kept locally");
  }
  return { event, results };
}

function applyInput(diary: Diary, input: DiaryInput): Diary {
  const plant = input.plant?.trim() || undefined;
  return {
    ...diary,
    title: input.title.trim() || diary.title,
    plant,
    plantSlug: plantSlugFor(plant) ?? diary.plantSlug,
    cultivar: input.cultivar?.trim() || undefined,
    breeder: input.breeder?.trim() || undefined,
    phase: input.phase?.trim() || undefined,
    coverImage: input.coverImage?.trim() || diary.coverImage,
    updatedAt: now(),
  };
}

export async function createDiary(signer: Signer, input: DiaryInput): Promise<WriteResult> {
  const pubkey = await signer.getPublicKey();
  const stamp = now();
  const base: Diary = {
    id: newDiaryId(),
    authorPubkey: pubkey,
    title: input.title.trim() || "Untitled diary",
    createdAt: stamp,
    updatedAt: stamp,
    items: [],
  };
  const diary = applyInput(base, input);
  const { results } = await publishSigned(signer, diaryEventTemplate(diary));
  return { diary, results };
}

/** Read-modify-write on the diary we already hold (newest wins on the relays). */
export async function updateDiary(
  signer: Signer,
  current: Diary,
  input: DiaryInput,
): Promise<WriteResult> {
  const diary = applyInput(current, input);
  const { results } = await publishSigned(signer, diaryEventTemplate(diary));
  return { diary, results };
}

export type EntryInput = { text: string; phaseLabel?: string | undefined };

/**
 * One entry = one kind 1 note + one diary update. Never more signer prompts
 * than that.
 */
export async function addEntry(
  signer: Signer,
  current: Diary,
  input: EntryInput,
): Promise<WriteResult> {
  const pubkey = await signer.getPublicKey();
  const text = input.text.trim();
  if (!text) throw new Error("Write something first");

  const note = await publishSigned(signer, {
    kind: KIND_NOTE,
    created_at: now(),
    tags: [
      ["t", DIARY_TAG],
      ["a", `${KIND_DIARY}:${pubkey}:diary-${current.id}`],
    ],
    content: text,
  });

  const images = extractImageUrls(text);
  const item: DiaryItemRef = defined({
    eventId: note.event.id,
    authorPubkey: pubkey,
    createdAt: note.event.created_at,
    addedAt: note.event.created_at,
    contentPreview: preview(text),
    image: images[0],
    mediaUrls: images.length > 0 ? images : undefined,
    phaseLabel: input.phaseLabel?.trim() || undefined,
  }) as DiaryItemRef;

  const diary: Diary = {
    ...current,
    phase: input.phaseLabel?.trim() || current.phase,
    coverImage: current.coverImage ?? images[0],
    updatedAt: now(),
    items: [...current.items, item].sort((a, b) => a.createdAt - b.createdAt),
  };

  const { results } = await publishSigned(signer, diaryEventTemplate(diary));
  return { diary, results: [...note.results, ...results] };
}

/**
 * NIP-09 deletion request for a whole diary: the addressable kind 30078 event
 * plus every kind 1 entry note it references. Relays honour it at their own
 * discretion, so callers must also drop the diary from local state.
 */
export async function deleteDiary(signer: Signer, diary: Diary): Promise<PublishResult[]> {
  const pubkey = await signer.getPublicKey();
  const tags: string[][] = [
    ["a", `${KIND_DIARY}:${pubkey}:diary-${diary.id}`],
    ["k", String(KIND_DIARY)],
  ];
  for (const item of diary.items) tags.push(["e", item.eventId]);
  if (diary.items.length > 0) tags.push(["k", String(KIND_NOTE)]);

  const event = await signer.signEvent(withClientTag({
    kind: KIND_DELETE,
    created_at: now(),
    tags,
    content: "Diary deleted from WondersLand",
  }));
  return await publish(getEnabledRelayUrls(), event);
}

/**
 * Media seam for Blossom. Uploads one image through the signer boundary and
 * returns its public URL; callers append that URL to the entry text so the
 * existing `extractImageUrls` path keeps working unchanged.
 */
export async function uploadMedia(signer: Signer, file: File): Promise<string> {
  const blob = await uploadBlob(signer, file);
  return blob.url;
}
