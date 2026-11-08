# Browser verification · 0.3.1

- npm build succeeds and generates the actual browser client in dist (~85 KB
  before transfer compression, including configuration and public sample).
- npm test: 14 unit/integration checks pass for mapping, queue, resets,
  cumulative progression, rewards/training, physics caps/fuel, transaction
  identity, migration/recipes, research/classes, cancelled selection,
  milli-coin accumulation, Worker API allowlist/failure and canonical redirect.
- Native version: QtTest 25 passes and Python 3 passes; see JOURNEY_VERIFICATION.md.
- Actual Chromium browser journey passes: creation with letter input, both
  direction key sets, held E cannot select on the next screen, portal,
  three skills, run, exact collision TXID, next run at 0 m, camp, station
  purchase, live English/Czech change and persistence after character reset.
- Native schema-3 progress import is checked through the browser's file input
  and keyboard confirmation, retaining coins and stat level. Export is available.
- Browser resize/click positions exercised at 1280×720, 1366×768, 1920×1080,
  640×520; an additional render at 2× device pixel ratio checks the high-DPI view.
- Ten English/Czech screen captures inspected. Test progress is synthetic;
  run/result captures use the explicitly marked reward-free recorded dataset
  of 10 actual public TXs. Production defaults to the Worker live endpoint.
- Wrangler 4.158.0 deploy dry-run passes, with ASSETS binding and automatic build.

| Screen | English | Čeština |
| --- | --- | --- |
| Camp | [image](browser/camp-en.png) | [image](browser/camp-cs.png) |
| Skills | [image](browser/skills-en.png) | [image](browser/skills-cs.png) |
| Training Grounds | [image](browser/training-en.png) | [image](browser/training-cs.png) |
| Results | [image](browser/results-en.png) | [image](browser/results-cs.png) |
| Settings | [image](browser/settings-en.png) | [image](browser/settings-cs.png) |

[High-DPI camp](browser/camp-dpi2.png).

The browser and native versions share data/art, with separately tested runtime
ports. Cross-runtime RNG equivalence, Safari/Firefox/mobile touch ergonomics,
authoritative online economy and automatic save sync are not claimed. Desktop
keyboard/mouse is the tested browser target. Progress is local to a browser
profile; deleting its storage removes it unless exported. Amounts remain exact
strings/BigInt; mechanical curve interpolation intentionally uses floating point.
Balance thresholds remain draft and have no long-term human calibration.

Production deployment verification is recorded below after publishing. A
successful build or dry-run alone is not a claim that the domain changed.
