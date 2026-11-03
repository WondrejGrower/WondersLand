# NoTillMan project state

Updated 2026-11-02 after the user's 3D/performance revision.

## Preserved source

The cleaned full WondersLand source remains on GitHub branch
`backup/wondersland-nostr-2026-11-02`, commit
`6ca4b6bbbd59f4ee96f5be82c805d7e9027629d1`. The game was removed before
that backup and before replacing the home page. Do not change the backup,
rewrite published history or purge user storage/Nostr events.

## Current experience

- One connected volumetric cannabis plant: branching roots, stem, serrated fan
  leaves, smaller sugar leaves, instanced flower calyxes, pistils and trichomes.
- The new standalone Three.js scene is lazy-loaded after hydration. It never
  imports the archived world or mounts the previous Nostr client.
- Native upward scrolling drives a continuous perspective camera from roots to
  flower. Horizontal dragging and accessible rotation buttons reveal its depth.
- Lighting and background change from dark roots to daylight. Higgsfield follows
  a projected point on the fan leaf; FastBuds follows the top cola.
- React updates only at chapter boundaries. Animation mutates the camera, lights,
  two opacity tokens and projected labels directly. No frame-by-frame React
  state updates, image filters, backdrop filters or full-screen noise filter.
- Geometry is shared/merged (six mesh draw calls plus lines and points). Rendering
  sleeps at rest and while the document is hidden. Drawing-buffer pixels are
  capped at 600k on mobile / 1.25m on desktop and resolution adapts downward to
  sustained slow frames. No shadow maps or postprocessing.
- Devices without WebGL use a lower-detail software 3D renderer with the SAME
  perspective camera and model. The optimized old plant image is only a final
  fallback if neither renderer works; it is no longer preloaded on a normal visit.
- The stage is fixed inside the native scroll region. This fixes browser focus
  scrolling that otherwise moved the journey when a rotation button was pressed.
  Keep overflow:clip so the stage itself cannot acquire a hidden scroll position.
- Pointer input belongs to the native flow track, while the fixed scene layers
  are pointer-transparent. This retains native wheel/touch scrolling without
  intercepting wheel events, and horizontal dragging still rotates the camera.
- Mobile camera framing reserves space for text; projected badges are kept within
  the viewport. Direct partner links and the focus-trapped about dialog remain.
- Reduced motion removes damping and smooth jumps. Vertical touch scrolling is
  native; horizontal dragging only captures after a directional threshold.
- Affiliate URLs remain missing; links honestly use ordinary official websites.

## Files

- `src/features/creator-hub/CreatorHub.tsx`: native scroll, UI and accessible links.
- `src/features/creator-hub/scene/plant.ts`: deterministic volumetric geometry.
- `src/features/creator-hub/scene/PlantScene.ts`: camera, lights, demand loop,
  pointer interaction, resolution, context/visibility lifecycle and cleanup.
- `src/features/creator-hub/scene/SoftwareRenderer.ts`: no-WebGL 3D renderer.
- `src/features/creator-hub/scene/journey.ts`: shared camera path and pixel budget.
- `src/features/creator-hub/creator-hub.css`: scoped layout and atmosphere.
- `src/features/creator-hub/links.ts`: partner/social destinations.

## Verification and limits

- TypeScript passed; 11 test files / 92 tests passed; production client/SSR/Worker
  build passed. Three new tests check finite volumetric geometry, triangle/mesh
  budgets, camera continuity/overscroll and mobile/high-DPR/4K pixel budgets.
- Real desktop and 390x844 browser checks cover chapter jumps, camera ascent,
  rotation buttons/drag, native PageUp/upward wheel scrolling, persistent
  destinations and the about dialog/Escape.
- Mobile leaf badge is visible within bounds; width/scrollWidth are both 390.
- Browser focus initially shifted progress from Leaf while rotating. After the
  fixed-stage correction, scrollTop stayed 1306 (max 3629) before/after rotation.
- Demand rendering was observed idle with an unchanged render count.
- The cloud QA browser disables WebGL. Interactive software 3D was exercised;
  the actual GPU renderer's visual output and hardware FPS were not measured.
  Do not claim a verified universal 60 FPS or photorealistic model.
- No production deployment, audience change, sign-in or public Nostr publishing.

## Remaining input

Exact personal FastBuds and Higgsfield affiliate URLs. Do not invent codes.

## Macro revision — 2026-11-03

Camera starts at distance 1.65 among root hairs and soil aggregates, then pulls
back monotonically through 2.6 / 4.2 / 6.3 to 8.2 at the flower. Mobile preserves
the same pullback with progressively larger space for text. Horizontal framing
opens gradually so the macro subject stays in view. Added finer root filaments,
rounder root/stem tubes, denser flower calyxes/trichomes, refined leaf geometry
and soil aggregates in the root volume. Geometry stays merged/instanced; demand
rendering and pixel budgets remain. Tests now enforce monotonic camera distance.
Desktop macro checked visually in the software 3D browser; monotonic pullback
checked by camera-path tests. TypeScript, all 92 tests and production build passed.
GPU FPS remains unmeasured; mobile framing was checked mathematically, not
visually rerun for this revision.

## Photographic opening — publication authorized

Prepared locally: outdoor night photo landing, deliberate 1.2s descent (instant
for reduced motion), native upward journey and a photographic final flower with
FastBuds link. Exact source photos were encoded as WebP only, without AI editing.
Intro and photo ending checked on desktop and 390px mobile. The original 3D
plant remains in middle chapters. No new whole-plant model is claimed.

The initial automatic review rejected public-repository upload of the personal
photo. The user then explicitly approved that exact publication on 2026-11-03.
The approved photo blob is now uploaded; this reviewed revision is authorized
for synchronization into the existing Lovable preview. No production deployment.

Final checks: TypeScript, 92 tests and production build passed. Desktop and
390px mobile entry, descent, final macro, direct links and home return were
checked in the browser before this documentation-only approval update.

Bud photo blob was accepted: 7109138c954d89fef1b8d7f8c065756ff8f38a90.
Approved night photo blob: 84fcfd3fadb2f692dea50ed62e95672bd76a53ac.
