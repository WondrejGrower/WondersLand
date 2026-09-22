# PROJECT_STATE.md

Snapshot of what actually exists. Update this with every change.

**Last updated:** 2026-09-21 (layout editor camera stabilization)
**Current phase:** Milestone 1 implemented and verified in a browser.

## Built and working

The full minimal loop runs end to end: land → enter → walk → look → approach →
prompt → read journal → close.

- **Landing screen** (`src/ui/LandingScreen.tsx`): title, one line of
  description, "Enter WondersLand" button, short controls hint. Sets
  `entered: true`.
- **The world** (`src/world/World.tsx`): one `<Canvas>`, gradient sky sphere
  (`Sky.tsx`), fog, hemisphere + directional light, circular ground with a
  darker boundary ring, an instanced hedge ring, instanced grass tufts and
  rocks (`Ground.tsx`). Garden radius 19 units; the player is clamped to it.
- **The avatar** (`src/world/Avatar.tsx`): the capsule placeholder is gone. A
  code-native low-poly garden keeper built from boxes, cylinders, cones and
  spheres — slightly oversized head, layered spiky black hair, large dark eyes,
  oversized black tee with a locally drawn `CanvasTexture` "42 / FastBuds"
  chest graphic, black shorts, white striped socks, black-and-white sneakers,
  olive crossbody bag with strap, dark wristwatch. Same height (~1.9) and
  origin as the old capsule. Idle breathing plus an arm/leg walk cycle, driven
  by refs in `useFrame` and blended in only while movement input is non-zero
  and the journal is closed. All its colors live in `palette.ts`.
- **Movement and camera** (`src/world/Player.tsx`): capsule avatar, WASD /
  arrow keys, drag anywhere on the canvas to rotate yaw (mouse and touch, no
  pointer lock), third-person camera with damped follow. Radial clamp only —
  no physics engine.
- **Touch controls** (`src/ui/TouchControls.tsx`): on-screen joystick shown
  only on coarse-pointer devices; drag elsewhere still rotates the camera.
- **World exit switch** (`src/ui/ExitWorldSwitch.tsx`): `C` on desktop or a
  floating "← Nostr" button (top-right, coarse pointers) leaves the world back
  to the Nostr client via `useWorldStore.exit()`. Inert while any overlay is
  open; the dashboard has no `C` shortcut — entering stays on "Enter Garden".
- **The plant** (`src/world/plants/CannabisPlant.tsx`): one procedural
  cannabis plant — soil mound, stem, four nodes of paired seven-leaflet fan
  leaves, a top cola — with a gentle sway driven in `useFrame`.
- **Interaction** (`src/ui/InteractPrompt.tsx`): proximity is measured in
  `useFrame`; the store is written only when the in/out state flips. Prompt
  reads "Cannabis · Press E to read"; E or a tap opens the journal.
- **Journal** (`src/ui/Journal.tsx`): DOM overlay, `role="dialog"`,
  `aria-modal`, labelled by its title, focus moved to the close button, Esc or
  the button closes it. Movement input is zeroed while it is open.
- **Content** (`src/content/plants.ts`): static typed data for the one plant.
- **State** (`src/state/useWorldStore.ts`): `entered`, `focusedPlantId`,
  `target`, `journalOpen`, `indoorOpen`, `aboutOpen`.
- **Welcome sign** (`src/world/WelcomeSign.tsx` + `src/ui/AboutSign.tsx`):
  the uploaded Meshy woodland sign GLB (optimized 81 MB → 2.6 MB, CDN asset)
  stands just off the spawn path at (2.1, 0, 6.4) with a small collider.
  Click/tap opens a "Welcome to WondersLand" overlay explaining the world,
  controls and Nostr identity; Esc / X closes it; the player freezes while open.
  `journalOpen` and their three setters. Nothing else.
- **Per-frame input** (`src/state/input.ts`): a plain mutable object read inside
  `useFrame` — never React state. Keyboard and touch are separate internal
  channels (`setKeyboardAxes` / `setTouchAxes`, `clearKeyboardInput` /
  `clearTouchInput`); `input.forward` / `input.strafe` are clamped getters over
  their sum, so clearing keyboard state on focus loss cannot cancel an active
  joystick.

- **Home (`src/ui/HomeDashboard.tsx`)**: signed-in landing. Derived entirely
  from diaries already in `useNostrStore` and plants in `useGardenStore`;
  `/` picks landing vs Home on `pubkey`. The 3D world is entered from here.
- **SEO/metadata**: route-level `head()` on `/` with title, description and
  Open Graph/Twitter tags; Fraunces/Karla loaded via a `<link>` in the root
  route.

## Performance notes

- The 3D module is `React.lazy` behind `<ClientOnly>`, so the landing screen
  paints without Three.js.
- Grass, rocks and hedge are three `InstancedMesh` draw calls; matrices are
  computed once in `useMemo` with a deterministic PRNG.
- No allocations inside `useFrame` — all vectors are module-scope scratch
  objects. No `setState` per frame. No post-processing, no shadows maps.
- `dpr` capped at 1.75.

## Verified

- `tsgo --noEmit` and `vite build --mode development` both clean.
- Headless Chromium run: enter → rotate → walk → prompt appears → E opens the
  journal → Esc closes it. No console errors or React warnings. (Only a
  Three.js internal `THREE.Clock` deprecation notice and swiftshader GPU
  messages from the headless test environment.)

## Known limitations

- Only one plant exists; the journal is hard-wired to it.
- Camera pitch is fixed; only yaw rotates.
- Collision is a circular clamp — the player can walk through the plant mesh.
- No audio, no day/night, no save state — all deliberately out of scope.
- Two small additions beyond the file list in `AI_HANDOFF.md`, both required by
  Milestone 1: `src/state/input.ts` (per-frame input refs) and
  `src/ui/TouchControls.tsx` (mobile joystick), plus
  `src/world/three-jsx.d.ts` for R3F JSX typings.

## Milestone 1 visual identity polish (user-authorized, avatar only)

Replaced the player capsule with the stylized garden-keeper avatar described
above. Deliberate simplifications: no fingers, no facial features beyond eyes,
the bag is a single box with a clasp, sneaker detail is two stacked boxes, and
the chest graphic is a flat generated texture on one front quad rather than
extruded lettering. Nothing else in the scene changed.

## Entrance plaza (user-authorized environment pass, 2026-08-12)

`src/world/Plaza.tsx` adds the first real environment: a WondersLand entrance
arch with a locally drawn sign texture, a short curved path from the arch past
a central planted island to the cannabis plant, three low-poly trees, instanced
shrubs/flowers/rocks kept clear of the path, a distant greenhouse silhouette,
and flat translucent contact-shadow discs. Grass and rocks in `Ground.tsx` now
respect a path-clearance radius. The cannabis plant is larger (scale 1.9,
interact radius 4) so it reads as the interaction target. The prompt says
"Press E" on fine pointers and "Touch it" on coarse pointers.

Verified in headless Chromium at 1280x800 and 390x780: enter, drag-rotate,
walk, prompt appears with the right wording per device, click/tap opens the
journal, Esc and the close button dismiss it, zero console errors.

Known issues: no collision — the player can walk through the flower bed, trees
and the greenhouse; the path is a strip of overlapping quads so its edges are
visibly jagged (stylized, acceptable for now); the greenhouse is scenery only
and cannot be entered.

## Next step

Milestone 1 plus the entrance plaza are complete. The exact next step, when
authorized: simple soft collision (radial push-out) around the planted island,
trees and the greenhouse so the plaza feels solid. Nothing else in "Later" may
be started without a new roadmap entry.

## Main character model (user-authorized, 2026-08-15)

The player is now the uploaded rigged GLB character ("Village Boy Qing",
Meshy AI), not the code-built primitive avatar. This is a deliberate scope
change by the user: imported 3D models were previously banned.

- `src/world/CharacterAvatar.tsx`: loads the model via drei `useGLTF` from a
  CDN asset pointer (`src/assets/village-boy.glb.asset.json`, ~11 MB, mesh +
  `Walking` + `Running` clips), plays `Walking` with a weight blended in/out
  by movement input, adds a small idle bob. Scaled 1.08 so the ~1.76 native
  height matches the old ~1.9 gameplay height; origin stays at the feet.
- `src/world/Player.tsx` renders `<CharacterAvatar />` instead of `<Avatar />`.
  Controls, camera, contact shadow, proximity logic unchanged.
- `src/world/Avatar.tsx` is untouched but no longer used.

Verified in headless Chromium: enter → walk → walk cycle animates, no console
errors. Limitations: no idle clip in the file (standing uses the bind pose plus
a bob), the `Running` clip is unused, and the model is a large download that is
only fetched after the landing screen.

## Landing page redesign (user-authorized, 2026-08-16)

`src/ui/LandingScreen.tsx` is now the WondersLand front door, matching the
supplied reference: dark forest shell with nav (Explore / Gardens / How it
works / Sign in with Nostr — visual only), hero ("Step Into Your Living
Garden") with the lightweight-scene-loading badge, a generated static
illustration of the floating garden island (`src/assets/world-preview.png`)
instead of a second Three.js scene, three destination cards (My Garden is the
only functional one and calls `enter()`; Plaza and Visit a Friend show
"Coming soon"), three informational feature panels and a footer strip.
New landing color tokens (`--forest`, `--forest-deep`, `--forest-soft`,
`--leaf`, `--cream`, `--sand`, `--plum`, `--bark`) live in `src/styles.css`.

The 3D world is untouched and still `React.lazy` behind `<ClientOnly>`, so
Three.js and the character GLB load only after My Garden is clicked. Verified
headless at 1280x1800 and 390x844: no console errors, no horizontal overflow,
My Garden click mounts the canvas.

## Character idle pose fix (2026-08-16)

Clip inventory of `village-boy.glb`: `Walking`, `Running` — **no Idle clip**.

The character no longer snaps to its bind/T-pose when movement stops. Instead
of fading the walk out to weight 0, `CharacterAvatar.tsx` keeps `Walking` at
full weight and eases its `timeScale` to 0, settling on the clip's passing pose
(legs together) as a stand-in idle stance. Starting to move eases the speed
back up from that frame, so there is no pop.

Verified in headless Chromium: enter → walk → stop holds a natural standing
pose; no console errors (only the Three.js `THREE.Clock` deprecation notice and
swiftshader GPU messages).

Limitation: this is a frozen walk frame, not a true idle animation — arms rest
slightly away from the body. A real idle would require a new animation asset.

## Nostr integration — Phase 1, read-only (2026-08-16)

WondersLand can now sign in with a Nostr identity and grow the visitor's
existing Weedoshi diaries as plants in the world. Read-only: nothing is
published, and no private key is ever requested, held or stored.

New layers:
- `src/nostr/` — relays, a timeout-bounded SimplePool query helper, an
  IndexedDB/localStorage cache, NIP-07 signer detection, profile (kind 0) and
  diary (kind 30078) fetching, plus the plant catalog ported from Weedoshi.
  Diary tag/content parsing matches Weedoshi byte for byte, so both apps read
  the same events.
- `src/garden/` — categorises each diary (cannabis, vegetable, herb, fruit,
  indoor, other) plus an independent growth stage (germination, seedling,
  vegetative, flowering, harvested, unknown), assigns it to a semantic zone (open garden, raised beds,
  orchard, greenhouse, house) and resolves a model: the dedicated cannabis
  model when the species has one, otherwise a generic representative for the
  category, flagged as a stand-in.
- `src/state/useNostrStore.ts` — identity, profile, diaries, mapped plants.
- `src/ui/NostrSignIn.tsx` — extension sign-in or pasted npub, in the header.
- `src/world/GardenPlants.tsx` + `plants/GenericPlants.tsx` — the mapped plants
  in the scene, sharing one set of geometries and materials.

`Player.tsx` now focuses the nearest plant in range (diary plants or the
original demo cannabis) and `Journal.tsx` shows that diary's entries, with
images pulled from the referenced kind-1 notes.

Verified headless: sign-in with an npub fetches the profile from live relays
and renders it in the header; zone mapping checked against six sample diaries.

Limitations: no publishing, no growmies/social view, no relay-management UI
(relays are configurable in code and cached), and only cannabis has a dedicated
3D model — everything else uses a stand-in.

### Cottage (2026-08-16)
The demo cannabis plant and its journal/prompt are gone. A static cottage GLB
(`src/assets/cottage.glb.asset.json`) stands where it was, rendered by
`src/world/Cottage.tsx` with no interaction. Proximity focus and the journal now
serve only Nostr garden plants; "Press E" is handled inside `Journal.tsx`.

### Per-user gardens on Nostr (2026-08-16)
Garden layout is now persisted per pubkey as a NIP-78 addressable event
(kind 30078, permanent `d` tag `wondersland:garden-config`) — no backend, no
database. `src/garden/` holds the data model (`config.ts`), validation and
clamping (`validate.ts`), migrations (`migrate.ts`) and deterministic default
placement (`defaults.ts`). `src/nostr/garden.ts` is the transport: fetch,
NIP-01 addressable ordering (newest `created_at`, lowest `id` breaks a tie),
event building and multi-relay publish. `src/state/useGardenStore.ts` owns
config, plants, sync status and conflicts; `useNostrStore` now only handles
identity and diaries and hands them over.

Lifecycle: cached config renders instantly, relays reconcile in the background,
edits autosave to a local draft (`garden:<pubkey>:draft`, with base event id /
created_at / rev for provenance) and are only signed on an explicit save.
Signing lives behind the `Signer` interface in `src/nostr/signers/` — nsec is
never read or stored.

Limitations: no editing UI yet, so nothing marks the draft dirty in the running
app and the save path is only reachable programmatically; conflict resolution
is whole-config (mine/theirs), not per-plant.

### Alpha owner sessions (2026-08-16)
Sign-in now offers three paths: NIP-07 extension, npub/nprofile (read-only) and
an "Advanced" nsec unlock for alpha owner testing. The nsec signer keeps the key
in memory only for the current tab; nothing persists it and a refresh downgrades
the session to read-only. A small owner-only "Save Garden" control next to the
sign-in button exposes `useGardenStore.save()` so a first signed publish and
restore can be tested; there is still no 3D editing UI.

Security limitation (alpha): pasting an nsec into a web page is inherently
weaker than an extension or NIP-46 signer — it is exposed to the page's JS for
the session. This option is for the project owner during alpha only and should
be replaced by NIP-46 before any public use.

Planned infrastructure (not deployed, not enabled): the WondersLand relay
`wss://relay.wondersland.online` is listed in the relay set but disabled until
reachable, and `https://blossom.wondersland.online` exists only as a constant in
`src/nostr/endpoints.ts` — no media upload code exists.


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


## World collision (user-authorized, 2026-08-20)

Movement is ground based, so collision is 2D on the XZ plane — no physics
engine, no BVH, no per-triangle tests.

- `src/world/layout.ts` is the single deterministic layout source. It owns the
  seeded `rng`, `GRASS_INSTANCES`, `ROCK_INSTANCES` and `TREE_INSTANCES`.
  `Ground.tsx` and `Trees.tsx` build their instance matrices from it, and
  `collision.ts` derives colliders from the same arrays, so a rendered trunk and
  its collider cannot drift apart.
- `src/world/collision.ts` owns `PLAYER_RADIUS = 0.42`, the `Collider` union
  (circle | rotated box), the static `WORLD_COLLIDERS` list, the allocation-free
  `resolveMove(...)`, and a dev-only `assertSpawnClear(...)`.
- Solid: cottage (OBB), greenhouse (OBB), central garden island (circle),
  both entrance arch posts, the four framing rocks, scattered rocks with
  scale >= 0.8, every tree trunk (radius 0.45 x scale), and each diary plant
  (radius 0.45, rebuilt in a memo when the plant list changes — never in
  `useFrame`).
- Non-colliding: grass tufts, blooms, shrubs, small pebbles, path quads and
  contact shadows.
- Resolution: clamp to the existing garden radius, then push the candidate
  position out along the shortest surface normal over two relaxation passes.
  The surviving tangential component is the slide.
- Physical colliders stay smaller than the interaction radii, so the cottage
  (`COTTAGE_INTERACT_RADIUS = 5` vs a ~3.4/2.8 half-extent box) and plants can
  still be interacted with from outside their mesh.
- No camera collision in this pass.

## Diary write path (P2, 2026-08-21)

`src/nostr/writeDiaries.ts` publishes Weedoshi-compatible diaries: kind 30078,
`d: diary-<id>`, `t: weedoshi-diary`, content JSON with `items[]` plus `e` tags;
entries are kind 1 notes referenced from the diary. `src/ui/DiaryComposer.tsx`
drives it from the Home dashboard (`+ New diary`, per-card `Update`), hidden for
read-only `npub` sessions. Optimistic merge via `useNostrStore.upsertDiary`.
Media upload is a stub; no automated round-trip test yet.

## Signed-in dashboard shell (2026-08-21)

`HomeDashboard` is the signed-in `/`: sticky brand header, centered section nav
(Garden / Diaries / Missions / Community — local state, not routes yet), compact
`GrowFeed` on the left (~30% on desktop, expandable to a full-page grid) and the
garden dashboard on the right (~70%). Growth numbers come from
`src/progression/growth.ts`, which is pure and derived from the canonical
diaries — GardenConfig stays the physical layout only. The feed is read-only:
social interactions are disabled placeholders until the corresponding Nostr
write paths (kind 7 / kind 6 / NIP-57) exist.

## Sign-up / post-login home (2026-08-21)

`/` is the only route: signed out -> `LandingScreen`, signed in -> `HomeDashboard`,
`Enter Garden` -> 3D world. The route restores the saved session itself and shows
a restore state (after hydration only, so SSR still serves the landing page for
crawlers) instead of flashing signed-out UI.

New growers can create a Nostr identity in-app: `createLocalIdentity()` generates
the keypair with nostr-tools, the key lives in `src/nostr/signers/local.ts` memory
for the tab, and a one-time backup panel shows the nsec with an explicit
confirmation before continuing. Optional display name publishes a kind 0 event.
Limitations: no NIP-46 / no encrypted key storage, so a refresh drops write access
back to read-only until the grower signs in again (extension recommended).


## Feed modes (2026-08-22)

The left dashboard panel has a `Grow | Nostr` switch. Grow = hashtag-filtered
garden posts with a local spam/relevance gate; Nostr = broad kind-1 notes from
the enabled relays with `until`-based pagination. Both lanes are cached
separately in `useFeedStore`; social interactions remain inert placeholders.

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

The Diaries tab now leads with a `+ New diary` CTA (Hidden diaries stays
secondary). Read-only sessions no longer hit dead actions: tapping a publishing
action opens `Unlock publishing` (`src/ui/PublishUnlock.tsx`), which upgrades
the *current* identity via NIP-07 or an in-memory nsec. A key for a different
pubkey is refused with a clear message. After unlocking, the original intent
(new diary, or add-entry on that diary) opens automatically.

Creating a diary opens its reader immediately and shows a transient
"Published to Nostr" acknowledgement; adding an entry keeps the reader open and
refreshes it. Failures keep the draft and show a plain error. Entries are text +
optional phase only until Blossom lands. The Weedoshi format is unchanged:
kind:30078 diary + referenced kind:1 notes, written exactly as before.

Private keys are still memory-only and never persisted; the stored session
remains a read-only npub.

Diary creation is a guided picker rather than a form: plant is chosen from the
existing Weedoshi plant catalog with category shortcuts and search (custom
plants still allowed and still produce `custom:` slugs), phase is a chip set,
and cultivar/breeder offer one-tap suggestions derived from the user's own
diaries. The composer stores exactly the same diary fields as before.

The Mission card surfaces first-diary completion as a transient acknowledgement
computed from the successful publish; progression scoring in
`src/progression/growth.ts` is unchanged apart from the photo wording.

Add entry can now attach one photo. It is uploaded to the configured Blossom
server (`BLOSSOM_BASE_URL`) before the note is published, and the returned URL
is appended to the kind:1 entry text. Nothing about the Weedoshi format
changed: diaries are still kind:30078 with `items[]` + e-tags, and the image is
discovered by the existing `extractImageUrls` path. Uploads are authorized with
a short-lived kind:24242 event signed through the existing signer; private keys
stay memory-only.

## World consolidation (3D MVP)

The 3D world is now organized around one flow: spawn → welcome sign → stone
path → My Garden house (opens the existing Indoor Garden diary panel). Outdoor
raised grow beds sit west of the path, and two clearly placeholder portals
(Plaza, Visit a friend) open a Coming Soon modal.

Layout data (spawn, zones, interactable positions/radii/labels/actions,
colliders, clearance) lives only in `src/world/interactables.ts`. Collisions
stay the lightweight XZ approach. In-range interactables show a contextual
prompt (`Press E` on desktop, `Tap` on touch) plus a pulsing focus ring.

The welcome sign mesh carries no text; all onboarding copy is in the 2D modal.
Nostr auth, diaries, GardenConfig, dashboard/feed, avatar, joystick and camera
are untouched.

Limitations: portals are visual placeholders only, and the sandbox browser
loses its software WebGL context on long sessions, so the walk-to-house flow
was verified by simulating the movement/collision/proximity math rather than by
a full recorded playthrough.

## Garden plant slots (2026-08-31)

The 3D garden now uses a fixed set of six planting spots (`src/garden/slots.ts`,
laid out inside the grow beds). Visible diaries fill the spots in creation
order via `mapDiariesToSlots`; deleted or hidden diaries free their spot
immediately, and `useGardenStore` clears any stale plant target/journal so the
prompt, focus ring and collider disappear with the plant. Unfilled spots render
a subtle "empty spot" marker (soil circle + small stake) instead of random
decorative plants. `useHiddenDiaries` pushes its id list into the garden store.
Limitation: plants reflow to the first free spots after a deletion — there is
no per-diary pinned spot yet.


## Relay & Blossom provenance (2026-09-02)

Every fetched event now carries the relays that served it. `queryWithSources`
in `src/nostr/pool.ts` reads SimplePool's `seenOn` map (the pool runs with
`trackRelays = true`) and returns `{ events, sources }`. Diaries store it as
`Diary.seenOn` (also cached locally), entries as `DiaryEntry.relays`, feed posts
as `FeedPost.relays`. `src/ui/SourceChips.tsx` renders muted host chips for the
relay origin and for the media host (Blossom) derived from image URLs.

Deletion is now honest: `handleDelete` reports "accepted by N of M relays" and
the reader offers "Re-send deletion", which republishes the NIP-09 request and
lists each relay's answer. Relays that refuse deletion keep serving the event —
that is stated in the UI rather than hidden.

Limitations: provenance reflects the last successful fetch only; a diary loaded
from the local cache shows "relay unknown until the next refresh". Media chips
show the URL host, they do not verify the blob exists on that server.


## Nostr interactions (2026-09-03)

- `src/nostr/interactions.ts` — NIP-25 likes (kind 7, `+`) and NIP-10 comments
  (kind 1 with `e` root + `p`), plus `fetchInteractions()` for counts.
- `src/state/useInteractionsStore.ts` — per-note counts/replies, optimistic like
  with rollback, one relay read per note id.
- `src/nostr/clientTag.ts` — NIP-89 `client` tag ("WondersLand") added to every
  event we sign (diaries, entries, deletions, likes, comments); `clientOf()`
  reads the tag of incoming events and `ClientChip` renders "from <client>".
- Grow Feed: Like and Reply are live for writable sessions; read-only npub
  sessions get the existing PublishUnlock sheet. Zap and Repost stay disabled.
- Limitations: no NIP-57 zaps, no NIP-18 reposts, no kind 31990 handler event
  yet (so the client tag uses the bare name form), counts are not live-updated.

## Photo upload servers
Diary entry photos upload over Blossom (BUD-02/BUD-11) to public keyless servers,
tried in order: blossom.primal.net, blossom.band, nostr.download. Configured in
src/nostr/endpoints.ts (BLOSSOM_SERVERS); fallback lives in uploadToAnyServer.
Limitation: one image per entry; upload failure never loses the entry text.

### 2026-09-03 — Grow timer

Each diary now shows a live grow timer (`src/progression/timer.ts`, `useGrowTimer`,
`GrowClock`). It starts at the diary's `createdAt` and stops on a harvest/cure/finished
phase; the world prompt shows the day count only. The diary plant picker is limited to
cannabis types while testing (`CANNABIS_ONLY` in `src/ui/DiaryFields.tsx`); existing
non-cannabis diaries keep displaying their stored plant and free text entry still works.

The grow clock can now be set by the grower: optional `startedAt` / `endedAt` values
ride inside the existing diary content (Weedoshi-compatible, ignored by other clients)
and override the derived start/finish. Diary reads deduplicate copies by normalised
diary id, and every edit rewrites all descriptive fields and bumps `updatedAt`, so a
renamed diary no longer shows its old version. Relays that refuse replacements can
still serve an old copy — the relay chips show which one.

### 2026-09-06 — Grow Lens

The Grow feed is ranked by an open algorithm the user can read and change
(`src/nostr/lens/`, `src/state/useLensStore.ts`, `src/ui/LensPanel.tsx`).
Candidates come from hashtags, the viewer's contact list (kind 3) and authors of
grow diaries (kind 30078); each note is scored by seven signals (grow words, grow
hashtags, freshness, photo, follows, known grower, spam penalty) and filtered by a
minimum score plus a topical gate (a grow hashtag or at least two grow words).
Diversity caps one author at two posts per page. Every post exposes its score
breakdown in the UI and the whole config exports as JSON.

Limitations: scoring runs only over what the enabled relays return within the query
timeout, so recall still depends on relay quality; there is no cross-session learning
and no behavioural data of any kind. The broad "Nostr" feed is unranked on purpose.

## 3D world (2026-09-06)
The garden is deliberately sparse: ground, boundary ring, trees, entrance arch, straight
stone path, greenhouse, shrubs, grow beds, cottage, welcome sign and the diary plants.
No island/fountain, no grass tufts, no pebbles, no framing rocks — rendering and
`collision.ts` were cleaned together so colliders cannot outlive removed geometry.
Exit to the Nostr client: `C` on desktop or the always-visible top-right button.

Limitation: the sandbox software renderer (SwiftShader) loses the WebGL context when a
test script polls `getContext` repeatedly; that is a verification artefact, not app behaviour.

## 2026-09-10 — Security F1 (legacy persisted sessions)

Sessions carry a version marker (`src/nostr/session.ts`, v1). Legacy/unversioned
sessions are invalidated before any relay request and their identity caches are
purged from IndexedDB and the localStorage fallback (`purgeKey` in
`src/nostr/storage.ts`). Covered by `src/nostr/session.test.ts`.
Limitation: this forces a ONE-TIME re-login for all existing users; relay-side
diaries and unrelated local data (relay list, Grow Lens config) are preserved.
Not deployed — pending owner review.

## Garden Board (src/features/tasks)
- `types.ts` schema v1 + sanitizers, `storage.ts` identity-scoped IndexedDB,
  `streaks.ts` derived streaks, `nostr.ts` encrypted transport, `sync.ts`
  debounced offline queue, `useTasksStore.ts` state, `TasksBoard.tsx` overlay.
- Signers gained NIP-44 encrypt/decrypt-to-self (`local.ts`, `nip07.ts`,
  `signers/index.ts`); the outbound secret guard also screens plaintext before
  encryption.
- World: `garden-board` interactable + `GardenBoard.tsx` geometry; overlay state
  `tasksOpen` in `useWorldStore`; prompt action `tasks`.
- Limitation: extensions without NIP-44 stay "Local only" — nothing is published
  in plaintext. Timers are derived from stored transitions, never per-second events.

## 2026-09-17 — CSP fix for the 3D world

The F6 security headers in `src/server.ts` blocked the glTF loaders: texture
blob: reads and the decoder WebAssembly module were refused, so the world hung
on the "Growing the garden…" fallback forever. CSP now allows
`wasm-unsafe-eval` (not `unsafe-eval`), `blob:`/`data:` in connect-src, and the
Google Fonts style/font origins. Everything else is unchanged.

## Garden Board update — Journey precision counter + custom timers (2026-09-18)

- Journey rows now show a live elapsed counter derived from `Date.now() - startedAt`
  (`elapsedLabel` in `src/features/tasks/streaks.ts`): `HH:MM:SS` under a day,
  `Xd HH:MM:SS` after. Ticks locally once a second, publishes nothing per tick.
  Reset still writes a fresh `startedAt` plus a single `streak_reset` log.
- `StreakGoal.createdAt` added; sanitising falls back `startedAt ?? createdAt`
  for legacy records.
- Timer presets are user-editable: `addTimerPreset` / `updateTimerPreset` /
  `removeTimerPreset` in `useTasksStore`, persisted through the same local-first
  snapshot and encrypted kind 30078 sync. Duration bounded to 12 h
  (`MAX_TIMER_SECONDS`). Deleting a preset stops its running timer after a confirm.
- `sanitizeBoard` no longer reseeds Focus/Break when the stored list is an empty
  array — defaults only apply to a board with no timers field at all.

## 3D world performance (2026-09-18)

- Cannabis plants are baked: leaflets merge into two module-level geometries,
  so one plant is 4 meshes sharing 5 GPU resources (was ~60 meshes, each with
  its own inline geometry and material). Do not go back to per-leaflet JSX.
- Generic plants use MeshLambertMaterial; the scene has no PBR lighting.
- `World.tsx` picks DPR/MSAA from `(pointer: coarse)`: phones get dpr [1,1.25]
  and no antialias, desktop keeps [1,1.5] + antialias.

## Click-to-move, World Settings, Garden Board model (2026-09-18)

- Movement is split into input → controller. `src/world/controller/CharacterController.ts`
  owns position, yaw, zoom, path and pending interaction (module singleton, no
  React state per frame). `src/world/input/WorldPointerInput.tsx` turns clicks/taps
  into `moveTo` or `requestInteract`; `Player.tsx` keeps WASD via `moveDirection`
  and follows the path. Default mode is `hybrid` (both work).
- Pointer rules: drag threshold 10 px separates tap from camera drag; right/middle
  mouse and pinch/wheel only move the camera; a tap within 0.7 units just stops.
- Interactions are generic (`src/world/interactions.ts`): every interactable has an
  `interactionPoint` + `interactionRadius`; in range it runs immediately, otherwise
  it walks there when `autoInteract` is on, else shows "Move closer".
  Objects are picked by a `userData.interactable` tag walked up the hierarchy,
  so tall meshes (board, sign, house, portals, plants) hit correctly.
- `src/state/useWorldSettingsStore.ts` is a versioned, local-only (localStorage)
  device settings store — never synced to Nostr. UI in `src/ui/WorldSettings.tsx`
  (Controls, Camera, Graphics, Interface, Accessibility, World/Recovery), opened
  from the gear pill under the "← Nostr" button. Opening it freezes the world.
- Camera: follows automatically, arrow keys / drag rotate and it recenters after
  ~2.5 s. Key state is released on blur/visibility change and Esc stops the avatar
  (this fixed the "stuck walking forward" bug). The stone-tile path model is gone.
- Garden Board uses the uploaded GLB (`garden-board.glb.asset.json`) normalised to
  1.1 m with two procedural legs.
- NavMesh is DEFERRED. `src/world/nav/path.ts` is a direct-line planner with one
  sidestep waypoint; replacing `planPath` with a real nav query needs no changes
  to input or controller code.
- Avatar animation reads the controller's actual per-frame locomotion state,
  so the existing walk clip runs for tap/click paths as well as WASD/joystick
  and returns to the neutral pose after reaching the destination.

### Garden Board completion pass
- Habits support `cadence: daily | weekly` end to end. Weekly progress
  ("3 / 4 this week") and weekly streaks are derived from activity logs only
  (`weeklyProgress` / `weeklyStreak` in `src/features/tasks/streaks.ts`,
  Monday-noon week anchor). No stored counters; editing a habit never deletes logs.
- Ordering is functional: `moveItem(list, id, direction)` swaps neighbours and
  renumbers `order` from zero for tasks, habits and timer presets. Reordering
  writes no activity log, only the snapshot.
- Today shows incomplete tasks first, completed below, each group keeping its
  explicit order; "Clear completed" (confirmed) drops the rows but keeps the log.
- Timers: manual "Complete" while running, `clockLabel()` renders HH:MM:SS from
  one hour, deleting a running preset stops it (confirmation) and leaves no
  orphan active timer. Deleted default presets are never recreated.
- Journey titles are editable inline; Reset still writes one `streak_reset` event.
- The header carries a compact sync badge (Local only / Syncing / Nostr synced /
  Sync error) that expands to pending count and the last error.
- Unchanged: local-first IndexedDB flow, encrypted-only NIP-44 publish, kind
  30078 snapshot + kind 78 logs, 4 s debounce, no per-second relay writes. No
  schema change (`TASKS_SCHEMA_VERSION` stays 1) — existing snapshots load as is.

## Garden layout + My Garden House archive (2026-09-21)

- `src/world/layout.ts` is now the shared source for entrance, spawn, welcome
  sign, path, grow beds, Garden Board, cottage, greenhouse and boundary trees.
  Rendering and collision consume those same coordinates. The route is entrance
  → sign → path → beds → board/house, with scenery kept clear of the approach.
- Both coming-soon portals, their meshes, interaction records, colliders and
  overlay state were removed. They have no replacement destination yet.
- The cottage opens `IndoorGarden` as a three-tab garden-house archive: indoor
  Plants, a newest-first timeline of entries across existing diaries, and a
  newest-first Activity timeline from existing Garden Board logs.
- New task/habit/timer/journey events snapshot a sanitized title and timer
  duration in optional `ActivityLog.metadata`. Schema remains v1; older logs
  remain valid and use generic labels such as “Removed task” when their source
  item no longer exists. Storage and relay publication remain NIP-44 encrypted.
- The house is still an overlay rather than a physically enterable interior.
  Real NavMesh routing remains deferred; direct-line/sidestep planning is unchanged.

## Spawn at the entrance arch (2026-09-21)

- `SPAWN = [0, 15.2]` and `ARCH_POSITION = [0, 0, 12.6]` in
  `src/world/layout.ts`. The arch straddles the straight path axis (posts at
  ±2.4 x) just ahead of spawn, so the first steps lead through the gate.
- Verified: `assertSpawnClear` passes, a scripted collision walk crosses the
  arch center and reaches the cottage path end without blocking, and the
  desktop/mobile browser run shows no console errors.

## House at the end of the path (2026-09-21)

- `COTTAGE_POSITION = [7.4, 0, -6.2]`, `COTTAGE_ROTATION_Y = -0.5`,
  `COTTAGE_INTERACTION_POINT = [4.4, -4.1]`, `BOARD_POSITION = [3.1, -6.9]`
  and `PATH_TO = {x: 4.4, z: -4.1}` in `src/world/layout.ts`. The house door
  faces the path end and the Garden Board stands to the left of the entrance,
  per the user's layout sketch. Collision walk from spawn through the arch to
  the house verified clear.

## Arch sign orientation and path connection (2026-09-21)

- The arch sign plane in `Plaza.tsx` now sits on the +z side without the π
  rotation, so the "WondersLand" text reads correctly from the spawn side.
- `PATH_VIA = {x: 0, z: 12.6}` (arch center) added to `src/world/layout.ts`;
  `Path` renders two strips (spawn → arch, arch → house) and `pathPoint` /
  `nearPath` follow the same two-leg route. Collision walk spawn → arch →
  house verified clear.

## 2026-09-21 — Owner-gated editor + NIP-05 on the domain

- `src/nostr/owner.ts`: single OWNER_PUBKEY (npub1c0cj4x…zzvqsjelp5x) + `isOwner()`.
- Layout editor is fail-closed: `useLayoutEditorStore.open()` returns unless the
  signed-in pubkey is the owner; `?edit=1`, F2 and the new two-finger long-press
  (1.2s, touch) listeners are only registered for the owner and torn down on
  sign-out. Convenience gate, not a security boundary — editor state is local.
- `src/routes/[.]well-known/nostr[.]json.ts`: NIP-05 root identifier `_` →
  owner pubkey, with relay hints, `access-control-allow-origin: *`, 5 min cache.
  Owner must set `_@wondersland.online` as their NIP-05 field in their client.

## 2026-09-21 — Edit mode strategy camera (done)

- While the layout editor is open the world runs a bird's-eye orbit camera
  (`src/world/editor/editorCamera.ts` singleton + `EditorCamera.tsx`), the avatar
  is not rendered and `Player.tsx` returns early from its frame loop, so walking,
  proximity targeting and interactions are suspended. `character.pos` is kept,
  so closing the editor restores the player and the follow-cam.
- Editor pointer model: drag empty ground = pan, drag marker = move object,
  right mouse / two fingers = orbit (yaw + pitch), wheel / pinch = zoom.
  Panel buttons: focus selection, frame whole garden, reset view.
- On mobile the editor is a bottom sheet capped at 42dvh. Its fixed header stays
  visible while parameters scroll inside; collapsing leaves only the header.
  The touch joystick is hidden for the entire edit session.
- The add-model catalogue places a tree, plant spot, arch, cottage, greenhouse,
  Garden Board, welcome sign or grow beds at the current camera focus. Every
  added copy can be moved, rotated, scaled and removed. Existing functional
  models can be hidden and are restored by "Vrátit vše"; copies are visual only
  and never duplicate house/board/sign actions.
- Limitations: camera state is memory-only; no keyboard camera shortcuts; the
  editor still has no persistence (export text only). Added model copies are
  decorative and do not add duplicate interactions.

## 2026-09-21 — Hidden layout editor (owner tool, done)

- `?edit=1` or F2 opens an in-page "Layout editor" panel: pick any building,
  path point, spawn, tree or plant slot, drag it on the ground or nudge it by
  0.1 / 0.5 / 1, adjust rotation and scale, add or delete trees.
- Warnings fire when the spawn is inside an obstacle or the centerline of the
  path is blocked; colliders and interactables rebuild live on every edit.
- "Zkopírovat rozmístění" copies paste-ready TypeScript (layout.ts constants,
  LAYOUT scalars, TREE_INSTANCES, PLANT_SLOTS); "Vrátit vše" restores the
  session baseline. Nothing is persisted, synced or published — memory only.
- Files: src/world/layout.ts (mutable), src/garden/slots.ts,
  src/world/interactables.ts (rebuildInteractables), src/world/collision.ts
  (buildColliders/rebuildColliders), src/world/editor/{items,serialize,
  useLayoutEditorStore,EditorLayer}, src/ui/LayoutEditorPanel.tsx,
  src/world/{World,Plaza,Cottage,GardenBoard,WelcomeSign}.tsx,
  src/routes/index.tsx.
- Deferred: persisting a layout, NavMesh, gamification.


## 2026-09-22 — community-verified milestone, pass 1

Added `src/milestones/` (types, pure rules, Nostr transport, reviewer list,
store, tests) and `src/ui/MilestoneCard.tsx`, wired into the Missions section
of the existing dashboard. New kind constants in `src/nostr/kinds.ts`.

Works: submitting one claim from an existing diary with three photo entries,
waiting state 0/3 → 1/3 → 2/3, acceptance at three distinct authorised
reviewers, +100 Observation XP, state restored from Nostr on another device,
signed withdrawal of a confirmation.

Tested: 9 unit tests over the rules (duplicate votes, self-verification,
unauthorised signature, withdrawal, delivery order, changed evidence set,
reviewer removed from the list, one reward per author+project+milestone, hash
stability). Full suite 66 tests, typecheck and build green.

Needs configuration: the NIP-51 reviewer set
`kind 30000 / d = wondersland:verifiers:v1` published by the owner.

Limitations: the unlocked "Documented" marker is a dashboard badge only — no
3D decoration was added.

## 2026-09-22 — community-verified milestone, pass 2 (reviewer side)

- Owner-only reviewer list editor in Missions (`src/ui/ReviewerPanel.tsx`):
  add/remove reviewers by npub or hex (`parseVerifierInput`), publish the
  NIP-51 set kind 30000 `d = wondersland:verifiers:v1` signed by the owner.
  Same three-valued publish state as claims (sending / accepted / partial).
- Listed reviewers see pending claims from other authors with photo evidence
  and Confirm / Withdraw buttons; self-review is never offered and read-only
  sessions get disabled buttons with an explanation.
- `fetchPendingClaims` reads milestone claims across all authors;
  `dedupeClaims` (newest per author+milestone+project) is exported and
  tested. Store gained `reviewClaims`, `reviewAttestations`,
  `reviewStatuses()`, `loadReview()` and `publishVerifiers()`.
- Tested: 7 new tests (pending filtering, newest-wins, npub/hex validation);
  full suite 73 tests, typecheck green.
- Still missing: the owner must actually publish the reviewer list; no real
  claim has been confirmed end to end yet.
