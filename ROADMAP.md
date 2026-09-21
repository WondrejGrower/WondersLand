# ROADMAP.md

One milestone at a time. A milestone is not started until the previous one is
finished, running, and reflected in `PROJECT_STATE.md`.

## Milestone 1 — Enter, walk, look, read (current)

The entire first release. Broken into steps that each leave the app runnable.

**1.1 Foundation**
Install `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`.
Add the cozy design tokens (warm sand, moss green, dusk sky) to
`src/styles.css` and a matching 3D palette module.

**1.2 Landing screen**
Replace the placeholder index route: title, one line of description, an
"Enter WondersLand" button. Sets `entered: true` in the store.

**1.3 The world**
Client-only `<Canvas>`: sky gradient, hemisphere + directional light, a soft
ground plane, a low ring of hills or hedges to bound the space, scattered
instanced grass/rocks for texture. Fixed size, roughly 40×40 units.

**1.4 Movement**
Third-person player capsule. WASD / arrow keys for movement, mouse drag or
pointer lock for camera yaw, camera follows behind with smooth damping.
Collision is a simple radial clamp to the garden bounds — no physics engine.
Mobile: on-screen joystick for movement, drag anywhere else to look.

**1.5 The plant**
One cannabis plant, procedurally built from simple geometry (stem, fan leaves,
pot or soil mound), gently swaying. Placed at a deliberate spot in the garden.

**1.6 Interaction**
When the player is within range, a soft prompt appears ("Press E"). Pressing E
(or tapping the prompt) opens the journal. The store holds
`focusedPlantId` and `journalOpen`.

**1.7 The journal**
A DOM overlay panel — botanical-notebook styling, readable typography. Shows
name, species, a short description, and a few field notes for the one plant.
Closes with Esc or the close button. Movement is suspended while open.

**1.8 Polish and ship**
Loading state, page metadata/SEO, mobile pass, performance pass
(draw calls, allocation audit), accessibility pass on the DOM UI.

**Milestone 1 is done when** a first-time visitor can complete the full loop
without instructions and without a single console error.

## Milestone 1 visual identity polish — player avatar only (done)

A single user-authorized visual pass: replace the player capsule with a
low-poly stylized garden-keeper avatar built from primitives, with idle and
walk animation. No new systems, no environment changes, nothing else.

## Entrance plaza — first playable environment slice (done, 2026-08-12)

One user-authorized environment pass: entrance arch with a locally drawn sign,
short curved walkable path, central planted island, three trees, instanced
shrubs/flowers/rocks, a distant greenhouse silhouette, cheap fake contact
shadows, and a device-aware interaction prompt. No new systems or packages.

## Later (not planned, not scaffolded)

- More plants and a small journal index
- Ambient audio
- Day/night lighting mood
- Seasonal garden areas
- A shop, if and only if the world is worth visiting first

These are listed only so nobody builds them early. No code for them exists or
should exist.

- [x] Main character model (user-authorized scope change): imported rigged GLB
      player replaces the code-built avatar.

- [x] Nostr Phase 1 (user-authorized scope change): read-only identity, profile
      and Weedoshi diary fetching, mapped into semantic garden zones with a
      dedicated/generic model fallback.

- [x] Nostr Phase 2 (user-authorized scope change): per-user garden persistence
      as a kind-30078 addressable event, local-first draft autosave, explicit
      signed publish, and NIP-01 conflict handling. Editing UI is not built.

- [x] World collision (user-authorized scope change): lightweight XZ circle/OBB
      colliders with sliding resolution for cottage, greenhouse, garden island,
      arch posts, substantial rocks, tree trunks and diary plants. Shared
      deterministic layout source. No physics engine, no camera collision.


## Authorized pass — Nostr interactions (likes, comments) + client stamp

Approved 2026-09-03. Nostr client work only; the 3D world is untouched.

- NIP-25 likes and NIP-10 comments on Grow Feed posts, published with the
  existing in-memory signer (read-only npub sessions get the unlock sheet).
- NIP-89 `client` tag on every event WondersLand signs, so other clients
  show "from WondersLand"; incoming `client` tags are shown as a chip.
- Zaps (NIP-57) and reposts (NIP-18) stay visibly disabled until a later pass.

## Authorized pass — 2026-09-03: Live grow timer + cannabis-only plant list

- Live grow timer derived from diary createdAt, stopped by harvest/cure/finished phase.
- Timer visible in diary reader, diary cards, Latest diary and the in-world interaction prompt.
- Plant picker temporarily limited to cannabis types (flag-gated, catalog untouched).

## Authorized pass — 2026-09-06: Grow Lens (open feed algorithm)

- Transparent client-side ranking for the Grow feed: recall from hashtags,
  contacts and grow-diary authors, then scoring by inspectable signals.
- Per-post "why am I seeing this" breakdown and a user-editable lens panel with
  JSON export/import so other Nostr clients could adopt the same format.
- No backend, no telemetry, no change to the Nostr/Weedoshi data model.

## Authorized pass: 3D world cleanup + exit button (2026-09-06, done)
- Visible exit-to-Nostr control with `C` hint, scene cleanup (island, grass, pebbles,
  blooms, framing rocks), straight regular path, DPR/fog/far tuning.
- Dev-only devtools source-tag strip for `src/world/**` so the canvas stops crashing.

## 2026-09-10 — Security F1 (legacy persisted sessions)

Sessions carry a version marker (`src/nostr/session.ts`, v1). Legacy/unversioned
sessions are invalidated before any relay request and their identity caches are
purged from IndexedDB and the localStorage fallback (`purgeKey` in
`src/nostr/storage.ts`). Covered by `src/nostr/session.test.ts`.
Limitation: this forces a ONE-TIME re-login for all existing users; relay-side
diaries and unrelated local data (relay list, Grow Lens config) are preserved.
Not deployed — pending owner review.

## Garden Board (tasks / habits / timers) — MVP shipped
Local-first personal board synced to Nostr as an encrypted kind 30078 snapshot
(`d = wondersland:tasks:v1`) plus encrypted kind 78 activity logs. Opened from a
wooden board beside the My Garden house (uploaded GLB asset).

### Completion pass (done)
Weekly habits (target 1-7, Monday-Sunday ISO weeks, derived weekly streak),
habit editing, touch-safe reordering of tasks/habits/timers, incomplete-first
task grouping with "Clear completed", manual timer "Complete", HH:MM:SS labels
from one hour, journey rename, and a compact sync status badge with details.
Next: gamification (XP / levels / achievements) is NOT started and stays out of
scope until a later phase.

## 2026-09-21 — Tap-to-move walk animation hotfix (done)

The avatar walk clip now follows actual controller locomotion, so keyboard,
joystick and tap/click paths animate consistently. No movement behavior changed.

## 2026-09-21 — Garden layout consolidation + house archive (done)

- One readable route now connects entrance, welcome sign, grow beds, Garden
  Board and the My Garden house; render, interaction and collision positions
  share one layout source. The greenhouse remains distant scenery.
- Both placeholder portals and their interactions were removed.
- The house now opens a private archive with Plants, Diary history and Activity
  tabs. Existing Garden Board logs remain encrypted/local-first; new activity
  events include a small title/duration snapshot so history survives deletion.
- No physical house interior, NavMesh, gamification or new persistence layer.

## 2026-09-21 — Spawn at the entrance arch (done)

- Spawn moved to `[0, 15.2]`, right at the entrance. The arch moved to
  `[0, 0, 12.6]`, centered on the path axis ~2.6 m ahead of spawn, so the
  visitor walks through the wooden gate into the garden. Verified in browser
  (desktop + mobile) and with a collision walk simulation: no stuck spots.

## 2026-09-21 — House at the end of the path (done)

- The My Garden house moved to the end of the dirt path (`[7.4, 0, -6.2]`,
  rotated to face the approaching visitor) and the Garden Board now stands
  beside its entrance (`[3.1, -6.9]`), matching the hand-drawn layout sketch.
  The path (`PATH_TO = {x: 4.4, z: -4.1}`) leads straight to the house steps.

## 2026-09-21 — Arch sign readable from spawn + connected path (done)

- The WondersLand sign on the entrance arch now faces the spawn, so visitors
  read it on arrival instead of seeing the bare back.
- The walkway is two straight legs meeting under the arch center
  (`PATH_FROM → PATH_VIA → PATH_TO`): it starts beneath the spawn point,
  passes through the middle of the gate and continues to the house.

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

- Layout editor no longer uses the character follow-cam: orbiting bird's-eye
  view (pan / pinch-zoom / orbit), avatar hidden, walking and interactions
  suspended, camera and player restored on close.
- New: src/world/editor/editorCamera.ts, src/world/editor/EditorCamera.tsx.
  Touched: Player.tsx (early return + no avatar while editing), World.tsx,
  EditorLayer.tsx (pan/orbit/pinch/wheel), LayoutEditorPanel.tsx (view buttons).
- Mobile editor panel is a bottom sheet capped at 42% of the viewport with an
  independently scrolling body and compact collapsed state; the joystick is
  hidden while editing so the map remains usable.
- The owner can add trees, plant spots, arches, cottages, greenhouses, boards,
  signs and grow beds at the current camera focus, then move, rotate, resize or
  remove them. Original functional models may be hidden; added copies are
  scenery-only. "Vrátit vše" restores the complete session baseline.
- Camera stabilization follow-up: panning uses screen-space deltas instead of a
  moving ground raycast; touch transitions and pointer cancellation reset their
  baselines so the strategic view does not shake or jump.

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

