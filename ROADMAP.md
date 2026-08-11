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

## Later (not planned, not scaffolded)

- More plants and a small journal index
- Ambient audio
- Day/night lighting mood
- Seasonal garden areas
- A shop, if and only if the world is worth visiting first

These are listed only so nobody builds them early. No code for them exists or
should exist.
