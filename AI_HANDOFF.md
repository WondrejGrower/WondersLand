# AI_HANDOFF.md

Read this first if you are an AI agent picking up WondersLand.

## Read order

1. `AGENTS.md` — the rules. They override your defaults.
2. `PROJECT_STATE.md` — what is real right now.
3. `ROADMAP.md` — the only allowed next step.

## The one-sentence brief

WondersLand is a cozy browser 3D botanical world where a visitor walks around,
approaches one cannabis plant, and reads its journal — nothing more.

## Planned file layout (Milestone 1)

```text
src/
  routes/
    index.tsx            landing + client-only mount of the world
  world/                 everything inside <Canvas>
    World.tsx            scene root: lights, sky, ground, plant, player
    Ground.tsx
    Sky.tsx
    Player.tsx           movement + camera rig
    plants/
      CannabisPlant.tsx  procedural geometry + sway
    palette.ts           shared 3D colors
  ui/                    everything outside <Canvas>
    LandingScreen.tsx
    InteractPrompt.tsx
    Journal.tsx
  state/
    useWorldStore.ts     zustand: entered, focusedPlantId, journalOpen
  content/
    plants.ts            static typed journal content
```

Nothing outside this tree gets created in Milestone 1.

Since then the authorized additions are `src/world/Avatar.tsx` (garden-keeper
player model) and `src/world/Plaza.tsx` (entrance arch, path, planted island,
trees, instanced shrubs/flowers, rocks, greenhouse silhouette, fake contact
shadows). `Plaza.tsx` exports `nearPath(x, z, clearance)`; `Ground.tsx` uses it
to keep grass and rocks off the walkable route. Any new scenery goes in
`Plaza.tsx` until it is large enough to split.

2026-08-29 addition: the user-supplied Meshy "Woodland Library Sign" GLB lives
in `src/world/WelcomeSign.tsx` (optimized to 2.6 MB, served as a Lovable CDN
asset). It sits at (2.1, 0, 6.4) beside the spawn path with a circle collider
in `collision.ts`; click/tap sets `aboutOpen` in the world store, which
`src/ui/AboutSign.tsx` renders as the "Welcome to WondersLand" overlay (Esc/X
to close, player frozen while open). This is an explicit user-requested
exception to the no-imported-models rule.


## Store contract

```ts
type WorldState = {
  entered: boolean;
  focusedPlantId: string | null;   // set by proximity check
  journalOpen: boolean;
  enter: () => void;
  setFocusedPlant: (id: string | null) => void;
  openJournal: () => void;
  closeJournal: () => void;
};
```

`focusedPlantId` is written at most on change, never every frame. The
proximity check compares distance in `useFrame` but only calls the setter when
the boolean in/out state flips.

## Traps to avoid

- **SSR crash:** importing `three` or R3F at route module scope. Mount the
  world with `React.lazy` inside a client-only gate.
- **Frame stutter:** allocating vectors in `useFrame`, or driving the camera
  through React state.
- **Scope creep:** an inventory slot "for later", a save hook "just in case",
  a plant registry abstraction for one plant. All banned.
- **Input capture:** while the journal is open, movement keys must be ignored
  and Esc must close the journal, not exit pointer lock silently.
- **Mobile:** the desktop-only pointer-lock path must not block touch users.

## Verification before you claim done

- App loads, no console errors.
- Interaction prompt reads "Press E" on a fine pointer and "Touch it" on a
  coarse pointer (test both viewports).
- Enter → walk → rotate → approach → prompt → E → journal → Esc works end to
  end in a real browser.
- Update `PROJECT_STATE.md` with what changed.

## Character model
The player mesh is an imported rigged GLB loaded with drei `useGLTF` in
`src/world/CharacterAvatar.tsx`; the file lives on the Lovable CDN via
`src/assets/village-boy.glb.asset.json`. The file contains exactly two clips,
`Walking` and `Running` — there is no Idle clip. `Walking` is therefore held at
weight 1 permanently and its `timeScale` is eased by `input.forward/strafe`
inside `useFrame`; on stop it settles on the clip's passing pose
(`NEUTRAL_FRACTION`) so the rig never falls back to its bind/T-pose. Never fade
that weight to 0. No state writes per frame. Do not edit `src/world/Avatar.tsx`
(legacy, unused).

## Nostr / garden data layer
`src/nostr/` is the only place that talks to relays. Event schemas are shared
with Weedoshi — do not change kinds (30078 diaries, 0 profiles, 30000 growmies)
or tag names, or the two apps stop reading each other's data. Phase 1 is
read-only: no signing beyond `getPublicKey`, no nsec handling, ever.

`src/garden/` is pure mapping: diary -> category -> zone slot -> model. Zones
live in `zones.ts`; add a dedicated model by registering its slug in
`models.ts` and rendering it in `GardenPlants.tsx`. Plant placement is computed
once when diaries load, never per frame; `Player.tsx` reads the plant list with
`useNostrStore.getState()` inside `useFrame` and only writes to the world store
when the focused plant changes.

## Garden persistence
The garden address is permanent: kind 30078, `d = wondersland:garden-config`.
Never version that tag — bump `schema` inside the content and add a step in
`migrateConfig` instead. Ordering is NIP-01 only (`created_at`, then lowest
`id`); `rev` is application metadata and must never decide a winner.

Autosave and publishing are separate on purpose: placement changes only write
the local draft (debounced), and `useGardenStore.save()` is the single place a
signer is invoked, so the extension never prompts on its own. A failed publish
keeps the draft. Only `src/nostr/signers/` may touch key material, and only via
NIP-07 — npub sessions are read-only and `canEdit` is false.

## Key material rules (alpha)
`src/nostr/signers/local.ts` is the ONLY module that may hold a private key.
It stores the decoded bytes in module scope, exposes `unlockLocalSigner`,
`clearLocalSigner` and `signWithLocalKey`, and must never gain a persistence
path (no storage helpers, no store fields, no logging, no event tags). Session
records written to storage always downgrade `nsec` to `npub`, so refresh means
read-only until the owner unlocks again. Write capability is derived solely
from `getSigner(method)`; UI must never infer it from the auth method string.

Future endpoints live in `src/nostr/endpoints.ts`. Keep the WondersLand relay
opt-in (`WONDERSLAND_RELAY_ENABLED`) and never make it the only relay; Blossom
is a constant only until an upload milestone is approved.


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


## World collision (2026-08-20)

Rules to preserve:
- Physical colliders live only in `src/world/collision.ts`. Interaction radii
  (`COTTAGE_INTERACT_RADIUS`, plant reach in `Player.tsx`) are separate and must
  always stay larger than the matching collider.
- Any new scattered scenery must get its positions from `src/world/layout.ts`,
  not from a private `rng` inside a render component.
- `resolveMove` is allocation free and must stay that way; it is called once per
  frame from `Player.tsx`.
- Decorative clutter (grass, blooms, pebbles) stays non-colliding for mobile
  performance. Keep the collider count in the low tens.
- Camera collision is intentionally not implemented.


## Input channels (2026-08-21)

Rules to preserve:
- `src/state/input.ts` owns two private channels: keyboard and touch.
  `input.forward` / `input.strafe` are getters returning the clamped sum. Never
  assign to them; use `setKeyboardAxes`, `setTouchAxes`, `clearKeyboardInput`,
  `clearTouchInput` (or `resetInput`).
- A keyboard reset must never clear touch state, and vice versa — this is what
  keeps the mobile joystick alive when the page loses focus.
- `keyup` must stay on the capture phase (`window.addEventListener("keyup", up,
  true)`) so no overlay can swallow it, and `keydown` must ignore `e.repeat`.
- Held keys are dropped on `blur`, `pagehide` and `visibilitychange !== visible`
  to recover from missed keyups (alt-tab, tab suspend, browser chrome focus).

## P2 done — diary write path

Write path lives only in `src/nostr/writeDiaries.ts` (no React/Three imports).
Never change the event shape: it must keep parsing through `parseDiary` in
`src/nostr/diaries.ts` so Weedoshi keeps reading the same events. UI entry point
is `src/ui/DiaryComposer.tsx`. Next phase per plan: P3 routes (`/garden`,
`/diaries`, `/diary/:id`) — planned for Codex/GitHub, not Lovable.

## Dashboard + feed rules (2026-08-21)

- `src/nostr/feed.ts` is the only relay access for the community feed; UI reads
  it through `useFeedStore`. Never call it from `useFrame`.
- `src/progression/growth.ts` must stay pure (no React/Three/network) and must
  remain derived from diaries — never persist growth into GardenConfig.
- Feed interaction buttons stay disabled until real Nostr events are
  implemented; do not fake local-only likes.
- Signed-out `LandingScreen` is out of scope for dashboard changes.

## Identity rules (2026-08-21)

- Key material may only exist inside `src/nostr/signers/local.ts`. Never move a
  generated nsec into Zustand, storage, GardenConfig, an event, a URL or a log.
- `restore()` must never overwrite a live session; nsec sessions persist as
  read-only `npub` on purpose.
- The key-backup panel is one-shot per tab; `forgetFreshNsec()` clears it.
- Adding NIP-46 (bunker) is the right next step for durable write sessions.


## Feed modes (2026-08-22)

- `src/nostr/feed.ts` owns both feeds. `fetchFeedPage(mode, limit, until)` is
  the only entry point; `fetchFeed()` is a thin grow-mode wrapper.
- Grow mode filters by `#t` at the relay AND re-validates locally with
  `isRelevantGrowNote()` — relays return tag spam, so never drop that gate.
  Tune the thresholds there, do not add a second filter in the UI.
- Nostr mode is deliberately unfiltered by topic; it is "what the enabled
  relays show", not all of Nostr.
- Pagination is `until: oldestCreatedAt - 1`; `useFeedStore` dedupes by event id
  and marks a lane exhausted when the cursor stops moving.
- `useFeedStore` has one lane per mode. Never collapse them back into a single
  posts array — switching modes must not refetch cached data.
- Feed interaction buttons stay disabled until NIP-25/NIP-10/NIP-18/NIP-57 are
  implemented.

## Mobile polish (2026-08-24)

The signed-in dashboard is verified overflow-free at 375/390/430px. The fix is
structural: every grid/flex wrapper in `HomeDashboard.tsx` and `GrowFeed.tsx`
carries `min-w-0` so truncating text cannot inflate a track. Mobile nav is a
4-column grid; feed action buttons are icon-only below 380px and stay inert
placeholders (NIP-25/10/18/57 still unimplemented). Secondary cream opacities
were raised one step for contrast. Desktop/tablet composition is unchanged.

## Diary reader (2026-08-24)

Diaries are readable without write access. `DiaryDetail.tsx` renders one diary;
opening it calls `fetchDiaryEntries()` in `src/nostr/diaryEntries.ts`, which
queries the referenced kind:1 note ids on the enabled relays and returns full
text + media (previews on the item ref are the fallback). Entries stay kind:1
notes referenced by the kind:30078 diary — nothing was migrated into the diary
event and Weedoshi compatibility (`d: diary-<id>`, `t: weedoshi-diary`, e-tags)
is untouched. Reader state is local dashboard state (`openDiaryId`), no new
route. Writable sessions get `+ Add entry` / `Edit diary` via `DiaryComposer`.
Limitation: entry fetching is one query per open with a 7s timeout and no cache,
and media still comes from URLs inside the note (Blossom upload is not wired).

## Hide diary (2026-08-24)

Hiding a diary is a client-only presentation preference. `src/state/useHiddenDiaries.ts`
keeps an array of diary ids per pubkey, persisted with the existing storage helper
(`getJson`/`setJson`, IndexedDB with a localStorage fallback) under
`wl:hidden-diaries:<pubkey>`. Nothing is published: no tombstone, no `hidden`
flag, no change to the kind:30078 diary or its kind:1 entries, and the `Diary`
type is untouched. Hidden ids are cleared from memory on sign-out but stay on
disk for that pubkey.

Filtering happens in `HomeDashboard.tsx` only: the visible list, Latest diary,
Garden growth/Gardener level, missions/next step and the stale-diary count all
read the filtered array, while `all` (unfiltered) still backs the reader so a
hidden diary remains openable. `DiaryDetail` shows a subtle `Hide diary` action
with an inline confirmation stating the diary is hidden only in WondersLand on
this device and is not deleted from Nostr; hidden diaries show `Restore diary`
instead. The Diaries tab gets a `Hidden diaries (n)` toggle listing hidden cards
with per-card restore. Hiding the open diary returns to the diaries list.
Limitation: the preference is per browser/device and does not sync between
devices, by design.

## Publish-ready diaries flow (2026-08-24)

Read-only → writable happens without a new session. `useNostrStore` gained
`unlockWithNsec` and `unlockWithExtension`: both derive the pubkey, compare it
to the pubkey already signed in and throw a clear mismatch error instead of
silently switching identity. On success they only flip `method` to `nsec` /
`nip07`; the persisted session record stays the read-only npub, so a refresh
still drops write access by design. The private key never leaves the in-memory
module `src/nostr/signers/local.ts` — it is not written to IndexedDB,
localStorage, Zustand or any log.

`src/ui/PublishUnlock.tsx` is the small modal for this. Every publishing intent
in `HomeDashboard` goes through `requestComposer(mode)`: writable sessions open
`DiaryComposer` directly, read-only sessions store the intent in
`pendingIntent`, open the unlock modal and replay the exact intent (new diary,
or add-entry for that same diary) once unlocked.

`DiaryComposer` now reports success through `onPublished(diary, kind)`, fired
only after `writeDiaries` confirmed at least one relay accepted the event. The
dashboard then opens that diary's reader and shows a transient
"Published to Nostr" toast. On failure the composer keeps the draft and shows a
plain-language error — no relay, no success. The Diaries tab has a prominent
`+ New diary` CTA with `Hidden diaries (n)` kept secondary. Entry composing is
text + optional phase only; the paste-an-image-URL copy was removed ahead of
Blossom.

Limitations: no media upload yet, entries are still refetched per reader open,
and the unlock is per tab.

Composer pickers live in `src/ui/DiaryFields.tsx` and are UI-only. They reuse
`plantCatalogData` and `categorizePlant`; do not introduce a second catalog.
Recent cultivar/breeder suggestions are derived at render time from
`useNostrStore().diaries` — nothing is persisted for them. Mission completion
feedback is a 10s transient state in `HomeDashboard`, set when a create publish
succeeds while the visible diary list was empty; it is not a stored flag.

Limitations: no media upload, plant picker lists the first 24 matches, and the
mission acknowledgement is per session.

Blossom: `src/nostr/blossom.ts` is the only place that talks to the media
server, and `uploadMedia` is the only seam the UI uses. Do not add media fields
to the diary schema — the image URL lives in the kind:1 note text on purpose.
Limitations: one image per entry, no compression/crop, no list/delete/mirror, no
NIP-94, no server picker, and `blossom.wondersland.online` did not resolve from
the build environment, so the real endpoint is still unverified end to end.

World layout: edit `src/world/interactables.ts`, never hardcode positions in
scene components. `WORLD_INTERACTABLES` drives rendering anchors, proximity
selection in `Player.tsx`, prompts in `InteractionPrompt.tsx`, the focus ring
and the collider list in `collision.ts`; `nearInteractable` keeps decorations
clear. Adding an interactable = one entry there plus a `WorldAction` handler.

The world→UI boundary is still `useWorldStore` only: `target` (`plant`/`world`),
`aboutOpen`, `indoorOpen`, `comingSoon`. Overlays freeze player input.

Limitations: portals are placeholders (no destination), grow beds are decorative
(plants still render from the garden store), and headless verification of the
walk-to-house flow is unreliable because the sandbox WebGL context is lost on
long sessions — validate movement changes with a small math simulation or in a
real browser.
