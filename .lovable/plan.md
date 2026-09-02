# Relay & Blossom provenance for every post

## Problem

A diary deleted days ago still shows up. The NIP-09 deletion request was sent, but at least one relay ignored or never received it, and today the UI gives no clue which relay a diary or entry came from. Same for images: we cannot tell which Blossom server actually hosts a photo.

## What gets built

### 1. Track where each event came from

`query()` in the relay pool currently merges events and throws away the source. Change it to also record, per event id, the set of relay URLs that delivered it (`onevent` gives the relay). Return the events as today plus an optional provenance map, so no existing caller breaks.

Provenance flows up into:
- diaries (kind 30078 diary event)
- diary entries (kind 1 notes)
- feed items

and is cached alongside the existing local cache so a reload still shows something sensible (marked as "last seen on").

### 2. Show it in the UI

- **Diary detail header**: a small, muted "Seen on" row with relay host chips (`relay.damus.io`, `nos.lol`, ...).
- **Each entry in the reader**: the same chip row, compact, under the entry meta line.
- **Feed items**: one-line relay origin, muted, consistent with the current card style.
- **Images**: for every media URL in an entry, show the media host chip (e.g. `blossom.wondersland.online`) so Blossom origin is visible. Derived from the URL hostname — no extra network calls.

Chips are tasteful and secondary: small text, muted token colors, wrap on mobile, never a primary action.

### 3. Make the stale-delete situation actionable

Because relays may ignore deletions, add to the diary detail (only for writable sessions, near the existing Delete action):
- After a delete, report per-relay result (accepted / refused / timeout) instead of a silent success.
- A "Re-send deletion" action on a diary that still appears, which republishes the NIP-09 request to the relays that currently serve it.
- If a relay keeps serving it, say so plainly: the event is gone locally and from cooperating relays, but that relay refuses deletion — this is how Nostr works, not a bug in the app.

## Out of scope

No backend, no schema change, no new event kinds, no changes to the Weedoshi diary format, no 3D world changes, no new packages.

## Technical notes

- `src/nostr/pool.ts`: `query()` gains provenance collection; `publish()` results already carry per-relay status and get surfaced.
- `src/nostr/diaries.ts`, `diaryEntries.ts`, `feed.ts`: pass provenance through into their types (optional fields, so nothing else breaks).
- `src/ui/DiaryDetail.tsx`, `GrowFeed.tsx`, `HomeDashboard.tsx`: render the chips.
- Blossom host comes from the existing extracted media URLs, purely client-side.
