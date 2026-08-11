# PROJECT_STATE.md

Snapshot of what actually exists. Update this with every change.

**Last updated:** 2026-08-11
**Current phase:** Documentation — awaiting approval to write application code.

## Built and working

- Nothing yet, product-wise.
- Repository baseline: Vite + React 19 + TypeScript + TanStack Router,
  Tailwind CSS v4 tokens in `src/styles.css`, shadcn-style UI primitives
  available but unused.
- `src/routes/index.tsx` still renders the default placeholder.

## Not built

Everything in `ROADMAP.md`, starting with Milestone 1.

## Dependencies to be installed at the start of Milestone 1

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand`
- `@types/three` (dev)

No other dependency may be added without a matching roadmap line.

## Known constraints

- SSR is on; the 3D scene must be client-only.
- Preview/dev server runs on port 8080.

## Open questions

- None. Scope is frozen to Milestone 1.
