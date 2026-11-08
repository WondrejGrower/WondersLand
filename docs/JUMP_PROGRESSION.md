# Long-term jump progression · wl-0.3-journey-4

Requested after production playtesting on 8 November 2026: small plants should
be the initial challenge; shrubs/medium transactions must matter, and sequoias
should require substantial permanent development. Small cannabis is explicitly
the last baseline practice specimen, not a species-wide fixed obstacle size.

## Changes

- Initial held jump velocity 285 → 162 px/s: theoretical peak ~71.3 → 23.0 px.
- Strength retains its ID, 50 levels and existing prices. Its height bonus is
  `14 × (level / 50)²`, replacing the old +20% square-root curve. The ordinary
  peak is still derived from energy; its ceiling is now 320 px.
- Aerial energy is capped at 1.5× the permanent ordinary peak, at most 450 px.
  This applies to double jump, the Explorer's existing one-use emergency jump
  and jetpack. Run-only leap bonuses do not raise the permanent aerial ceiling.
- Releasing jump caps remaining upward velocity at 120 px/s. Late-game players
  can still make short hops to collect coins; a tap need not launch a 300 px jump.
  Holding retains the full Strength-driven trajectory. No midair position clamp.
- The shared renderer follows jumps above 180 px with a whole-pixel vertical
  camera shift. The character stays visible. It never rescales transaction art,
  changes world-space collisions or depends on viewport/DPI.
- Cvičiště/Training Grounds shows actual ordinary jump height before/after the
  next purchase instead of an unwieldy percentage. New descriptions are EN/CS.
- Practice cannabis is exactly `420000` satoshi, 20 px. Other cannabis amounts
  retain their own true height; the 420 prefix remains solely a species override.

Transaction amount/size/species curves, visual descriptors, queue, randomness,
coin awards, upgrade prices, roles and inventories are unchanged. Existing
purchases, coins, unlocked features and lifetime records are preserved. New
balanceVersion separates future versioned records; it does not reset profiles.

## Timing reference

These are **synthetic ideal timing tests**, not live mempool and not difficulty
tiers. They run the actual web simulation at 120 Hz, sweep integer launch
positions and check the entire rectangular collision width. Gardener, full
held jump, initial speed, no run skills/equipment bonuses:

| Practice plant | Height | First possible Strength | Total upgrade cost |
| --- | ---: | ---: | ---: |
| Flower | 10 px | 0 | 0 |
| Tulip | 17 px | 0 | 0 |
| Small cannabis | 20 px | 0 | 0 |
| Blackberry shrub | 23 px | 4 | 241 |
| Fern | 27 px | 7 | 508 |
| Birch | 48 px | 15 | 1,871 |
| Pine | 72 px | 21 | 4,095 |
| Oak | 108 px | 28 | 9,550 |
| Sequoia | 243 px | 45 | 67,934 |

At Strength 0 the gardener has 24 passing launch positions for flowers, 12 for
tulips and only 4 for small cannabis. All roles can clear the small cannabis
fixture with a held jump; a tap cannot. A transaction's exact amount may make
another plant of the same species easier or harder. Skills, role emergency
jumps and speed affect timing/results. A theoretically possible minimum level
can be much harder for a person. Larger sequoias may still be impossible.
No claim is made about exact hours to earn the late-game cost.

Reproduce the complete machine-readable report:

```sh
node tools/jump-progression.mjs > docs/jump-progression.json
npm run build
node web/jump-progression-browser.mjs
```

[Base cannabis practice](browser/jump-progression-newbie.png),
[Strength 45 sequoia](browser/jump-progression-sequoia.png),
[the same late-game jump on mobile](browser/jump-progression-sequoia-mobile.png).
All screenshots are explicitly labelled practice fixtures. The browser script
also advances through the entire crossing and asserts survival.

## Verification

Unit coverage includes initial cannabis versus shrubs for every role, held/tap
control at low/high Strength, locked and reachable development checkpoints,
unchanged plant geometry, preserved saves and bounded aerial energy. The
shared QML paint path is exercised with player heights through 450 px to check
visible character placement and unchanged obstacle dimensions. Twenty-four
shared role/level fixtures compare web and Qt velocities and aerial limits.
`tools/analyze.py` now reads physics and development references from balance
instead of retaining old hard-coded 285/110/170 jump assumptions.

Final checks on 2026-11-08: `npm ci`, `npm test` (36 passed),
`npm run test:browser`, `npm run test:environment`, `npm run deploy:check`
(dry-run), `./bin/build`, `./bin/test` (32 Qt and 3 Python passed), and
`node web/jump-progression-browser.mjs` all passed. The initial browser attempt
was killed with exit 137; the repeat completed successfully. The native reward
test's old high-jump collection timing was replaced with a controlled short-hop
fixture; the final suite includes successful coin collection without practice
rewards. Long-term human balancing remains to be validated by actual play.

The release smoke check also caught `/health` retaining a hard-coded old balance
version while the public balance.json already contained journey-4. Health now
reports journey-4 and has a regression comparing metadata to packaged config.
GitHub Actions cannot start because the account reports a billing lock; local
checks above were run directly. Production is verified against served assets
and actual browser execution, independently of that unavailable CI.
