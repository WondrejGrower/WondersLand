/**
 * The pilot verifier list.
 *
 * A NIP-51 follow set published by the WondersLand owner:
 *   kind 30000, d = wondersland:verifiers:v1
 *
 * The identifier deliberately differs from `growmies` so the two lists never
 * collide. Until that set exists on a relay, verification is *unconfigured*:
 * no account is invented and nothing is auto-allowed.
 */
import { KIND_GROWMIES } from "../nostr/kinds";
import { OWNER_PUBKEY } from "../nostr/owner";
import { query } from "../nostr/pool";
import { getEnabledRelayUrls } from "../nostr/relays";

export const VERIFIERS_D_TAG = "wondersland:verifiers:v1";
export const VERIFIERS_AUTHOR = OWNER_PUBKEY;

const HEX64 = /^[0-9a-f]{64}$/;

/** null means "list not published yet", not "everyone allowed". */
export async function fetchVerifiers(): Promise<string[] | null> {
  const events = await query(
    getEnabledRelayUrls(),
    {
      kinds: [KIND_GROWMIES],
      authors: [VERIFIERS_AUTHOR],
      "#d": [VERIFIERS_D_TAG],
      limit: 5,
    },
    6000,
  );
  let best: (typeof events)[number] | null = null;
  for (const event of events) {
    if (event.pubkey !== VERIFIERS_AUTHOR) continue;
    if (!best || event.created_at > best.created_at) best = event;
  }
  if (!best) return null;

  const out = new Set<string>();
  for (const tag of best.tags) {
    if (tag[0] !== "p") continue;
    const pubkey = tag[1]?.trim().toLowerCase();
    if (pubkey && HEX64.test(pubkey)) out.add(pubkey);
  }
  return [...out];
}
