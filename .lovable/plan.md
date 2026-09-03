# Interactions on Nostr: likes, comments, zaps + "From WondersLand" stamp

Turn the currently inert Like / Zap / Reply / Repost buttons in the Grow Feed into real
Nostr writes, and mark everything we publish with our client identity.

## Which NIPs

| Action | NIP | Event |
| --- | --- | --- |
| Like | NIP-25 | kind 7 reaction, content `+`, tags `e` (note id), `p` (author), `k` (7 target kind) |
| Comment / reply | NIP-10 | kind 1 with `e` root/reply markers + `p` mentions |
| Repost | NIP-18 | kind 6 with `e` + `p` (optional, cheap once the rest exists) |
| Zap | NIP-57 | kind 9734 zap request signed by us, paid over Lightning; kind 9735 receipt read back |
| Client stamp | NIP-89 | `client` tag on every event we publish |

## Phase 1 — Likes and comments (the part you want today)

New protocol module `src/nostr/interactions.ts`:
- `publishReaction(post)` — builds kind 7, signs with the current signer, publishes to enabled relays.
- `publishReply(post, text)` — builds kind 1 with `["e", <id>, <relay>, "root"]` and `["p", <author>]`,
  reusing the same content/media conventions the diary entries already use.
- `fetchInteractions(ids)` — one query for kinds 7 and 1 referencing the visible note ids,
  so cards can show like counts and reply counts.

UI:
- Grow Feed card actions become live for writable sessions (`canPublish`); read-only npub sessions
  get the existing PublishUnlock prompt instead of a disabled button.
- Like is optimistic with a rollback if no relay accepts, and shows the accepted-relay count
  the same way diary deletion already does.
- Reply opens a small composer sheet under the card (mobile-first, same styling as DiaryComposer),
  publishes, then appends the reply locally.
- Replies already on a note are shown collapsed ("3 comments") and expand in place.

Nothing is cached to a backend; counts live in the feed store next to the posts.

## Phase 2 — The "From WondersLand" stamp

Other clients show "from Damus" / "from Primal" because they attach a NIP-89 `client` tag.
We do the same, in one place so it can never drift:

- A single `withClientTag(template)` helper in `src/nostr/client-tag.ts` adds
  `["client", "WondersLand", "31990:<our-pubkey>:wondersland", "wss://<relay>"]`.
  The bare form `["client", "WondersLand"]` already works everywhere; the addressable
  coordinate makes clients render it as a link.
- Every publish path goes through it: reactions, replies, reposts, zap requests,
  diary events (kind 30078) and diary entries (kind 1).
- We also publish a one-off kind 31990 handler-information event describing WondersLand
  (name, about, icon, wondersland.online URL) so the tag resolves to a real profile.
- Reading direction: feed cards and diary entries show the other side's `client` tag as a
  muted chip next to the existing relay/media chips — "from Damus", "from Primal",
  "from WondersLand".

## Phase 3 — Zaps (separate pass)

Zaps need a Lightning wallet round-trip: read the author's `lud16`/`lud06` from their kind 0,
fetch the LNURL-pay callback, send a signed kind 9734 zap request, hand the invoice to the
user's wallet (WebLN when present, otherwise a QR / `lightning:` link), then watch relays for
the kind 9735 receipt to confirm. Zap stays visibly disabled until this pass lands, rather
than pretending to work.

## Scope guards

- No backend, no database, no Blossom changes, no 3D world changes.
- Weedoshi diary format (kind 30078 + referenced kind 1) unchanged; only an extra `client` tag.
- Read-only npub sessions can never publish.

## Verification

Typecheck, build, unit tests for tag construction, and a real publish of one like plus one
comment from the app against the live relays, checking the accepted-relay count and that
another client shows the note as "from WondersLand".
