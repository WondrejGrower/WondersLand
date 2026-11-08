# Playability, fullscreen and monthly community records · journey-6

This follows the user's 8 November playtest feedback. The primary target is the
browser game. Native Qt retains the same transaction dimensions, physics,
visual descriptors and existing save behavior, with its normal build/tests.
The responsive browser camera and online board are web UI features.

## Mempool comes first

A live run may start with an impossible sequoia. Transaction order is not
filtered, replaced or deferred according to amount, profile strength or viewport.
Exact satoshi, species rules, the 420 amount prefix, dimensions and the replenishing,
deduplicating queue are preserved. No safe-route guarantee is introduced.
Regression tests cover both a single first sequoia and mixed small/large queues
across seeds. The real browser/SQLite integration also starts a fresh player with
a sequoia and records that failed attempt. This is now explicit in AGENTS.md.

## More approachable abilities

The user explicitly chose to make common shrubs and ferns approachable without
permanent upgrades. Basic velocity is 90 px/s with existing ascent/descent gravity
130/170: a ~31.2 px peak. Strength uses `9 × (level / 50)²` height bonus, maintaining
late development rather than making maximum Strength excessively strong. Upgrade
IDs, purchased levels, prices and coins are preserved. Balance version is
`wl-0.3-journey-6`; the transaction height/width curves are untouched.

Ideal timing reference, Gardener, no run skills, initial speed:

| Practice model | Height | First possible Strength |
| --- | ---: | ---: |
| Flower / Tulip / small Cannabis | 10 / 17 / 20 px | 0 |
| Shrub / Fern | 23 / 27 px | 0 |
| Birch | 48 px | 12 |
| Pine | 72 px | 19 |
| Oak | 108 px | 27 |
| Sequoia | 243 px | 44 |

These are synthetic timing minima, not species gates. Amounts near the bottom
of a tree interval can still form a small, reachable sapling. Larger amounts can
remain impossible. [Machine-readable timing report](jump-progression.json).
Basic Jump +15%, Time Slow and the ten-active-second Double Jump remain intact.

## Full browser viewport

`web/viewport.mjs` chooses a uniform presentation scale and camera bounds;
physics never reads those values. The run view stays 320–640 logical pixels
wide, so a transaction spawned at x=680 remains offscreen. Portrait view shows
more sky instead of putting a tiny 16:9 strip between empty bars. Camp follows
the player; Walk to gate keeps its entrance discoverable on a cropped view.
Camp clicks/labels use the inverse/forward camera transform.

The canvas uses logical source pixels and nearest-neighbour CSS scaling, not a
DPI-dependent physics grid. Shared QML painting and EnvironmentArt clip against
the current world viewport before atlas sampling; giant-tree work still depends
on the visible area. Native painting defaults to its existing 640×360 view.

Fullscreen button / F11 requests the browser Fullscreen API and hides page
chrome. A platform without that API gets the same immersive page layout within
the browser's available viewport. Exit fullscreen remains visible; Escape exits
the fallback. True browser chrome removal remains platform-controlled.

[Desktop fullscreen](browser/fullscreen-desktop.png) ·
[Portrait fullscreen](browser/fullscreen-mobile.png).
Both are clearly marked local test fixtures, not live mempool captures.

## Persistent monthly board

A SQLite Durable Object named `MonthlyLeaderboard`, binding `LEADERBOARD`, stores
shared records outside static assets. The object name `monthly-v1` and exported
class/binding are persistent identities: do not rename/delete them casually.
Wrangler's declarative `exports` provisions the SQLite-backed class through the
existing Git → Cloudflare deployment. No database ID, third-party account or
new paid-plan setting is introduced. SQLite objects support the Workers Free
plan ([Cloudflare storage guidance](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/),
[export lifecycle](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)).

Monthly views sort by best run, total metres, or attempt count. UTC completion
time is assigned by the server. A run is an attempt after confirming its starting
skill; even ending at 0 m counts. Merely opening/cancelling skill selection does
not count. Training/replay never issue eligible run tickets or publish results.
Previous months remain in SQLite; no pre-launch local lifetime records are
invented as historical monthly data. Ruleset updates do not erase that history.

Each browser installation has a private random key, stored separately from
wl-progress. The server stores its hash, never exposes it in public rows, and
binds short-lived run tickets to it. Duplicate starts/finishes are idempotent.
Input bounds, same-origin checks, request-size limits, rate limits and elapsed-
time/distance plausibility checks protect the write API. Restart, timeout and
month-rollover tests use actual SQLite. IP rate identities are hashed.

This is explicitly a **community** board: scores come from the browser and are
not a competitive anti-cheat proof (`verified:false`). The future 1000-satoshi
ranked mode requires a separate authoritative mempool snapshot, simulation/
input validation, identity and payment design. No entry fees, wallet actions or
payouts are implemented here; these community submissions must not authorize them.

The live starting-skill screen explains that names/results are public before
the player confirms the run. Names are public and not reserved. A browser key identifies an installation,
not a verified human/account; clearing browser storage creates another identity.
Profile exports do not contain the private key. Local character reset preserves
public records and tells the player so. Cross-device account merging is not
implemented. A bounded 20-result outbox retries transient failures; the main
profile and gameplay continue even if the score service is unavailable. Expired
or invalid results are labelled unranked rather than fabricated as successful.

The public API is `/api/leaderboard` (GET), `/api/leaderboard/start` and
`/api/leaderboard/finish` (POST). Networking occurs at run start/end, retry,
and board navigation, never per rendered frame. Public reads return at most 50
rows. Current month is selected from the server response; archived month and
metric can be changed in the menu. All new UI labels have English/Czech entries.

[Desktop board](browser/monthly-leaderboard-desktop.png) ·
[Mobile board](browser/monthly-leaderboard-mobile.png).
Screenshots contain explicitly labelled local fixtures, never production scores.

## Reproduction and local verification

Node.js 24+ is required for the test suite's built-in SQLite adapter; CI uses 24.
No new npm dependencies were added.

```sh
npm ci
npm test
npm run test:browser
npm run test:jump-input
npm run test:monthly
npm run test:results
npm run test:roles
npm run test:input-feed
npm run test:inventory
npm run test:environment
npm run deploy:check
./bin/build
./bin/test
```

Observed locally on 2026-11-08: 43 Node tests passed; normal browser journey,
54 real keyboard/mouse/touch trials, browser/SQLite monthly integration,
results, roles, queue refill/input, inventory and environment browser suites
passed. The native build, 33 Qt tests and 3 Python tests passed. Deploy dry-run
passed. A real local `wrangler dev` Workerd instance also issued/finished a
run ticket and persisted/read its attempt through the actual SQLite binding.

Browser integration checks viewport coverage, actual fullscreen, API-disabled
fallback, frozen hitbox/time during fullscreen changes, a first live sequoia,
two browsers sharing one board, duplicate finish, zero-distance attempt,
selection cancellation, training and recorded-mode exclusion, and all ranking
tabs. SQLite tests additionally cover UTC rollover, storage recreation, missing
credentials, expired tickets, invalid/implausible results and offline retry.
GitHub Actions remains subject to the previously documented account billing lock.
