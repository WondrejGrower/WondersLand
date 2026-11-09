# WondersLand · source map for reviews

One JavaScript/Canvas game for browser and installed desktop/mobile PWA.
Start with AGENTS.md, BALANCE.md, BROWSER_TARGET.md and SECURITY_HARDENING.md.
Earlier C++/Qt/QML review instructions are historical and superseded.

- web/core.mjs: shared game simulation and progression.
- web/app.mjs: menus, keyboard/mouse/touch input, persistence and startup.
- web/timing.mjs: fixed 120 Hz simulation, 60/144 FPS cap and visual interpolation.
- web/art.mjs, pixels.mjs, environment.mjs: Canvas scenes, characters and plants.
- web/sprites.mjs, environment-regions.mjs: generated sprite/atlas data.
- web/plant-visual.mjs: deterministic TXID-based plant morphology.
- web/progress-validation.mjs: structural validation used by client/server.
- web/worker.mjs, verified-worker.mjs, verified-simulation.mjs, verified-client.mjs:
  server-verified runs, profile operations, transport and prediction.
- web/leaderboard-worker.mjs: persistent monthly history and shared object.
- web/pwa.mjs, sw.js and manifest.webmanifest: installation and offline notice.
- src/balance.json and src/i18n/cs.json: game configuration and translations.
- web/*.test.mjs: Node and browser checks; exact commands in package.json.
- tests/: retained migration, morphology and balance fixtures; Python analysis tests.

Preserve exact satoshi strings, first-transaction sequoias, no-replay data waits,
schema 5, legacy imports and persistent server IDs. Training/replay gives no
permanent rewards. Coins are not bitcoin. No payments exist. Server-simulated
inputs do not prove human identity or paid-ranked readiness.

The duplicate Qt application/build chain is retired. Existing user files and
previous monthly results must not be deleted. Source preparation is local;
consult the verification documents before claiming anything was deployed.
