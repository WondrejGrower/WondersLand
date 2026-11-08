# Long-term jump progression · wl-0.3-journey-5

Historical journey-5 tuning. The current, explicitly easier journey-6 and
responsive/leaderboard changes are documented in [FULLSCREEN_MONTHLY.md](FULLSCREEN_MONTHLY.md).

Requested after production playtesting on 8 November 2026: small plants should
be the initial challenge; shrubs/medium transactions must matter, and sequoias
should require substantial permanent development. Small cannabis is explicitly
the last baseline practice specimen, not a species-wide fixed obstacle size.

## Changes

- Basic velocity is now 72 px/s, ascent gravity 130 px/s² and descent gravity
  170 px/s²: a ~19.9 px peak with substantially more time to cross the hitbox.
  The intermediate journey-4 release (162/570/850) had an unreasonably narrow
  19–38 ms cannabis launch window and was corrected after user feedback.
- Strength retains its ID, 50 levels and existing prices. Its height bonus is
  `14 × (level / 50)²`, replacing the old +20% square-root curve. The ordinary
  peak is still derived from energy; its ceiling is now 320 px.
- Aerial energy is capped at 1.5× the permanent ordinary peak, at most 450 px.
  This applies to double jump, the Explorer's existing one-use emergency jump
  and jetpack. Run-only leap bonuses do not raise the permanent aerial ceiling.
- Releasing jump caps remaining upward velocity at the basic impulse, including
  role/equipment and Basic Jump skill bonuses but excluding permanent Strength.
  Ascent uses the same gravity for taps and holds: quick clicks still clear
  baseline plants, and the +15% Basic Jump bonus survives a quick release.
  Holding retains the full Strength-driven trajectory for larger obstacles.
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
| Blackberry shrub | 23 px | 2 | 107 |
| Fern | 27 px | 7 | 508 |
| Birch | 48 px | 16 | 2,145 |
| Pine | 72 px | 22 | 4,636 |
| Oak | 108 px | 28 | 9,550 |
| Sequoia | 243 px | 46 | 76,134 |

At Strength 0 the gardener has 69 passing launch positions for flowers, 40 for
tulips and 22 for small cannabis. Collector/Explorer have 65, 36 and 15.
All three roles can clear baseline plants with taps as well as held inputs.
Cannabis has roughly 143–210 ms of launch tolerance; flowers/tulips allow more. A transaction's exact amount may make
another plant of the same species easier or harder. Skills, role emergency
jumps and speed affect timing/results. A theoretically possible minimum level
can be much harder for a person. Larger sequoias may still be impossible.
No claim is made about exact hours to earn the late-game cost.

Reproduce the complete machine-readable report:

```sh
node tools/jump-progression.mjs > docs/jump-progression.json
npm run test:jump-input
node web/jump-progression-browser.mjs
```

[Base cannabis practice](browser/jump-progression-newbie.png),
[Strength 46 sequoia](browser/jump-progression-sequoia.png),
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

Final checks on 2026-11-08: `npm ci`, `npm test` (38 passed),
`npm run test:browser`, `npm run test:environment`, `npm run deploy:check`
(dry-run), `./bin/build`, `./bin/test` (33 Qt and 3 Python passed), and
`node web/jump-progression-browser.mjs` all passed. The initial browser attempt
was killed with exit 137; the repeat completed successfully. The native reward
test's old high-jump collection timing was replaced with a controlled short-hop
fixture; the final suite includes successful coin collection without practice
rewards. Long-term human balancing remains to be validated by actual play.

The release smoke check also caught `/health` retaining a hard-coded old balance
version while the public balance.json already contained journey-4. Health now
reports journey-5 and has a regression comparing metadata to packaged config.
GitHub Actions cannot start because the account reports a billing lock; local
checks above were run directly. Production is verified against served assets
and actual browser execution, independently of that unavailable CI.

## Complementary starting skills

Journey-5 offers three fixed, rank-one common choices: Basic Jump (`leap`,
+15% height; later ranks +30/+45%), Time Slow (`timeslow`, 15% expedition slow;
later ranks 20/25%), and Double Jump (`double`, recharges every 10 active game
seconds). Existing IDs/purchases/profile schema are retained. An explicitly
excluded starter remains excluded. Magnet/coin abilities and researched advanced
skills remain in subsequent upgrade offers rather than the initial menu.

Time Slow multiplies Agility's existing time scale and scales the entire active
simulation once. Camp, networking, research, countdown and paused/waiting time
are unchanged. Double Jump does not recharge by landing, cannot be used twice
in one airborne sequence, and does not tick during pauses/waits/countdown.
Explorer retains its separate once-per-run emergency fallback. The HUD shows
ready/countdown in English and Czech. Practice still starts without skills.

`web/jump-input-browser.mjs` exercises actual Space/W/Up, mouse and mobile touch
handlers using browser animation frames, rather than invoking jump/tick directly.
It covers all three roles, quick clicks, early/late input offsets, shrubs
remaining blocked, the actual three-card menu and the HUD recharge transition.
It is wired into `npm run test:jump-input` and the normal GitHub workflow.

Final journey-5 verification also passed `npm run test:jump-input`'s exact
underlying build/browser command: 24 real keyboard/mouse trials and 18 real
mobile touch trials, plus ready → countdown → ready HUD transitions on both
viewports. The normal browser journey, environment browser test, late-game
practice screenshot/crossing script and deployment dry-run passed again after
the final runtime edits. The native advanced-ability tests use isolated fixture
grants instead of requiring jetpack/shield in the new three-card starting menu.
No production debug/grant entry point is exposed.
