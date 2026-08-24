# CHANGELOG

## 2026-08-24 — Hide diary (client-only)

### Added
- `src/state/useHiddenDiaries.ts` — per-pubkey list of hidden diary ids,
  persisted locally via the existing storage helper. No relay writes.
- `Hide diary` action with inline confirmation in the diary reader, and a
  `Hidden diaries (n)` view on the Diaries tab with `Restore diary`.

### Changed
- The diaries list, Latest diary, Garden growth, missions and the stale-diary
  count exclude hidden diaries. Hidden diaries stay readable from the hidden
  list; the Nostr data (kind:30078 diaries, kind:1 entries) is untouched.

## 2026-08-24 — Diary reader

### Added
- `src/nostr/diaryEntries.ts` — read-only helper that resolves a diary's item
  refs (`e` tags / `items[]`) to the referenced kind:1 notes and returns full
  text plus extracted media. Falls back to the cached `contentPreview` when a
  note cannot be fetched. The persisted diary schema is unchanged.
- `src/ui/DiaryDetail.tsx` — 2D diary reader inside the authenticated shell:
  cover (or empty state), title, plant/cultivar/breeder/phase metadata,
  created/updated stamps, chronological entry timeline with date, phase label,
  full text and images, plus an empty state for diaries with no entries.

### Changed
- Diary cards are fully clickable/keyboard-focusable and open the reader in
  read-only and writable sessions alike. The ambiguous "Update" button is now a
  secondary "Add entry" action shown only to writable sessions.
- Dashboard "Latest diary → Open diary" opens the reader instead of the entry
  composer.
- The reader's `+ Add entry` / `Edit diary` reuse `DiaryComposer`; after
  publishing, the reader re-reads the diary from the store by id, so it reflects
  the update immediately.

## 2026-08-24 — Mobile responsive polish (signed-in dashboard)

### Fixed
- Horizontal overflow on phones: the dashboard grid tracks and the Grow Feed
  panel inherited `min-width: auto`, so the non-shrinkable feed subtitle forced
  the document to ~447px. Added `min-w-0` on the two-column grid, both columns,
  the hero grid, the card grids and the feed panel/article wrappers — no global
  `overflow-x: hidden` guard needed.
- Mobile nav no longer scrolls or clips: the four items (Garden, Diaries,
  Missions, Community) sit in an even `grid-cols-4` with stacked icon + label.
- Grow Feed action row (Like / Zap / Reply / Repost) is icon-only under 380px
  and icon + label above, with tighter gaps and larger tap height, so labels no
  longer truncate with ellipses.
- Secondary text contrast raised one step across the dashboard and feed
  (cream/40-65 -> cream/55-80), keeping the muted hierarchy.
- Consistent 16px mobile side padding on cards; hero heading, hero artwork
  height and the Gardener Level chip scale down on narrow screens.

Verified with zero horizontal scroll at 375 / 390 / 430px and unchanged desktop
layout at 1280px.

## 2026-08-22 — Grow / Nostr feed switch

### Added
- Segmented `Grow | Nostr` control in the Grow Feed header. Grow keeps the
  hashtag-filtered garden feed; Nostr shows the broad kind-1 stream from the
  enabled relays (no `#t` filter).
- `fetchFeedPage(mode, limit, until)` in `src/nostr/feed.ts` with `until`-based
  pagination (`oldestCreatedAt - 1`) and a "Load older posts" action in the
  expanded feed.
- Local relevance/spam gate `isRelevantGrowNote()`: requires a real grow `t`
  tag on the event, rejects tag stuffing (>12 tags), link dumps (>3 URLs),
  hashtag walls (>8), all-caps content and posts with no meaningful body text.

### Changed
- `useFeedStore` now caches the two feeds independently (`mode`, `grow`,
  `nostr` lanes with posts/status/error/cursor); switching modes does not
  refetch a lane that already has data. Scroll position is kept per mode.
- Grow tag list extended with livingsoil, notill/no-till, soil, compost,
  regenerative.

### Unchanged
- Like / Zap / Reply / Repost stay inert. Real write support still needs
  NIP-25 (kind 7), NIP-10 replies, NIP-18 (kind 6) and NIP-57 zaps.

## 2026-08-21 — Dashboard as the post-login home + Nostr sign-up

### Added
- `createLocalIdentity()` / `peekFreshNsec()` / `forgetFreshNsec()` in
  `src/nostr/signers/local.ts`: generate a brand-new Nostr keypair in the
  browser. The secret stays in that module's memory for the tab only.
- `useNostrStore.createIdentity(displayName?)`: starts an nsec session with the
  generated key and optionally publishes a kind 0 profile to the enabled relays.
- "New to Nostr? Create an identity" flow in `src/ui/NostrSignIn.tsx`, plus a
  one-time key-backup panel (copy, explicit "I saved my key" confirmation,
  NIP-07 recommendation) shown before the user continues to the dashboard.

### Changed
- `src/routes/index.tsx`: restores the saved session on mount, shows a restore
  state after hydration instead of flashing the landing page, and resets world
  state on every sign-in/sign-out so the dashboard is always the post-login home.
- `useNostrStore.restore()` no longer downgrades a live session. A fresh nsec
  session persists as read-only `npub`, so re-running restore used to drop write
  access (the "+ New Diary" button disappeared right after sign-up).
- `restore()` releases the restore gate as soon as the identity is known, so the
  dashboard paints while the relays are still being read.

### Security
- No private key is ever written to localStorage, IndexedDB, GardenConfig, a URL
  or a log line; only pubkey + auth method persist, and nsec sessions persist as
  read-only. Refreshing clears the key by design.

## 2026-08-21 — Dashboard restored to the live wondersland.online version

### Changed
- `src/ui/HomeDashboard.tsx`, `src/ui/GrowFeed.tsx` and
  `src/assets/garden-island.png` restored to the state deployed on
  wondersland.online: icon nav, isometric garden-island hero with the
  Gardener Level card, Garden growth ring, Latest diary, Next step and the
  wide Garden status row.
- An earlier rollback attempt in this session had removed that pass; it is undone.
- Nothing else changed: 3D world, controls, collisions, Nostr layer, routing and
  the signed-out landing page are untouched.


## 2026-08-21 — Weedoshi-compatible diary write path (P2)

### Added
- `src/nostr/writeDiaries.ts` — `createDiary`, `updateDiary`, `addEntry` and a
  stubbed `uploadMedia` seam for Blossom. Diaries stay addressable kind 30078
  with `d: diary-<id>` and `t: weedoshi-diary`; an entry is a kind 1 note
  published first and then referenced from the diary event (`items[]` + `e`
  tag), so entry text never moves inside the diary event. One entry = at most
  two signer prompts.
- `src/ui/DiaryComposer.tsx` — create diary / edit diary / add entry modal.
  Publishing fails loudly when no relay accepts the event.

### Changed
- `useNostrStore.upsertDiary(diary)` merges an optimistic write into the store
  and pushes it to the garden store, so the 3D world reflects the new diary
  without a relay round-trip.
- `HomeDashboard` shows `+ New diary` and per-card `Update` actions for
  `nip07` / `nsec` sessions; `npub` sessions see no write affordance at all.

### Limitations
- No automated Weedoshi round-trip test yet (the project has no test runner
  configured); compatibility is enforced by writing exactly the fields
  `parseDiary` reads. Verify one real publish in Weedoshi before calling P2 done.
- Media upload is not implemented — entries accept pasted image URLs.

## 2026-08-21 — Signed-in Home dashboard (P1)

### Added
- `src/ui/HomeDashboard.tsx` — app-style Home for signed-in Nostr users: hero
  `▶ Enter My Garden`, a calm "Today in your Garden" section, diary cards built
  from existing `Diary` fields, and garden/relay status. No new fetching, no new
  event kinds.

### Changed
- `src/routes/index.tsx` branches on `useNostrStore().pubkey`: signed-out
  visitors keep the untouched marketing landing, signed-in users get Home. The
  `entered` flag and the 3D world path are unchanged.

## 2026-08-21 — Fix stuck movement after key release

### Fixed
- Desktop avatar could keep walking after W/A/S/D was released when the browser
  swallowed a `keyup` (alt-tab, focus loss, tab hidden, overlay open/close).
- `keyup` is now bound in the capture phase, `keydown` ignores auto-repeat, and
  keyboard state is cleared on `blur`, `pagehide` and `visibilitychange`.

### Changed
- `src/state/input.ts` splits keyboard and touch into separate channels behind
  clamped `forward`/`strafe` getters; `TouchControls` and `Player` write through
  `setTouchAxes` / `setKeyboardAxes` and their matching clear helpers, so a
  keyboard reset never wipes an active mobile joystick.
- The per-frame path stays allocation-free with no React/Zustand movement writes.

## 2026-08-20 — World collision

Lightweight XZ collision so the avatar can no longer walk through solid
scenery. No physics dependency added.

### Added
- `src/world/layout.ts` — shared deterministic layout (`rng`, `GRASS_INSTANCES`,
  `ROCK_INSTANCES`, `TREE_INSTANCES`) used by both rendering and collision.
- `src/world/collision.ts` — `Collider` (circle | rotated box), `WORLD_COLLIDERS`,
  allocation-free `resolveMove(...)` with sliding, `PLAYER_RADIUS = 0.42`, and a
  dev-only `assertSpawnClear(...)`.

### Changed
- `Player.tsx` resolves each move against the world colliders plus dynamic diary
  plant colliders (memoised, never rebuilt in `useFrame`).
- `Ground.tsx` / `Trees.tsx` now consume the shared layout arrays; `Trees` no
  longer takes a `radius` prop.
- `Plaza.tsx` and `Cottage.tsx` export their placement/footprint constants.

### Not included
- Camera collision, per-triangle collision, colliding grass/flowers/pebbles.

## 2026-08-12 — Entrance plaza (first playable environment slice)

Added a cozy botanical entrance plaza around the existing minimal loop. No new
systems, no packages, no imported assets.

### Added
- `src/world/Plaza.tsx` — all new scenery in one module:
  - WondersLand entrance arch (wooden posts, stone footings, curved top beam)
    with a locally drawn `CanvasTexture` sign — no remote font or image.
  - A short curved walkable path (quadratic bezier, reused flat quads) running
    from the arch, past the planted island, to the cannabis plant.
  - A central planted island: stone rim, soil cylinder, instanced blossoms and
    three shrubs.
  - Three stylized low-poly trees (trunk cylinder + icosahedron canopies).
  - Instanced shrubs and flower clumps scattered clear of the path, plus a few
    framing rocks.
  - A small greenhouse / Living Soil Lab silhouette in the distance.
  - Cheap fake contact shadows (flat translucent discs) under trees, posts,
    the greenhouse and the plant.
- `nearPath()` helper exported from `Plaza.tsx` so vegetation keeps the
  walkable route clear.

### Changed
- `src/world/Ground.tsx` — scatter helper takes a path-clearance radius; grass
  and rocks no longer grow on the path.
- `src/world/World.tsx` — renders `<Plaza />`; slightly warmer/stronger sun and
  a further fog range.
- `src/world/palette.ts` — 17 new plaza colors (path, stone, wood, sign,
  trunk, three foliage greens, shrub, soil, three flower tones, glass, frame,
  shadow).
- `src/ui/InteractPrompt.tsx` — prompt text is device-aware: "Press E" on fine
  pointers, "Touch it" on coarse pointers. Tap/click still opens the journal.
- `src/world/plants/CannabisPlant.tsx` — scale 1.4 → 1.9 so it reads clearly as
  the interaction target.
- `src/content/plants.ts` — `INTERACT_RADIUS` 3.2 → 4 to match the bigger plant.

### Not added (deliberately)
Backend, auth, AI, inventory, quests, achievements, shop, weather, save system,
database, post-processing, dynamic shadow maps, imported models or packs.

## Main character model — 2026-08-15
- Replaced the primitive garden-keeper avatar with the user-uploaded rigged
  GLB character, served from CDN and animated with its own Walking clip.

## Character idle pose fix — 2026-08-16
The GLB ships only two animation clips: `Walking` and `Running`. There is no
Idle clip. `CharacterAvatar.tsx` used to fade the walk weight to 0 when the
player stopped, which left the rig in its unposed bind/T-pose.

- `src/world/CharacterAvatar.tsx` — `Walking` now stays at full weight forever.
  Movement drives `timeScale` instead: it eases to 0 on stop and the action
  settles onto the clip's passing pose (`NEUTRAL_FRACTION = 0.4516` of the
  1.033 s clip, the frame where the leg bones are closest together), then eases
  back up when input resumes. The gentle idle bob is unchanged.

Limitation: the standing pose is a frozen walk frame, not a real idle
animation. A proper Idle clip would need a new asset. `Running` stays unused.

## 2026-08-16 — Nostr Phase 1 (read-only diaries in the garden)

### Added
- `src/nostr/*` — relay list, pooled queries, browser cache, NIP-07 sign-in,
  npub sign-in, profile and diary fetching, Weedoshi plant catalog.
- `src/garden/*` — plant categorisation, semantic zones, model fallback,
  diary-to-world mapping.
- `src/state/useNostrStore.ts`, `src/ui/NostrSignIn.tsx`,
  `src/world/GardenPlants.tsx`, `src/world/plants/GenericPlants.tsx`.

### Changed
- Header sign-in button is now functional.
- `Player.tsx` focuses the nearest plant in range instead of only the demo one.
- `Journal.tsx` renders diary entries (date, phase, photo, text) when the
  focused plant comes from Nostr.

## 2026-08-16 — Cottage replaces the demo cannabis plant

- Added `src/world/Cottage.tsx`: static uploaded GLB (Draco+WebP compressed, 117 MB -> 6.3 MB) placed at [6, 0, -4], auto-scaled to ~5.5 units and grounded via a bounding box.
- Removed the demo cannabis plant, its proximity trigger, `src/content/plants.ts`, and `src/ui/InteractPrompt.tsx` (prompt UI).
- Journal now only renders for Nostr diary plants; the "E" open shortcut moved into `Journal.tsx`.
- Cottage is scenery only: no interaction or UI attached.

## 2026-08-16 — New player character GLB

- `src/world/CharacterAvatar.tsx` now loads `src/assets/character.glb.asset.json`
  (uploaded Meshy merged-animation rig) instead of the village-boy GLB.
- Height is measured from the model bounds and normalised to 1.9 world units,
  replacing the hard-coded 1.08 scale factor.
- Movement, camera, controls, speed and third-person behaviour unchanged; the
  new clips are still named `Walking` / `Running`, so the frozen-walk idle keeps working.

## 2026-08-16 — Uploaded tree replaces background trees

- Added `src/world/Trees.tsx`: the uploaded canopy GLB (59 MB -> 464 KB via simplify + WebP + Draco),
  normalised to ~6.2 units and drawn as ONE instanced mesh (26 boundary trees + 3 plaza trees).
- Removed the low-poly `Tree` component from `Plaza.tsx` and the icosahedron hedge ring from `Ground.tsx`.

## 2026-08-16 — Alpha owner login (nsec) + reachable Save Garden

- Added `src/nostr/signers/local.ts`: in-memory nsec signer. The key is decoded
  with nostr-tools, held in module scope for the tab only, zeroed on sign-out,
  and never written to IndexedDB, localStorage, Zustand, events, URLs or logs.
- `AuthMethod` gained `nsec`; `getSigner()` returns the local signer only while
  it is unlocked. npub sessions stay read-only.
- `useNostrStore.signInWithNsec()` derives the pubkey and persists the session
  as a read-only npub session, so a refresh drops write access by design.
- New `src/ui/SaveGarden.tsx`: owner-only Save Garden control with
  unsaved / saving / saved / error states, wired to `useGardenStore.save()`.
- New `src/nostr/endpoints.ts`: future `wss://relay.wondersland.online` (listed
  but disabled) and `https://blossom.wondersland.online` (config point only, no
  upload code). Existing multi-relay defaults unchanged.


## Cottage = Indoor Plants hub (user-authorized, 2026-08-18)

The cottage is now an interaction target, not just scenery. `useWorldStore`
gained a generic `target` (`{kind:"plant"|"cottage"}`) plus `indoorOpen`;
`Player.tsx` resolves proximity each frame and lets the cottage win over nearby
plants (`COTTAGE_INTERACT_RADIUS = 5`, exported from `Cottage.tsx`).
`src/ui/InteractionPrompt.tsx` is one shared prompt for desktop ("Press E ·
Indoor Plants") and coarse pointers ("Open Indoor Plants"); it is also the E
handler for the cottage. `src/ui/IndoorGarden.tsx` is a DOM overlay listing only
diaries whose `categorizePlant(...)` is `indoor`, read from the diaries already
in `useNostrStore` — no new fetching, no new event kind, nothing inside
`useFrame`. Cards open a detail view reusing the Journal's visual language;
Esc steps back from a diary and then closes the overlay. Movement, camera and
avatar animation freeze on `journalOpen || indoorOpen`.

Limitation: the headless walk-to-cottage test could not be driven reliably in
this environment (synthetic key events did not move the avatar far enough), so
the desktop/mobile approach was verified by code path and typecheck rather than
by a full automated run.

## Authenticated dashboard redesign + Grow Feed (2026-08-21)

Signed-in `/` now renders a two-column app shell (compact Grow Feed left ~30%,
garden dashboard right ~70%); the signed-out marketing landing is untouched.

- Added `src/nostr/feed.ts` — read-only kind-1 community feed by grow hashtags
  plus batched kind-0 author metadata. Protocol code only; no UI, no Three.
- Added `src/state/useFeedStore.ts` (loading / ready / empty / error states,
  manual retry).
- Added `src/ui/GrowFeed.tsx` — scrollable feed panel, expand/maximize into a
  full-page view with a clear return, post cards (avatar, display name,
  shortened npub, timestamp, text, media thumbnail) and a Like / Zap / Reply /
  Repost row rendered as disabled placeholders.
- Added `src/progression/growth.ts` — pure, deterministic Garden Growth derived
  from diaries (species, active days, completed grows; entry volume capped to
  resist spam) plus a gentle `nextStep()` suggestion.
- Rewrote `src/ui/HomeDashboard.tsx`: sticky header with brand, centered nav
  (Garden / Diaries / Missions / Community) and the existing user pill; hero
  card ("Enter Garden" + "+ New Diary", Gardener level chip, reused
  `world-preview.png` art); Garden growth / Latest diary / Next step cards; wide
  Garden Status card (zones, relay + feed status, layout sync, Manage Garden).
- Mobile/tablet collapses to garden hero first, then the full-width feed.

Pending Nostr work: reactions (kind 7), replies, reposts (kind 6) and zaps
(NIP-57) are UI-only placeholders — no write path exists for them yet.

## Publish-ready diaries flow (2026-08-24)

- Added `src/ui/PublishUnlock.tsx` and `unlockWithNsec` / `unlockWithExtension`
  in `src/state/useNostrStore.ts` — upgrade the current read-only session to a
  writable one, with an explicit pubkey-mismatch guard. Nothing new is persisted.
- `HomeDashboard`: `+ New diary` CTA on the Diaries tab, pending-intent replay
  after unlock, auto-open the reader after a successful create, and a transient
  "Published to Nostr" toast.
- `DiaryComposer`: labelled mobile-friendly fields, larger tap targets,
  scrollable sheet, `onPublished` callback, draft retained on relay failure, and
  the paste-image-URL copy removed ahead of Blossom.
- `DiaryDetail`: read-only sessions get an `Unlock publishing` action instead of
  a dead-end note.
