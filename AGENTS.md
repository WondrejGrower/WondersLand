<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — WondersLand

Rules for any human or AI agent working in this repository.

## 1. What WondersLand is

A browser-native cozy 3D educational world. A visitor explores a small,
peaceful botanical space and learns about plants. It is **not** an e-commerce
site. A shop may exist far in the future; it is not part of the product today.

## 2. The prime directive: build the smallest thing that works

Every change must be traceable to the current milestone in `ROADMAP.md`.
If a change is not in the current milestone, it does not get written.

## 3. Hard bans (Milestone 1)

Do not add, scaffold, stub, or "prepare for": inventory, accounts, backend,
multiplayer, AI, quests, achievements, weather, economy, save system,
database, authentication, shop, analytics, physics engines, ECS frameworks,
asset pipelines, or state machines.

No premature abstractions. No `interface` for a thing that has one
implementation. No config file for a value used once. No plugin systems.
Duplicate twice before extracting.

## 4. Performance is a feature

- Target: 60 fps on a mid-range laptop, ≥30 fps on a modern phone.
- One canvas. One scene. No post-processing in Milestone 1.
- Prefer procedural/instanced geometry over downloaded models.
- Never allocate inside `useFrame` (no `new THREE.Vector3()` per frame — hoist
  scratch objects to module or ref scope).
- Never call `setState` every frame. Frame-rate data lives in refs or in
  Zustand values read via `getState()`, not via reactive subscriptions.
- Keep draw calls low; reuse materials and geometries.
- Lazy-load the 3D scene so the landing screen paints instantly.

## 5. State rules

- **Zustand** holds *world/session* state: has the visitor entered, which
  plant is focused, is the journal open. Small, flat, no nesting.
- **Refs** hold *per-frame* state: player position, velocity, camera yaw.
- **React state** holds *local UI* state only.
- Content (plant journal text) is static typed data, not state.

## 6. Rendering boundaries

- Anything inside `<Canvas>` is R3F/Three code. It may not import DOM UI
  components.
- Anything outside `<Canvas>` is regular React DOM. It may not import Three.
- The two communicate **only** through the Zustand store.

## 7. Styling

2D UI uses semantic Tailwind tokens defined in `src/styles.css`. Never
hardcode colors in components (`bg-[#...]`, `text-white`). 3D colors live in a
single palette module so the world and the UI stay visually consistent.

## 8. SSR note

This repo uses TanStack Start, which server-renders by default. Three.js and
R3F are browser-only. The 3D scene must be loaded client-side only
(`React.lazy` behind a client-only gate). Never import a Three module at the
top level of a route file.

## 9. Definition of done for any task

1. It runs with no console errors or warnings.
2. It is reachable by a visitor through normal interaction.
3. Frame rate is not visibly worse than before.
4. `PROJECT_STATE.md` is updated.
5. No file from the hard-ban list appeared.

## 10. Communication

When finishing work, state plainly what was built, what was skipped, and what
the next milestone step is. Do not claim a feature exists until it is visible
in the running app.
