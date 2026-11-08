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

## Actual production verification

The original site was replaced through a normal Git main merge, not a force
push, with archive/history preserved. Deployment commit 7a0f0bc received
**Workers Builds: wondersland — success** (Cloudflare version
`e017148e-eafb-4342-991f-f3b965ba7aaa`). Actual checks on wondersland.online:

- GET /health: HTTP 200, application WondersLand [WL], version 0.3.1,
  balance wl-0.3-journey-2.
- GET /: HTTP 200, WondersLand game HTML instead of the old website.
- GET /api/mempool: HTTP 200, 10 genuine recent transactions.
- www.wondersland.online: HTTP 301 to wondersland.online.
- A fresh Chromium profile loaded Czech, created a synthetic Willow character,
  entered the live portal, chose a skill and ran the actual deployed client;
  no JavaScript errors. [Live camp](browser/live-domain-camp-cs.png),
  [live run](browser/live-domain-run-cs.png). These use the real Worker endpoint,
  unlike the explicitly recorded dataset in the comparison screenshots.

GitHub Actions did not start its runner: GitHub's annotation says the account
is locked due to a billing issue. This is not reported as passed CI. The
separate Cloudflare Git integration did run and deploy successfully. Unit and browser tests passed locally. GitHub Actions verification remains
blocked by the account, separately from the Cloudflare Git deployment.
The CLI Cloudflare login remains unnecessary for the working Git deployment.

Follow-up browser checks confirmed native save import (coins and Strength),
2× DPI, and persistence of both language choices after reload. The initial
?lang=cs parameter is consumed after storing the preference, so it cannot
silently override a later English choice. Fractional fuel/glide values also
format with the selected locale in both clients.

Final production source commit **ccf48d4** also received
**Workers Builds: wondersland — success**, build
`99bd3b40-7ffb-4986-bfa0-e89ebde4e65f`, deployed version
`a8975a0f-6db7-4386-9573-5b7dcaabfe62`. The published app.mjs was checked for
the final locale-formatting code. The unnecessary nested npm prebuild hook
was removed; the explicit build/deploy dry-run and 14 local tests pass.
A fresh live browser profile confirmed ?lang=cs stores Czech, removes the
one-time parameter, and a later English choice survives reload without
JavaScript errors. GitHub Actions remains separately blocked by billing.

## Results and long-run rendering fix

The generated Canvas renderer used `t` both for animation time and translation.
A flying upgrade label (after 30 seconds) or tall-canopy label called the
numeric animation clock, throwing `t is not a function` and preventing the
interface from updating. Generated renderer functions now use a distinct
`wlTranslate` callback while keeping animation timing unchanged.

Space is reserved for jumping: menu keydown AND keyup suppress browser-default
button activation. Enter is handled explicitly without auto-repeat; E and
mouse activation remain supported. Result actions read Try again / Return to
Base Camp, with a visible navigation hint. Saves and reward logic are unchanged.

`npm run test:results` reproduces a synthetic giant collision with jump held
across death, repeated/fresh jump presses on the results, explicit retry from
0 m, and keyboard return to camp. It also directly renders a flying upgrade
and a tall tree and checks both translated labels. The test passes and checks
caught error UI as well as uncaught browser exceptions. Unit/Python checks and
Wrangler deploy dry-run also pass. No synthetic fixture is used in production.
The complete Chromium journey also passed after the input change (creation,
menus, live-language switching, reload persistence, purchase, native-save import,
reset and window/DPI variants). The updated Czech/English result captures show
the two explicit actions and navigation hint.


## Permanent roles selected at creation

The later explicit role instruction supersedes gradual class unlocking and
free camp changes. The character creator offers Gardener, Explorer and
Collector immediately, with effects and a clear permanent-choice notice.
Camp/home/training no longer contain role-switch controls; both C++ and
browser compatibility changeClass methods refuse changes. Creation itself
refuses to replace an existing character. Only the existing confirmed reset
opens a new choice. The progression configuration no longer contains a
classes milestone. Old pending classes notices are removed on load without
changing the character's selected class, coins, equipment or purchased levels.

QtTest: 26 passes, Python: 3 passes. Browser/core coverage includes each of
the three creation choices, refusing edits, save/reload, old notices and reset.
The dedicated actual-Chromium `npm run test:roles` verifies keyboard selection
of all three roles, absent camp switches, retained coins and level after load,
and availability after reset. [Czech role picker](browser/creation-role-cs.png).
The full browser journey and the long-run/results regression also passed with
the fixed-role creator enabled. Updated Training Grounds captures no longer
show role switching. These UI changes preserve existing character data.

## Keyboard and continuous transaction reserve · 2026-11-08

Browser controls now use physical WASD/E/F/P/B codes, independent of Shift,
Caps Lock and the selected keyboard layout. Text inputs retain normal typing;
closing a sheet releases its hidden input focus. Browser shortcuts with
Ctrl/Alt/Meta do not become game actions.

The live recent feed now uses one scheduled, non-overlapping request with a
12 s timeout. During expeditions a reserve below 40 polls every 5 s; otherwise
checks are 15 s apart and skip networking at 80 pending transactions. Camp
stops fetching at 20; hidden tabs make no feed requests. Failures back off
from 5 s to 60 s. Recorded playback loads once. The browser bypasses its HTTP
cache; the Worker shares recent results for 5 s at the edge. There is no
network request per animation frame or per obstacle. Upstream still supplies
only its latest ten real transactions per response; if unavailable or unchanged,
the game honestly waits, never inventing or reusing TXIDs in the same run.

18 unit/integration tests pass. `npm run test:input-feed` passes in Chromium:
uppercase/physical WASD in camp and menu, exhaustion of ten synthetic zero-value
transactions, refill with ten distinct IDs, countdown and continuation to 20.
Synthetic rows exist only in tests. Feed tests also cover reserve limits, hidden
tabs, backoff/recovery and one-shot recorded playback.

The full Chromium journey also passes (creation, held confirmation, menus,
languages, persistence, purchase, import/reset and four viewport sizes).
Wrangler deploy dry-run passes with the two new client modules included.

## Character inventory and Training Grounds explanations · 0.3.2

The 16 hairstyle variants, initial outfits, independent clothing inventory,
shared animated layers and schema-5 migration are implemented in both clients.
All five Training Grounds stats now explain their real effects in English and
Czech. See [the verification report](CHARACTER_INVENTORY_VERIFICATION.md) for
commands, observed checks and desktop/mobile/Qt captures.

## Botanical camp, Agility and clothing motion · 0.3.3

New camp/plant art, 420 cannabis, the capped 2% Agility time scale and corrected
wearable attachment/deformation are implemented in both clients. See
[the verification report](BOTANICAL_TIME_VERIFICATION.md) for observed checks,
startup/per-frame work and the full/isolated clothing pose captures.
