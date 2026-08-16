// Future WondersLand infrastructure. Declared here as configuration only.
// Nothing connects to these yet: the relay is not enabled by default and no
// media upload exists.

/** Planned WondersLand Nostr relay. Opt-in, never the only relay. */
export const WONDERSLAND_RELAY_URL = "wss://relay.wondersland.online";

/** Planned Blossom media server base URL. No upload code uses this yet. */
export const BLOSSOM_BASE_URL = "https://blossom.wondersland.online";

/** Flip to true only once the relay is reachable in production. */
export const WONDERSLAND_RELAY_ENABLED = false;
