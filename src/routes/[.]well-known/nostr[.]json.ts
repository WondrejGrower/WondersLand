/**
 * NIP-05 verification for wondersland.online.
 *
 * Serves the root identifier `_`, so Nostr clients show the verified address
 * as plain `wondersland.online`. Public, static and CORS-open by spec.
 */
import { createFileRoute } from "@tanstack/react-router";
import { OWNER_PUBKEY } from "../../nostr/owner";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.snort.social",
];

export const Route = createFileRoute("/.well-known/nostr.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const name = new URL(request.url).searchParams.get("name");
        const match = name === null || name === "_";
        const body = {
          names: match ? { _: OWNER_PUBKEY } : {},
          relays: match ? { [OWNER_PUBKEY]: RELAYS } : {},
        };
        return new Response(JSON.stringify(body), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
