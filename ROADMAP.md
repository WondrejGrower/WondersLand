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
