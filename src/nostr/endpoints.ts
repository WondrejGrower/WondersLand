// Future WondersLand infrastructure. Declared here as configuration only.
// Nothing connects to these yet: the relay is not enabled by default and no
// media upload exists.

/** Planned WondersLand Nostr relay. Opt-in, never the only relay. */
export const WONDERSLAND_RELAY_URL = "wss://relay.wondersland.online";

/**
 * Blossom media servers, tried in order. All are public, keyless and free:
 * a BUD-11 signed auth event is the only credential.
 * `https://blossom.wondersland.online` will be prepended once we host our own.
 */
export const BLOSSOM_SERVERS = [
  "https://blossom.primal.net",
  "https://blossom.band",
  "https://nostr.download",
] as const;

/** Default single server (first of the list). */
export const BLOSSOM_BASE_URL = BLOSSOM_SERVERS[0];

/** Flip to true only once the relay is reachable in production. */
export const WONDERSLAND_RELAY_ENABLED = false;
