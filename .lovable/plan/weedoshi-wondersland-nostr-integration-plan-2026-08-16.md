# Weedoshi → WondersLand: Nostr integration plan

WondersLand stays the product: same 3D world, same visual identity, same landing page.
Weedoshi is treated purely as a **code donor** for Nostr identity, relays, grow diaries
and social data. No Weedoshi screen, style, component or navigation is copied.

Phase 1 is **read-only**: WondersLand visualizes diaries, Weedoshi stays the editor.

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
`eventValidator`, `eventFilter`, `eventDeduplicator`, `mediaExtraction`,
`networkResult`, `securityBaseline`, `errorUtils`, `logger`,
`plants/*` (catalog, catalogData, search, types, wiki) — the plant catalog is a
direct feed for 3D plant metadata and category inference.

**Port with edits** (drop AsyncStorage / RN assumptions, trim to the read path):
`diaryStore` (types + parsing only), `nostrSync` (keep kinds 30078 / 30000 and the tag
schema verbatim so existing Weedoshi diaries stay readable), `relayManager`,
`growmiesStore`, `nostrClient` (SimplePool wrapper + cache, minus RN feed plumbing).
`signers/nip07Signer` + `signerManager` are ported now for identity; `localSigner`
and `nip46Signer` come later with publishing.

**Rewrite for WondersLand:**
- `persistentStorage` → small IndexedDB/localStorage module, no AsyncStorage branch.
- `authManager` → slim web auth store (NIP-07 first, npub read-only second).
  React state lives in Zustand, not the class singleton.

**Do not migrate:** every `src/components/*`, `src/features/home/*`, `app/*` route,
`App.tsx`, the feed/reactions/threads UI, `reactionManager`, `threadManager`,
`smartRelaySelector`, `relayHealthMonitor`, `relayLatencyProbe`, `batchRequestManager`,
`perfMonitor`, `secureKeyManager`, `diaryManager` (write path), expo config, test
harness.

## Key-handling policy

Browser-first: **NIP-07 extension** is the primary login, **npub paste = read-only
visitor mode** is the fallback. Raw `nsec` entry is not ported. Phase 1 signs nothing,
so no private key ever touches WondersLand. NIP-46 (remote signer) is the planned path
when publishing is authorized later.

## Proposed architecture inside WondersLand

```text
src/
  nostr/                     # framework-free layer, no React, no three
    types.ts                 # NostrEvent aliases, Diary, DiaryItemRef, Growmie
    kinds.ts                 # 30078 diary, 30000 growmies, 0 profile
    storage.ts               # IndexedDB/localStorage kv (rewritten)
    relays.ts                # relay list + enable/disable + persistence
    pool.ts                  # SimplePool wrapper: fetch + subscribe (read only)
    signers/                 # nip07 + manager (identity only in phase 1)
    profile.ts               # kind-0 metadata fetch + npub/hex encoding
    diaries.ts               # event -> Diary parsing (ported from nostrSync)
    growmies.ts              # kind-30000 list
    media.ts                 # ported mediaExtraction
    plants/                  # ported catalog + wiki (strain/species metadata)
  state/
    useNostrStore.ts         # zustand: auth {pubkey, method, readOnly}, profile,
                             # diaries, loading — flat, no per-frame writes
    useGardenStore.ts        # derived: GardenPlant[] grouped by zone
  garden/
    zones.ts                 # zone ids, world bounds, slot layout per zone
    categories.ts            # category inference: indoor | vegetable | herb |
                             # fruit | seedling | cannabis | other
    models.ts                # category/species -> model id + generic fallback
    mapping.ts               # pure: Diary[] -> GardenPlant[] — testable, no three
  ui/
    NostrSignIn.tsx          # makes the existing "Sign in with Nostr" button real
    GardenHud.tsx            # minimal in-world HUD (avatar, diary count)
  world/
    GardenPlants.tsx         # reads useGardenStore, renders the resolved model
                             # at its zone slot
```

Rules kept from `AGENTS.md`: nothing in `src/nostr/**` or `src/garden/**` imports three
or R3F; nothing inside `<Canvas>` imports DOM UI; the two sides talk only through
Zustand. Network calls never happen inside `useFrame`.

## Garden zones (the mapping model)

A diary is never dropped into a single generic bed. `mapping.ts` runs three pure steps:

1. **Categorize** (`categories.ts`) — from `plantSlug` / `species` / `plant` /
   diary tags, matched against the ported plant catalog, with a keyword table as
   backup and `other` as the final fallback.
2. **Assign a zone** (`zones.ts`):

```text
category            zone            placement
-----------------   -------------   -------------------------------
indoor, houseplant  house           pots on the porch / windowsills
vegetable, herb     raised-beds     rows inside rectangular beds
fruit               orchard         spaced tree slots on a lawn
seedling            greenhouse      benches (zone stubbed until built)
cannabis, other     open-garden     the existing planted bed
```

Only zones that exist in the world receive plants. Until the greenhouse interior and
the house exist as walkable scenery, their categories fall back to `open-garden` and
the plaque still states the real category — no invisible or unreachable plants.

3. **Slot** — each zone owns a fixed ordered list of local positions. A diary's slot
   comes from a stable hash of its id, so a garden looks identical on every visit and
   adding a diary does not reshuffle the others. Overflow beyond a zone's slots is
   paged, not stacked.

Growth stage comes from `phase` (seedling / vegetative / flowering / harvested) and
drives scale and maturity of the chosen model, not which model is used.

## Visual fallback system (`models.ts`)

```ts
resolveModel(category, species, slug) -> { modelId, isGeneric }
```

- Exact match first: a species/slug with a dedicated WondersLand model (today only
  cannabis) uses it.
- Otherwise a **generic representative model per category** — generic potted
  houseplant, generic leafy vegetable, generic herb bunch, generic fruit tree,
  generic seedling tray. These are procedural, reuse existing geometry/materials, and
  are instanced per category to keep draw calls low.
- Every plant, generic or not, carries the real metadata: the 3D plaque shows the
  diary's plant name, species/cultivar and phase, and the journal shows the diary's
  entries. `isGeneric` may render a small "generic depiction" note in the journal so
  the visual is never mistaken for a botanical claim.
- Adding a dedicated model later is a one-line registry change — no mapping rewrite.

## How identity → garden connects (phase 1, read-only)

1. Sign in with NIP-07, or paste an npub for read-only visiting. Store holds `pubkey`.
2. Profile: fetch kind 0 → name/picture in the HUD and landing header.
3. Diaries: fetch kind 30078 authored by that pubkey → `Diary[]`, cached in IndexedDB
   so a revisit renders instantly and refreshes in the background.
4. `garden/mapping.ts` → `GardenPlant[]` (zone, slot, modelId, isGeneric, growth stage,
   plaque metadata, diary id).
5. In-world: approaching a plant opens the existing journal panel, filled with that
   diary's entries (content preview, media URLs, dates) instead of hard-coded text.
6. No create, edit, delete or publish anywhere in the UI. Weedoshi remains the editor.

## Migration order (world keeps working at every step)

1. **Foundation, invisible.** Add `nostr-tools`. Create `src/nostr/` with types,
   kinds, storage, relays, pool. No UI change. Verify with a temporary dev-only fetch
   log, then remove it.
2. **Identity.** Port the NIP-07 signer + write `useNostrStore`. Make the existing
   "Sign in with Nostr" button real: extension login, npub read-only fallback,
   disconnect. Landing layout unchanged — only behaviour and a small signed-in avatar.
3. **Profile.** kind-0 fetch and cache; show name/picture where the placeholder avatar
   already is.
4. **Diaries read-only.** Port the diary parsing/fetch path. Load the signed-in user's
   diaries into the store. Still no 3D change; surface a plain count on the
   "My Garden" card ("3 diaries found").
5. **Zones and mapping.** Add `zones.ts`, `categories.ts`, `models.ts`, `mapping.ts`
   with unit tests on the pure functions. No rendering yet — verify the mapping output
   in tests.
6. **Render the garden.** Add `GardenPlants.tsx` plus the generic category models and
   the open-garden / raised-beds / orchard zone scenery. Signed out, the world falls
   back to today's single hard-coded plant. Journal and plaque show real diary data.
7. **Social (later).** Growmies list + visiting another npub's garden read-only,
   wiring the "Visit a Friend" card.
8. **Publishing (not now).** Signed writes, NIP-46 mobile signing, house/greenhouse
   zones. Requires a new authorization.

Each step ends with typecheck, build, a desktop and mobile browser pass on the full
loop (land → enter → walk → approach → journal → close), and updates to
`PROJECT_STATE.md`, `ROADMAP.md`, `AI_HANDOFF.md` and `CHANGELOG.md`.

## Scope guards

- Adds exactly one runtime dependency: `nostr-tools`.
- No backend, no database, no auth service — Nostr relays are the only network.
- No writes to Nostr in this milestone.
- Relay traffic is throttled and cached; the 3D scene never blocks on it.
- Vegetation stays instanced and procedural; no imported plant models.
- Weedoshi's event kinds and tag schema are preserved so both apps read the same data.
