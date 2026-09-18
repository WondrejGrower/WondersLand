# 3D world UX upgrade: click-to-move + World Settings

Incremental upgrade of the garden world. WASD keeps working the whole time; click-to-move is added beside it (hybrid is the default). Nothing about diaries, the Garden Board, Nostr login/sync, image upload or mobile support changes.

## What the visitor gets

- A small gear button under the existing "← Nostr" button opens a **World Settings** panel with Controls, Camera, Graphics, Interface, Accessibility and Recovery sections. Settings are stored on the device only — never published anywhere.
- **Click or tap the ground to walk there.** One click sets a destination, a new click replaces it, clicking on your own feet stops you. Holding the mouse down does not chase the cursor.
- **Click an object to use it.** In range it opens straight away; out of range the character walks to it and opens it on arrival (switchable off).
- A soft ring marker appears where you clicked, and the clicked object glows briefly.
- Right-drag (desktop) or swipe (mobile) still rotates the camera, wheel/pinch zooms. A drag never gets mistaken for a click.

## Technical design

### New modules
```
src/state/useWorldSettingsStore.ts   versioned (schemaVersion 1) local prefs, localStorage
src/world/controller/CharacterController.ts   moveTo / moveDirection / stop / interact, refs only
src/world/controller/useCharacterController.ts  per-frame locomotion driven by the controller
src/world/input/ClickToMoveInput.tsx  raycast against the ground plane, tap-vs-drag threshold
src/world/input/pointerCamera.ts      right-drag / swipe orbit + wheel / pinch zoom
src/world/nav/path.ts                 Path abstraction + direct-line planner (NavMesh slot)
src/world/DestinationMarker.tsx       cheap ring/leaf pulse, ~0.8 s
src/ui/WorldSettingsButton.tsx        gear pill, 44x44 touch target
src/ui/WorldSettings.tsx              the panel
```

### Movement architecture
`Player.tsx` stops owning input. It becomes a thin host: it creates the controller state (position, yaw, camera yaw), and per frame asks the controller to advance. Two input sources write into the controller:

- `WASDInput` — existing keyboard/joystick axes → `moveDirection()` (all the existing focus-loss / stuck-key safeguards move across unchanged).
- `ClickToMoveInput` — pointer raycast → `moveTo(point)` or `interact(target)`.

A direction command cancels an active destination, so WASD always wins instantly in hybrid mode.

### Pathing
`planPath(from, to)` returns an array of waypoints. Phase 1 returns a straight line, validated against the existing circle/box colliders in `collision.ts`, with a short sidestep when the direct line is blocked; existing slide resolution stops the character clipping. The controller only ever consumes waypoints, so a Recast NavMesh can replace `planPath` later without touching input or character code. Paths are computed only when the destination changes — never per frame. Full NavMesh is **deferred** and documented in PROJECT_STATE.md / AI_HANDOFF.md.

### Interactables
`interactables.ts` gains optional `interactionPoint`, `interactionRadius` and `highlight` per entry, with sane defaults derived from the existing `position` / `radius`. One generic pipeline handles Garden Board, house, portals, plants and future NPCs — no board-specific movement code. Each 3D object gets an `onClick` that reports its id; approach-then-act lives in the controller.

### Settings actually wired this turn
movementMode, mobileMovement, autoInteract, movementMarker, objectHighlight, camera sensitivity / invert / distance / followCharacter, render scale, FPS cap, HUD scale, interaction prompts, tutorial hints, reduced motion + reduce camera motion, larger text, and all three Recovery actions.

Settings that would need invasive work right now (shadow tiers, vegetation density, high contrast, camera shake, battery saver) are **left out of the UI** rather than shown as dead switches.

### Safety
No per-frame React state, no new per-frame allocations (scratch vectors), no network writes, no new heavy dependency, CSP untouched, "← Nostr" untouched.

## Verification
Typecheck, full test suite, build, plus a browser pass: WASD in hybrid and wasd modes, click-to-move in click and hybrid, settings persist across refresh, Settings blocks the world underneath, clicking the Garden Board walks over and opens Tasks, UI clicks never move the avatar, no horizontal overflow on mobile widths.
