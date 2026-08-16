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

## Character model
The player mesh is an imported rigged GLB loaded with drei `useGLTF` in
`src/world/CharacterAvatar.tsx`; the file lives on the Lovable CDN via
`src/assets/village-boy.glb.asset.json`. The file contains exactly two clips,
`Walking` and `Running` — there is no Idle clip. `Walking` is therefore held at
weight 1 permanently and its `timeScale` is eased by `input.forward/strafe`
inside `useFrame`; on stop it settles on the clip's passing pose
(`NEUTRAL_FRACTION`) so the rig never falls back to its bind/T-pose. Never fade
that weight to 0. No state writes per frame. Do not edit `src/world/Avatar.tsx`
(legacy, unused).

## Nostr / garden data layer
`src/nostr/` is the only place that talks to relays. Event schemas are shared
with Weedoshi — do not change kinds (30078 diaries, 0 profiles, 30000 growmies)
or tag names, or the two apps stop reading each other's data. Phase 1 is
read-only: no signing beyond `getPublicKey`, no nsec handling, ever.

`src/garden/` is pure mapping: diary -> category -> zone slot -> model. Zones
live in `zones.ts`; add a dedicated model by registering its slug in
`models.ts` and rendering it in `GardenPlants.tsx`. Plant placement is computed
once when diaries load, never per frame; `Player.tsx` reads the plant list with
`useNostrStore.getState()` inside `useFrame` and only writes to the world store
when the focused plant changes.

## Garden persistence
The garden address is permanent: kind 30078, `d = wondersland:garden-config`.
Never version that tag — bump `schema` inside the content and add a step in
`migrateConfig` instead. Ordering is NIP-01 only (`created_at`, then lowest
`id`); `rev` is application metadata and must never decide a winner.

Autosave and publishing are separate on purpose: placement changes only write
the local draft (debounced), and `useGardenStore.save()` is the single place a
signer is invoked, so the extension never prompts on its own. A failed publish
keeps the draft. Only `src/nostr/signers/` may touch key material, and only via
NIP-07 — npub sessions are read-only and `canEdit` is false.

## Key material rules (alpha)
`src/nostr/signers/local.ts` is the ONLY module that may hold a private key.
It stores the decoded bytes in module scope, exposes `unlockLocalSigner`,
`clearLocalSigner` and `signWithLocalKey`, and must never gain a persistence
path (no storage helpers, no store fields, no logging, no event tags). Session
records written to storage always downgrade `nsec` to `npub`, so refresh means
read-only until the owner unlocks again. Write capability is derived solely
from `getSigner(method)`; UI must never infer it from the auth method string.

Future endpoints live in `src/nostr/endpoints.ts`. Keep the WondersLand relay
opt-in (`WONDERSLAND_RELAY_ENABLED`) and never make it the only relay; Blossom
is a constant only until an upload milestone is approved.
