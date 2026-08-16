import { KIND_PROFILE } from "./kinds";
import { query } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import { getJson, setJson } from "./storage";
import type { Profile } from "./types";

const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type CachedProfile = { fetchedAt: number; profile: Profile };

export async function fetchProfile(pubkey: string): Promise<Profile> {
  const cacheKey = `profile:${pubkey}`;
  const cached = await getJson<CachedProfile>(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.profile;

  const events = await query(getEnabledRelayUrls(), { kinds: [KIND_PROFILE], authors: [pubkey], limit: 4 }, 5000);
  let profile: Profile = { pubkey };
  const newest = events[0];
  if (newest) {
    try {
      const meta = JSON.parse(newest.content || "{}") as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
      profile = {
        pubkey,
        name: str(meta.name),
        displayName: str(meta.display_name) ?? str(meta.displayName),
        picture: str(meta.picture),
        about: str(meta.about),
      };
    } catch {
      // malformed metadata — keep the bare profile
    }
  }
  if (newest || !cached) await setJson(cacheKey, { fetchedAt: Date.now(), profile } satisfies CachedProfile);
  return cached && !newest ? cached.profile : profile;
}

export function profileLabel(profile: Profile | null, pubkey: string | null): string {
  const name = profile?.displayName || profile?.name;
  if (name) return name;
  const key = profile?.pubkey ?? pubkey;
  return key ? `${key.slice(0, 8)}…${key.slice(-4)}` : "Grower";
}
