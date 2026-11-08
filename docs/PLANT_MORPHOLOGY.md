# Transaction plant morphology · graphics version 1

The amount remains the sum of transaction outputs, stored as canonical decimal
satoshi. `balance.json`, height/width curves, species thresholds, 420 prefix,
physics and balanceVersion are unchanged by this work. Existing practice-model
and progression edits in the working tree are separate changes.

`src/PlantVisual.js` is the shared Qt-compatible descriptor implementation.
FNV-1a operates on ASCII TXID characters with explicit unsigned 32-bit wrapping.
It chooses four architectures, reflection and three restrained stem/bark accents.
Amount selects four growth bands using logarithmic interval progress (linear
for flowers). Sequoias use height relative to 243–972 px; cannabis uses height
relative to 4–16 px. These bands saturate; mechanical height keeps growing.
Different TXIDs can collide visually; uniqueness is neither required nor promised.

The descriptor is stored as `plant.visual` at spawn, including in trace events.
Practice keeps TXID empty and uses `fixture:<type>:<sats>:<training-model-id>`.
Legacy traces use a stable fallback (`legacy` fixture when no ID exists), with
a 256-entry FIFO cache. No profile migration, random calls, network changes or
queue changes are required. Descriptor generation does not advance gameplay RNG.
Qt's backend calls the same bundled source through a retained QJSEngine.
The checked-in web adapter is regenerated with:

```sh
node tools/sync-plant-visual.mjs
```

Tests reject a stale adapter. `web/build.mjs` packages the source directly for
browser use and wires the shared renderer import; resources.qrc bundles it for
Qt. No new PNG or atlas coordinates are needed. The existing transparent atlas
supplies botanical crown and shoot modules (upper 67% for tree crowns). Stems,
bark marks and atlas modules compose whole-pixel plants. Crown envelopes differ
for broad oaks, oval birches and tapered conifers; four architectures alter crown
width, asymmetry and subsidiary shoots. Amount controls whorl/shoot counts.

The renderer clips each module before drawing, including against the ground,
and computes the first visible whorl arithmetically. Crown height is at most
32 logical pixels, independent of transaction height. Stem and bark work is
viewport bounded. There is no plant-sized bitmap or unbounded sprite cache.
Atlases remain loaded once. Geometry stays frozen on each obstacle; the art
never changes collision dimensions. Collision remains the existing rectangle,
not per-leaf collision: transparent spaces between leaves are still inside it.

## Review gallery and verification

[Full synthetic gallery](browser/plant-morphology.png) uses one image pixel per
logical game pixel, three amounts per species and four TXID variants at the
middle amount. Dashed boxes show collision dimensions. This is explicitly test
data, not live mempool. Open the PNG at 100% to inspect the small meadow plants.
[Desktop practice run](browser/plant-run-desktop.png) and
[390×844 mobile practice run](browser/plant-run-mobile.png) use the actual game
renderer and jump simulation. [Native Qt run](browser/plant-run-native.png)
was also rendered through the software backend with `preview --runner`. Reproduce these assets after `npm run build`:

```sh
node web/plant-preview.mjs
```

Performed on 2026-11-08:

- `npm ci`: passed, 0 reported vulnerabilities.
- `npm test`: 32 passed, including amount boundaries/anchors, 420 semantics,
  deterministic descriptors/draw operations, four architectures for each species,
  RNG isolation, frozen incoming obstacles, waiting resources and bounded clipping.
- `npm run test:browser`: passed (journey, keyboard, language, profile/reset,
  purchases, identity, retry and four viewport sizes).
- `npm run test:environment`: passed (atlas loading/transparency, cannabis,
  agility explanation and clothing; uses the new renderer).
- `npm run deploy:check`: passed, dry-run only; no production deployment.
- `./bin/build`: passed.
- `./bin/test`: 31 Qt tests and 3 Python tests passed. This includes 63 shared
  fixture rows checked by Node and Qt for exact dimensions and visual descriptors.
- `node web/plant-preview.mjs`: passed without browser errors; screenshots above.

The existing queue tests verify replenishment during a run, deduplication,
exhaustion without replay and countdown resumption. The queue implementation was
not modified. Automated jump simulation and screenshots do not replace extended
human playtesting. Finite four-way silhouettes can repeat; at 4–12 logical pixels,
meadow variants necessarily have fewer visible details than trees.

The native runner smoke test caught a shutdown double-free with a process-static
QJSEngine (stack in QV4 compilation-unit/engine teardown). The engine now belongs
to Backend, so it dies before application/global Qt teardown. The final runner
preview exits normally; the build and full native suite were repeated afterwards.

## Files changed for this task

- `src/PlantVisual.js`, `src/EnvironmentArt.js`: descriptor and shared modular art.
- `src/backend.cpp`, `src/backend.h`, `web/core.mjs`: descriptor capture at spawn;
  backend owns its JS engine.
- `src/resources.qrc`, `web/build.mjs`, `web/plant-visual.mjs`,
  `tools/sync-plant-visual.mjs`: resource/build and generated web adapter.
- `web/environment.test.mjs`, `tests/game_tests.cpp`, `tests/plant-visual.json`:
  regression coverage and cross-runtime fixtures.
- `web/plant-preview.mjs`, `docs/browser/plant-*.png`: reproducible review assets.
- `assets/runtime/README.md`, this document: graphics and verification notes.

The branch is `codex/plant-morphology`, based on current `game/roguelite-0.3`
(`797aa31`). Both remote main and game/roguelite-0.3 were verified at that commit.
The checkout already contained uncommitted practice UI/progression work before
this task. Those changes were retained; overlapping files include backend,
core and game tests. At initial handoff no commit, push or deployment was performed. The subsequent
explicit user request authorizes publishing these changes together with the
existing updated training catalogue.
