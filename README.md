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

On entry, the night photograph automatically moves below the surface and reveals
Wondrej’s bio underground. No click is required. The visitor then scrolls upward,
uses the chapter markers, or presses the ascent button. Reduced motion skips the
intro; a Skip intro control is also available. Returning to the bio does not replay
the photograph. Key links remain available throughout the main journey.

## Destinations

Edit `src/features/creator-hub/links.ts` to configure real affiliate URLs. None have
been supplied yet, so links currently use verified official home pages without
referral attribution. Public Instagram/Nostr destinations are in the same file.

## Original WondersLand backup

Before replacing the home page, the game feature was removed and the full remaining
WondersLand source was preserved on `backup/wondersland-nostr-2026-11-02`, commit
`6ca4b6bbbd59f4ee96f5be82c805d7e9027629d1`. No published history was rewritten.
See PROJECT_STATE.md for the current implementation and verification.
