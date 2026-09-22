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
import { nip19 } from "nostr-tools";
import { KIND_GROWMIES } from "../nostr/kinds";
import { withClientTag } from "../nostr/clientTag";
import { OWNER_PUBKEY } from "../nostr/owner";
import { publish, query, type PublishResult } from "../nostr/pool";
import { getEnabledRelayUrls } from "../nostr/relays";
import type { Signer } from "../nostr/signers";

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

/**
 * Normalise a user-typed verifier identifier to a hex pubkey.
 * Accepts 64-char hex or an npub. Throws on anything else — the caller shows
 * the message and publishes nothing.
 */
export function parseVerifierInput(input: string): string {
  const trimmed = input.trim();
  if (HEX64.test(trimmed.toLowerCase())) return trimmed.toLowerCase();
  if (trimmed.startsWith("npub1")) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === "npub" && typeof decoded.data === "string") {
        return decoded.data.toLowerCase();
      }
    } catch {
      // fall through to the generic error below
    }
  }
  throw new Error("Enter a valid npub… address or a 64-character hex pubkey");
}

/** Publish the owner-signed reviewer list. Replaces the previous list. */
export async function publishVerifierList(
  signer: Signer,
  pubkeys: string[],
): Promise<PublishResult[]> {
  const unique = [...new Set(pubkeys.map((p) => p.toLowerCase()))];
  for (const pubkey of unique) {
    if (!HEX64.test(pubkey)) throw new Error("The reviewer list contains an invalid pubkey");
  }
  const template = withClientTag({
    kind: KIND_GROWMIES,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["d", VERIFIERS_D_TAG], ...unique.map((p) => ["p", p])],
    content: "",
  });
  const event = await signer.signEvent(template);
  const results = await publish(getEnabledRelayUrls(), event);
  if (results.length > 0 && !results.some((r) => r.ok)) {
    throw new Error("No relay accepted the reviewer list — nothing was published");
  }
  return results;
}
