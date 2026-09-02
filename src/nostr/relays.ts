import { WONDERSLAND_RELAY_ENABLED, WONDERSLAND_RELAY_URL } from "./endpoints";
import { getJson, setJson } from "./storage";

export type Relay = { url: string; enabled: boolean; custom?: boolean };

// Same defaults Weedoshi publishes to, so diaries are found where they live.
const DEFAULTS: Relay[] = [
  { url: "wss://relay.damus.io", enabled: true },
  { url: "wss://relay.snort.social", enabled: true },
  { url: "wss://relay.nostr.band", enabled: true },
  { url: "wss://nos.lol", enabled: true },
  // Smaller community relays where grow/weedoshi content lives; verified
  // reachable via NIP-11 and responsive to `#t` filters.
  { url: "wss://relay.nos.social", enabled: true },
  { url: "wss://nostr.mom", enabled: true },
  { url: "wss://nostr-pub.wellorder.net", enabled: false },
  // Future WondersLand relay: listed but off until it is reachable.
  { url: WONDERSLAND_RELAY_URL, enabled: WONDERSLAND_RELAY_ENABLED },
];

const KEY = "relays";

let relays: Relay[] = DEFAULTS.map((r) => ({ ...r }));
let loaded = false;

export async function loadRelays(): Promise<Relay[]> {
  if (loaded) return relays;
  loaded = true;
  const stored = await getJson<Relay[]>(KEY);
  if (Array.isArray(stored) && stored.length > 0) {
    const known = new Set(stored.map((r) => r.url));
    relays = [...stored, ...DEFAULTS.filter((d) => !known.has(d.url))];
  }
  return relays;
}

export function getRelays(): Relay[] {
  return relays.map((r) => ({ ...r }));
}

export function getEnabledRelayUrls(): string[] {
  const enabled = relays.filter((r) => r.enabled).map((r) => r.url);
  return enabled.length > 0 ? enabled : DEFAULTS.filter((r) => r.enabled).map((r) => r.url);
}

export function setRelayEnabled(url: string, enabled: boolean): void {
  const relay = relays.find((r) => r.url === url);
  if (!relay) return;
  relay.enabled = enabled;
  void setJson(KEY, relays);
}

export function addRelay(url: string): boolean {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid relay URL");
  }
  if (parsed.protocol !== "wss:") throw new Error("Relay URL must use wss://");
  if (relays.some((r) => r.url === trimmed)) return false;
  relays.push({ url: trimmed, enabled: true, custom: true });
  void setJson(KEY, relays);
  return true;
}
