# NoTillMan

An interactive personal creator page: a native upward journey from dark roots to
a living plant, with FastBuds on the flower and Higgsfield on a fan leaf.

The project uses React, TypeScript, TanStack Start and Three.js and remains connected to Lovable.
The plant has real volumetric geometry, a scroll-driven camera and drag/keyboard
rotation. Rendering stops at rest. Devices without WebGL use a lower-detail 3D
Canvas renderer with the same perspective camera.

## Run and verify

```sh
npm install
npm run dev
npx tsc --noEmit
npx vitest run
npm run build
```

The journey starts at the bottom. Scroll upward, use the chapter markers, or press
the ascent button. All key links remain available without completing the journey.

## Destinations

Edit `src/features/creator-hub/links.ts` to configure real affiliate URLs. None have
been supplied yet, so links currently use verified official home pages without
referral attribution. Public Instagram/Nostr destinations are in the same file.

## Original WondersLand backup

Before replacing the home page, the game feature was removed and the full remaining
WondersLand source was preserved on `backup/wondersland-nostr-2026-11-02`, commit
`6ca4b6bbbd59f4ee96f5be82c805d7e9027629d1`. No published history was rewritten.
See PROJECT_STATE.md and AGENTS.md for current behavior and constraints.
