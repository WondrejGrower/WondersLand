import { verifyEvent } from "nostr-tools";
import { GARDEN_SCHEMA_VERSION, type GardenConfig } from "../garden/config";
import { isFutureSchema, migrateConfig } from "../garden/migrate";
import { parseGardenConfig } from "../garden/validate";
import { KIND_DIARY } from "./kinds";
import { publish, query, type PublishResult } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { EventTemplate, Signer } from "./signers";
import { getJson, setJson } from "./storage";
import type { NostrEvent } from "./types";

/**
 * Permanent address of a WondersLand garden. Never versioned: every future
 * schema migrates under this same `d` tag.
 */
export const GARDEN_D_TAG = "wondersland:garden-config";
export const GARDEN_KIND = KIND_DIARY; // 30078, NIP-78 application data

export type CachedGarden = {
  event: NostrEvent | null;
  config: GardenConfig;
  fetchedAt: number;
};

export type GardenDraft = {
  config: GardenConfig;
  dirtyAt: number;
  baseEventId: string | null;
  baseCreatedAt: number;
  baseRev: number;
};

const cacheKey = (pubkey: string) => `garden:${pubkey}`;
const draftKey = (pubkey: string) => `garden:${pubkey}:draft`;

export function getCachedGarden(pubkey: string): Promise<CachedGarden | null> {
  return getJson<CachedGarden>(cacheKey(pubkey));
}

export function setCachedGarden(pubkey: string, value: CachedGarden): Promise<void> {
  return setJson(cacheKey(pubkey), value);
}

export function getDraft(pubkey: string): Promise<GardenDraft | null> {
  return getJson<GardenDraft>(draftKey(pubkey));
}

export function setDraft(pubkey: string, draft: GardenDraft): Promise<void> {
  return setJson(draftKey(pubkey), draft);
}

/**
 * NIP-01 addressable ordering: newest `created_at` wins, lowest event id breaks
 * a tie. The application-level `rev` never participates.
 */
export function isNewerEvent(candidate: NostrEvent, current: NostrEvent | null): boolean {
  if (!current) return true;
  if (candidate.created_at !== current.created_at) return candidate.created_at > current.created_at;
  return candidate.id < current.id;
}

export function tagValue(event: NostrEvent, key: string): string | undefined {
  return event.tags.find((tag) => tag[0] === key)?.[1];
}

/** Fetch and verify the owner's garden event. Returns null when none exists. */
export async function fetchGardenConfig(
  pubkey: string,
): Promise<{ event: NostrEvent; config: GardenConfig } | null> {
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [GARDEN_KIND], authors: [pubkey], "#d": [GARDEN_D_TAG], limit: 10 },
    6000,
  );

  let best: { event: NostrEvent; config: GardenConfig } | null = null;
  for (const event of events) {
    if (event.pubkey !== pubkey) continue;
    if (tagValue(event, "d") !== GARDEN_D_TAG) continue;
    if (!isNewerEvent(event, best?.event ?? null)) continue;
    try {
      if (!verifyEvent(event)) continue;
    } catch {
      continue;
    }
    const parsed = parseGardenConfig(event.content, pubkey);
    if (!parsed || isFutureSchema(parsed)) continue;
    best = { event, config: migrateConfig(parsed) };
  }
  return best;
}

export function buildGardenEvent(config: GardenConfig, createdAt: number): EventTemplate {
  return {
    kind: GARDEN_KIND,
    created_at: createdAt,
    tags: [
      ["d", GARDEN_D_TAG],
      ["t", "wondersland"],
      ["client", "wondersland"],
      ["schema", String(config.schema)],
      ["rev", String(config.rev)],
      ["updated_at", String(config.updatedAt)],
    ],
    content: JSON.stringify(config),
  };
}

/** Sign and publish. `created_at` is forced strictly above the last publish. */
export async function publishGardenConfig(
  signer: Signer,
  config: GardenConfig,
  lastCreatedAt: number,
): Promise<{ event: NostrEvent; results: PublishResult[] }> {
  const pubkey = await signer.getPublicKey();
  if (pubkey.toLowerCase() !== config.owner.toLowerCase()) {
    throw new Error("This garden belongs to a different Nostr account");
  }
  const now = Math.floor(Date.now() / 1000);
  const createdAt = Math.max(now, lastCreatedAt + 1);
  const next: GardenConfig = { ...config, schema: GARDEN_SCHEMA_VERSION, updatedAt: createdAt };
  const event = await signer.signEvent(buildGardenEvent(next, createdAt));
  const results = await publish(getEnabledRelayUrls(), event);
  if (!results.some((r) => r.ok)) throw new Error("No relay accepted the garden");
  return { event, results };
}
