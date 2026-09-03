# Photo upload for diary entries — make it actually work

## What's wrong today

The upload code is fine; the server is not. Uploads point at
`blossom.wondersland.online`, which does not resolve at all — that is exactly
the "media server can't be reached" message users see.

Checked live just now:

```text
blossom.wondersland.online  no response (does not exist)
blossom.primal.net          alive (401 = wants signed auth, as expected)
blossom.band                alive
nostr.download              alive
cdn.satellite.earth         not a Blossom upload endpoint
```

Note on satellite.earth: it is not a Blossom server. It uses its own
NIP-98 API and requires a pre-paid storage credit per account, so a visitor
with a fresh key could not upload at all. Recommending Blossom hosts instead —
same protocol we already implemented, no account, no payment.

## The change

1. **Swap the default host.** `src/nostr/endpoints.ts` gets an ordered list of
   Blossom servers instead of one dead URL:
   `blossom.primal.net` (primary), then `blossom.band`, then `nostr.download`.
   `blossom.wondersland.online` stays in the file as a commented-out future
   self-hosted target.

2. **Try the next server on failure.** `uploadBlob` keeps its current
   single-server behaviour; a thin `uploadToAnyServer` wrapper walks the list
   and only reports failure when every server refused. Each attempt re-signs
   its own BUD-11 auth, since the `server` tag is host-specific.

3. **Honest error copy.** Distinguish "no server accepted the photo — your
   entry text is safe, publish without the photo" from "that file is too
   large". The entry text is never lost on upload failure (already true today).

4. **Show where the photo landed.** The published entry already carries the
   blob URL in the kind:1 content, so the existing media chip in the reader
   will show `blossom.primal.net` automatically. No format change.

5. **Tests.** Extend `src/nostr/blossom.test.ts` with a mocked case where the
   first server 500s and the second succeeds, asserting each attempt sends its
   own bare-hostname `server` tag.

## Explicitly not in this pass

No backend, no Supabase, no change to the Weedoshi diary format (kind:30078 +
kind:1), no multi-image support, no 3D world changes, no new packages.

## Files touched

- `src/nostr/endpoints.ts` — server list
- `src/nostr/blossom.ts` — fallback wrapper, error copy
- `src/nostr/writeDiaries.ts` — `uploadMedia` uses the wrapper
- `src/nostr/blossom.test.ts` — fallback test
- docs: `PROJECT_STATE.md`, `CHANGELOG.md`
