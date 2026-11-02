# NoTillMan handoff

Read AGENTS.md and PROJECT_STATE.md first. The user's latest request replaces the
main WondersLand interface with a personal NoTillMan website, after removing the
game and creating a verified GitHub backup of the rest.

Backup: branch `backup/wondersland-nostr-2026-11-02`, commit
`6ca4b6bbbd59f4ee96f5be82c805d7e9027629d1`. It contains the cleaned complete
Nostr client and deferred 3D source. Never overwrite or force-update that backup.

The active feature is under `src/features/creator-hub/`. The scroll container
starts at its bottom, and progress is the inverse scroll fraction. Native scrolling
is not intercepted. Chapter/ascent controls move this same container. A single
plant image moves through the viewport with CSS transforms and brightness; the
background/ink/accent interpolate from dark roots to sunlit flower.

Important: `.hub-stage` uses overflow:clip so focusing chapter controls cannot
silently scroll the sticky stage itself. Do not replace this with overflow:hidden.
Chapter controls must retain aria-label even when their visual text is hidden.
Reduced-motion users get instant chapter jumps and no ambient animations.

Affiliate destinations live in links.ts. Both affiliateUrl values are null until
the user supplies actual URLs; official brand destinations are honest fallbacks.
Do not call those fallback links commission-earning or add fake codes.

Do not mount old AppShell, Nostr sign-in or world code on the creator route. Keep
the existing public NIP-05 endpoint and error sanitization. No new services are
needed. Current Lovable credits are exhausted; normal GitHub commits still sync.

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
