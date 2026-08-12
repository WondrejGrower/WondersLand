# AI_HANDOFF.md

Read this first if you are an AI agent picking up WondersLand.

## Read order

1. `AGENTS.md` — the rules. They override your defaults.
2. `PROJECT_STATE.md` — what is real right now.
3. `ROADMAP.md` — the only allowed next step.

## The one-sentence brief

WondersLand is a cozy browser 3D botanical world where a visitor walks around,
approaches one cannabis plant, and reads its journal — nothing more.

## Planned file layout (Milestone 1)

```text
src/
  routes/
    index.tsx            landing + client-only mount of the world
  world/                 everything inside <Canvas>
    World.tsx            scene root: lights, sky, ground, plant, player
    Ground.tsx
    Sky.tsx
    Player.tsx           movement + camera rig
    plants/
      CannabisPlant.tsx  procedural geometry + sway
    palette.ts           shared 3D colors
  ui/                    everything outside <Canvas>
    LandingScreen.tsx
    InteractPrompt.tsx
    Journal.tsx
  state/
    useWorldStore.ts     zustand: entered, focusedPlantId, journalOpen
  content/
    plants.ts            static typed journal content
```

Nothing outside this tree gets created in Milestone 1.

Since then the authorized additions are `src/world/Avatar.tsx` (garden-keeper
player model) and `src/world/Plaza.tsx` (entrance arch, path, planted island,
trees, instanced shrubs/flowers, rocks, greenhouse silhouette, fake contact
shadows). `Plaza.tsx` exports `nearPath(x, z, clearance)`; `Ground.tsx` uses it
to keep grass and rocks off the walkable route. Any new scenery goes in
`Plaza.tsx` until it is large enough to split.

## Store contract

```ts
type WorldState = {
  entered: boolean;
  focusedPlantId: string | null;   // set by proximity check
  journalOpen: boolean;
  enter: () => void;
  setFocusedPlant: (id: string | null) => void;
  openJournal: () => void;
  closeJournal: () => void;
};
```

`focusedPlantId` is written at most on change, never every frame. The
proximity check compares distance in `useFrame` but only calls the setter when
the boolean in/out state flips.

## Traps to avoid

- **SSR crash:** importing `three` or R3F at route module scope. Mount the
  world with `React.lazy` inside a client-only gate.
- **Frame stutter:** allocating vectors in `useFrame`, or driving the camera
  through React state.
- **Scope creep:** an inventory slot "for later", a save hook "just in case",
  a plant registry abstraction for one plant. All banned.
- **Input capture:** while the journal is open, movement keys must be ignored
  and Esc must close the journal, not exit pointer lock silently.
- **Mobile:** the desktop-only pointer-lock path must not block touch users.

## Verification before you claim done

- App loads, no console errors.
- Interaction prompt reads "Press E" on a fine pointer and "Touch it" on a
  coarse pointer (test both viewports).
- Enter → walk → rotate → approach → prompt → E → journal → Esc works end to
  end in a real browser.
- Update `PROJECT_STATE.md` with what changed.
