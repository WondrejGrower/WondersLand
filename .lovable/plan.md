# World collision: lightweight XZ colliders

Goal: the avatar can no longer walk through the cottage, trees, greenhouse, garden island, arch posts and large rocks — while movement still feels smooth and nothing else in the app changes.

No physics engine. Movement is ground-based, so collision is solved in 2D (X/Z) with circles and rotated boxes, resolved with sliding.

## 1. Collider data shape and where it lives

New module `src/world/collision.ts` — the single source of truth, plain data, no Three imports at module scope.

```text
Collider =
  | { kind: "circle", x, z, r }
  | { kind: "box",   x, z, hw, hd, rot }   // rotated box (OBB) around its centre
```

- `WORLD_COLLIDERS: Collider[]` is built once at module load (static scenery) and exported.
- A tiny helper `resolveMove(fromX, fromZ, toX, toZ, radius) -> {x, z}` also lives here; it is pure, allocation-free (module-scope scratch numbers only), and used by `Player.tsx`.
- Player footprint: `PLAYER_RADIUS = 0.42`.
- Colliders are physical only. Interaction radii (`COTTAGE_INTERACT_RADIUS`, plant reach) stay exactly as they are, and every collider is sized so the player can stand inside the interaction range while outside the mesh.

Dynamic colliders (diary plants from `useGardenStore`) are read separately: a small `useMemo` in `Player.tsx` derives circle colliders from `plants` and keeps them in a ref, refreshed only when the plant list changes — never inside `useFrame`.

## 2. Which object gets which collider

| Object | Primitive | Notes |
| --- | --- | --- |
| Cottage (`[6,0,-4]`, rot -0.5) | rotated box ~3.6 x 3.0 half-extents tuned to the GLB footprint | smaller than `COTTAGE_INTERACT_RADIUS = 5`, so E/touch still reachable |
| Greenhouse (`[-13,0,-13]`, rot 0.7) | rotated box ~3.6 x 2.3 | matches stone base |
| Garden island bed (`[-3.6,0,2]`) | circle r ≈ 3.1 | stone rim |
| Entrance arch posts (`[±2.4,0,17]`) | two circles r ≈ 0.55 | walkway between them stays open |
| Framing rocks in `Plaza` (4 hand-placed) | circles r = scale × 0.9 | |
| Scattered rocks in `Ground` (28) | circles, only those with scale ≥ 0.8 | small pebbles stay walkable |
| Trees (boundary ring + 3 close trees) | circles r ≈ 0.45 × instance scale | trunk only, canopy is walkable-under |
| Diary plants (`GardenPlants`) | circles r ≈ 0.45 | dynamic, from store |
| Grass tufts, blooms, shrubs, flowers, path quads, contact shadows | none | decorative |

Outer boundary: the existing `GARDEN_RADIUS - 1` clamp in `Player.tsx` stays untouched.

## 3. Movement resolution (sliding)

Per frame, after computing the desired delta:

1. Compute candidate position `to = pos + move`.
2. Clamp to garden radius (existing behaviour).
3. Loop over colliders (2 relaxation passes for corner cases). For each overlapping collider compute the shortest push-out normal:
   - circle: normal = (to − centre) normalised; push so distance = `r + PLAYER_RADIUS`.
   - box: transform `to` into box-local space by `-rot`, clamp to the box, take the axis of least penetration, push out by `PLAYER_RADIUS`, transform back.
4. Applying the push-out along the surface normal *is* the sliding behaviour: the tangential component of the movement survives, so the player glides along walls instead of stopping.
5. Broad phase: skip any collider whose centre is farther than `r + PLAYER_RADIUS + moveLength` — a cheap squared-distance test, so the ~50-collider list costs nothing on mobile.

All maths uses scalars; no `new Vector3()`, no `setState`, no store writes.

## 4. Sharing deterministic scatter with rendering

Today `Ground.tsx` and `Trees.tsx` each hold a private `rng()` and generate positions in a `useMemo`, which would drift from any duplicated collider list. Fix:

- Move the shared deterministic `rng(seed)` and the two layout generators into a new `src/world/layout.ts`:
  - `TREE_INSTANCES: { x, z, rot, scale }[]` (boundary ring + close trees)
  - `ROCK_INSTANCES: { x, z, rot, scale }[]`
- `Trees.tsx` and `Ground.tsx` build their instance matrices from these arrays instead of generating them inline (rendering output stays visually identical — same seeds, same order).
- `collision.ts` imports the same arrays to derive trunk/rock circles. One source, no drift.
- Grass stays generated inside `Ground.tsx` (non-colliding, no need to share).

## 5. Spawn / stuck safety

- Spawn is `(0, 8)` on the open path; verified against the collider list at build time by an assertion helper `assertSpawnClear()` run once in dev (`import.meta.env.DEV`) that logs a warning if the spawn overlaps.
- Runtime safety valve: if after resolution the player is still inside a collider (possible only from a bad data change), push out along the largest penetration normal regardless of movement direction — so the player is always ejected rather than trapped.
- Resolution always starts from the last known-good position, so a zero-length move can never teleport the player inside geometry.

## 6. Files

Add:
- `src/world/collision.ts` — collider types, `WORLD_COLLIDERS`, `resolveMove`, `PLAYER_RADIUS`.
- `src/world/layout.ts` — shared deterministic `rng`, `TREE_INSTANCES`, `ROCK_INSTANCES`.

Change:
- `src/world/Player.tsx` — call `resolveMove` after the movement delta; derive dynamic plant colliders in a memo/ref.
- `src/world/Trees.tsx` — consume `TREE_INSTANCES`.
- `src/world/Ground.tsx` — consume `ROCK_INSTANCES` for rocks.
- `src/world/Cottage.tsx`, `src/world/Plaza.tsx` — export the position/rotation/size constants collision needs (no visual change).
- `PROJECT_STATE.md`, `AI_HANDOFF.md`, `CHANGELOG.md`, `ROADMAP.md` — record the collision layer rule: physical colliders live in `collision.ts`, interaction radii stay separate.

Not touched: avatar, camera, joystick, Journal, IndoorGarden, Nostr, GardenConfig.

## 7. Verification checklist

Desktop:
- Walk into the cottage from all four sides — blocked, and E prompt still appears while blocked.
- Walk along the cottage wall diagonally — the avatar slides, does not stick.
- Walk into greenhouse, garden island, both arch posts, big rocks, tree trunks — blocked.
- Walk through grass, blooms, small pebbles, path — unobstructed.
- Plant interaction and journal open/close unchanged; outer radius boundary still holds.
- Camera never ends up inside a wall in a way that hides the avatar (note: camera collision is out of scope for this pass).

Mobile / touch:
- Joystick movement against a wall slides rather than jitters.
- Tap-to-open cottage still works while pressed against it.
- No frame-rate drop versus the current build (spot-check with the on-screen behaviour and a short profile).

Both:
- No console errors or warnings; typecheck and production build pass.
- No new allocations in `useFrame` (code review of the frame path).
