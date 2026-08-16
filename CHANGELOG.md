# CHANGELOG

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
