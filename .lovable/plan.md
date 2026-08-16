# Weedoshi → WondersLand: Nostr integration plan

WondersLand stays the product: same 3D world, same visual identity, same landing page.
Weedoshi is treated purely as a **code donor** for Nostr identity, relays, grow diaries
and social data. No Weedoshi screen, style, component or navigation is copied.

## What Weedoshi actually is (verified)

Public repo `WondrejGrower/Weedoshi` ("Nostr Grow Diaries"): an **Expo / React Native**
app (expo-router, react-native 0.76, AsyncStorage, expo-secure-store) using
`nostr-tools` ^2.23. All reusable logic lives in `src/lib/*` — roughly 40 modules,
framework-agnostic TypeScript except for storage/secure-store imports.

Key facts found in the code:
- Diaries are published as **kind 30078** parameterized-replaceable events; growmies
  (follow-style lists) as **kind 30000**.
- `diaryStore.ts` already defines the schema we need: `Diary` (id, title, plant,
  plantSlug, species, cultivar, breeder, phase, coverImage, createdAt, updatedAt,
  isPublic, syncStatus, items) and `DiaryItemRef` (eventId, authorPubkey, createdAt,
  contentPreview, image, mediaUrls, phaseLabel).
- Signing is abstracted behind a `Signer` interface with NIP-07, NIP-46 and local
  (nsec) implementations.
- `persistentStorage.ts` is already web-aware (IndexedDB → localStorage → AsyncStorage).
- Relay defaults: damus, snort, nostr.band, wellorder.

## Reuse / rewrite / drop

**Reuse almost as-is** (pure TS, only swap the storage import):
`signers/*` (types, localSigner, nip07Signer, nip46Signer, signerManager),
`eventValidator`, `eventFilter`, `eventDeduplicator`, `mediaExtraction`,
`networkResult`, `securityBaseline`, `errorUtils`, `logger`, `diagnostics`,
`plants/*` (catalog, catalogData, search, types, wiki) — the plant catalog is a
direct feed for 3D plant metadata.

**Port with edits** (drop AsyncStorage / RN assumptions, trim):
`diaryStore`, `diaryManager`, `nostrSync` (keep kinds 30078 / 30000 and the tag
schema verbatim so existing Weedoshi diaries stay readable), `relayManager`,
`growmiesStore`, `nostrClient` (keep the SimplePool wrapper + cache, drop the parts
tied to RN feed screens).

**Rewrite for WondersLand:**
- `persistentStorage` → small IndexedDB/localStorage module, no AsyncStorage branch.
- `secureKeyManager` → browser version; expo-secure-store does not exist here.
- `authManager` → slimmer web auth store (NIP-07 first, npub read-only second,
  NIP-46 later). React state lives in Zustand, not the class singleton.

**Do not migrate:** every `src/components/*`, `src/features/home/*`, `app/*` route,
`App.tsx`, the feed/reactions/threads UI, `reactionManager`, `threadManager`,
`smartRelaySelector`, `relayHealthMonitor`, `relayLatencyProbe`, `batchRequestManager`,
`perfMonitor`, expo config, tests harness. Reactions/threads can come back later only
if the 3D world needs them.

## Key-handling policy

Browser-first: **NIP-07 extension** is the primary login, **npub paste = read-only
visitor mode** is the fallback. Raw `nsec` entry is deliberately not ported in the
first phases — no private key is stored by WondersLand. NIP-46 (remote signer) is the
planned path for mobile write access.

## Proposed architecture inside WondersLand

```text
src/
  nostr/                     # framework-free layer, no React, no three
    types.ts                 # NostrEvent aliases, Diary, DiaryItemRef, Growmie
    kinds.ts                 # 30078 diary, 30000 growmies, 0 profile
    storage.ts               # IndexedDB/localStorage kv (rewritten)
    relays.ts                # relay list + enable/disable + persistence
    pool.ts                  # SimplePool wrapper: fetch, subscribe, publish
    signers/                 # ported: types, nip07, nip46, manager
    profile.ts               # kind-0 metadata fetch + npub/hex encoding
    diaries.ts               # ported diaryStore/nostrSync mapping
    growmies.ts              # kind-30000 list
    media.ts                 # ported mediaExtraction
    plants/                  # ported catalog + wiki (strain metadata)
  state/
    useNostrStore.ts         # zustand: auth {pubkey, method, readOnly}, profile,
                             # diaries, loading — flat, no per-frame writes
    useGardenStore.ts        # derived: diary -> garden plant slots
  garden/
    mapping.ts               # pure: Diary[] -> GardenPlant[] (species, phase,
                             # growth stage, position slot) — testable, no three
  ui/
    NostrSignIn.tsx          # replaces the visual-only "Sign in with Nostr" button
    GardenHud.tsx            # minimal in-world HUD (avatar, diary count)
  world/
    GardenPlants.tsx         # reads useGardenStore, renders existing procedural
                             # plant component per slot
```

Rules kept from `AGENTS.md`: nothing in `src/nostr/**` imports three or R3F; nothing
inside `<Canvas>` imports DOM UI; the two sides talk only through Zustand. Network
calls never happen inside `useFrame`.

## How identity → garden connects

1. User signs in (NIP-07) or pastes an npub (read-only). Store holds `pubkey`.
2. Profile: fetch kind 0 → name/picture used in the HUD and landing header.
3. Diaries: fetch kind 30078 authored by that pubkey → `Diary[]` in the store,
   cached in IndexedDB so a revisit renders instantly and refreshes in the background.
4. `garden/mapping.ts` turns each diary into a `GardenPlant`: `plantSlug`/`species`
   drives which procedural plant model and palette to use, `phase` drives growth
   scale/maturity, `updatedAt` drives freshness, `coverImage` becomes the plaque
   thumbnail. Positions come from a deterministic slot layout (diary id hashed to a
   fixed bed slot) so a garden looks the same every visit.
5. In-world: walking up to a plant opens the existing journal panel, now filled with
   that diary's entries (`DiaryItemRef` content preview, media, dates) instead of the
   hard-coded cannabis text.
6. Growmies later: a friend's npub → the same pipeline read-only, powering
   "Visit a Friend".

## Migration order (world keeps working at every step)

1. **Foundation, invisible.** Add `nostr-tools`. Create `src/nostr/` with types,
   kinds, storage, relays, pool. No UI change. Verify with a temporary dev-only fetch
   log, then remove it.
2. **Identity.** Port signers + write `useNostrStore`. Make the existing "Sign in with
   Nostr" button real: NIP-07 login, npub read-only fallback, disconnect. Landing page
   layout unchanged — only the button behaviour and a small signed-in avatar.
3. **Profile.** kind-0 fetch and cache; show name/picture where the placeholder avatar
   already is.
4. **Diaries read-only.** Port diaryStore/nostrSync fetch path. Load the signed-in
   user's diaries into the store. Still no 3D change; surface a plain count on the
   "My Garden" card ("3 diaries found").
5. **Garden mapping.** Add `garden/mapping.ts` + `GardenPlants.tsx`. The world renders
   one procedural plant per diary in the existing planted bed, falling back to today's
   single hard-coded plant when signed out. Journal shows real diary entries.
6. **Publishing.** Add signed writes: create diary, add entry. Only after read works
   end to end. NIP-46 for mobile signing lands here.
7. **Social.** Growmies list + visiting another npub's garden (read-only), wiring the
   "Visit a Friend" card.

Each step ends with typecheck, build, a desktop and mobile browser pass on the full
loop (land → enter → walk → approach → journal → close), and updates to
`PROJECT_STATE.md`, `ROADMAP.md`, `AI_HANDOFF.md` and `CHANGELOG.md`.

## Scope guards

- Steps 1–5 add exactly one runtime dependency: `nostr-tools`.
- No backend, no database, no auth service — Nostr relays are the only network.
- Relay traffic is throttled and cached; the 3D scene never blocks on it.
- Weedoshi's event kinds and tag schema are preserved so both apps read the same data.
