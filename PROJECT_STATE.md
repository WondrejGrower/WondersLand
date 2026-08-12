# PROJECT_STATE.md

Snapshot of what actually exists. Update this with every change.

**Last updated:** 2026-08-12 (entrance plaza)
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
  `journalOpen` and their three setters. Nothing else.
- **Per-frame input** (`src/state/input.ts`): a plain mutable object written by
  keyboard/joystick handlers and read inside `useFrame` — never React state.
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
