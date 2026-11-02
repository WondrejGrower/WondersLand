# NoTillMan project state

Updated 2026-11-02.

## Preservation completed before the new site

All game feature source, its route and generated registration, styling and active
preservation rules were removed. The cleaned full WondersLand source was committed
as `6ca4b6bbbd59f4ee96f5be82c805d7e9027629d1` and verified on GitHub branch
`backup/wondersland-nostr-2026-11-02` BEFORE changing the home page.
The cleaned client passed 89 tests, TypeScript and its production build.
No browser storage, Nostr events or Git history was deleted.

## Current experience

- One botanical plant; underground/roots/leaf/flower chapters.
- Initial scroll position is at the bottom; native upward scrolling ascends.
- Dark magical colors gradually become green and sunlit.
- Higgsfield is attached to the fan leaf; FastBuds to the upper flower.
- Persistent direct links, chapter jumps, an ascent button and a return button.
- Personal bio and social links in a keyboard-accessible Radix dialog.
- Mobile support and reduced-motion styles; no Canvas/WebGL dependency.
- Actual affiliate URLs are missing. Fallback links are ordinary official URLs
  and do not claim to earn commission.
- Main route no longer mounts the previous Nostr UI. The existing NIP-05 route
  and dormant source remain; the complete cleaned archive is independently preserved.

## Source

- `src/features/creator-hub/CreatorHub.tsx`: journey and interactions.
- `src/features/creator-hub/creator-hub.css`: scoped visual system.
- `src/features/creator-hub/links.ts`: public destinations and affiliate placeholders.
- `public/images/notillman-plant.webp`: optimized generated transparent plant asset.
- `src/routes/index.tsx`: active home page; `__root.tsx`: metadata/font/favicon.

## Verification

- TypeScript: `npx tsc --noEmit` passed.
- Existing tests: 10 files / 89 tests passed.
- Production build: `npm run build` passed (client, SSR and Cloudflare module).
- Desktop and 390px browser QA passed: root start, native upward scroll and
  PageUp, all chapter jumps, leaf/flower destinations, persistent direct links,
  about/links dialog, Escape close and return to soil.
- Fixed mobile sticky-stage focus scrolling by using overflow:clip. Rechecked
  the flower: stage scrollTop 0 and the story in its intended visible position.
- Mobile viewport: width 390 / scrollWidth 390, zero canvas elements.
- Deleted game URL returns the normal 404 page; no game references remain in src.
- Plant asset is 557,248 bytes (optimized WebP with alpha); one plant is rendered.
- External link hrefs verified without generating test affiliate visits.
- Actual referral attribution awaits the owner's affiliate URLs.
- Final source-only formatting did not change application behavior.
- No production deploy, sharing change, sign-in or public Nostr publishing.

## Next required input

Wondrej's exact personal FastBuds and Higgsfield affiliate URLs. Do not guess them.
No production deployment or sharing change was performed in this task.
