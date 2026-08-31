# PROJECT_STATE.md

Snapshot of what actually exists. Update this with every change.

**Last updated:** 2026-08-31 (C key / touch button exits the world to the Nostr client)
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
