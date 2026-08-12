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
