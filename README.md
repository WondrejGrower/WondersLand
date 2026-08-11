# WondersLand

A browser-native, cozy 3D educational world. Not a shop, not a storefront — a
small, peaceful botanical place you can walk around in and learn from.

## What exists in Milestone 1

A visitor can:

1. Open the website and see a title screen
2. Press "Enter WondersLand"
3. Walk around a small garden (WASD / arrow keys, touch joystick on mobile)
4. Rotate the camera (mouse drag or pointer lock; touch drag on mobile)
5. Walk up to a single cannabis plant
6. Press the interact key (E) when close enough
7. Read the plant's journal panel
8. Close the journal (Esc or the close button)

Nothing else. No inventory, accounts, backend, multiplayer, AI, quests,
achievements, weather, economy, saving, database, auth, or shop.

## Stack

| Concern | Choice |
| --- | --- |
| Build tool | Vite |
| UI | React 19 + TypeScript |
| 3D | Three.js via React Three Fiber |
| 3D helpers | @react-three/drei |
| State | Zustand |
| Styling (2D UI only) | Tailwind CSS v4 design tokens |
| Routing | TanStack Router (already wired in this repo) |

## Getting started

```bash
bun install
bun run dev
```

The app runs on http://localhost:8080.

## Documentation

- `AGENTS.md` — rules for humans and AI agents working in this repo
- `PROJECT_STATE.md` — what is actually built right now
- `ROADMAP.md` — ordered milestones, one small step at a time
- `AI_HANDOFF.md` — context an AI agent needs to continue safely

## Status

Documentation phase. No application code has been written yet.
