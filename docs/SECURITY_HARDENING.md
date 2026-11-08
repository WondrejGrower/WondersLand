# Security fixes, server progression and temporary admin test

2026-11-08. Implements Wondrej's security-fix request and explicit choice of a
**separate server-controlled profile**, preserving personal local progression.
Application 0.3.3 and mechanical balance `wl-0.3-journey-6` are unchanged.
Verified simulation protocol has its own `verified-1` version.

## What changed

| Audit finding | Implemented fix |
| --- | --- |
| S1: invented community score | Retire raw `/api/leaderboard/start` and `/finish` with HTTP 410. New verified runs accept only sequenced controls; the server simulates the game and awards its own result. No client score/build imports. |
| S2: API/storage amplification | Native Cloudflare rate bindings before DB/upstream, bounded local/DO backstops, indexed ranking queries and month lists, short public read/negative caches, coalesced live-source requests, bounded bodies, sessions and registrations. |
| S3: names mistaken for identities | Server-assigned public profile IDs, ownership by private installation key, no caller-selected public ID, explicit pseudonym labels, registration limits; historical entries also display an ID. This does not verify human identity or eliminate distributed Sybil attacks. |
| S4: malformed profile/import | One structural validator shared by Qt and web, bounded fields/collections, checkpoint consistency, reject dangerous object keys, prepare imported game before replacing active state. Rejected files remain intact. |
| S5: unbounded upstream data | Streaming byte/time bounds, row/type/decimal length checks, canonical satoshi, equal Bitcoin maximum in Qt/web, native reply buffers/content-length/readyRead limits and file limits. |
| S6: headers | Same-origin script/worker/connect CSP, no objects/base/forms/frames, nosniff/frame/referrer/permission headers on all responses; 30-day HTTPS HSTS without includeSubDomains/preload. Inline **styles**, used by the existing UI, remain permitted; inline scripts/eval do not. |
| S7: mutable CI dependencies | Pin official Actions to verified full SHA refs, weekly dependency audit, Dependabot, mobile/PWA/verified tests. Cloudflare builds also run Node tests and npm audit before building assets. |

No third-party login, analytics, notifications, payment or deployment credential
is added. Account-level 2FA, GitHub billing/branch protections and Cloudflare
account policies are external settings, not asserted fixed by source changes.
The documented GitHub Actions billing issue still needs account-level resolution
if present; the checked Cloudflare build prevents skipping core tests/audit.
Default invocation logs are disabled; code never logs credentials. `.node-version`
selects Node 24, and local Wrangler uses HTTPS to exercise secure cookies.

## Verified gameplay and storage

Choose **Verified runs** in camp. Create a separate server profile starting at
zero coins/upgrades; its role/name are selected from the local character once.
Local saves, imports and admin-test currency never become authoritative state.
The verified run freezes its starting build/skill availability; research elapsed
during that run is applied when the server profile is next opened in camp.
Server purchases, equipment, research and skill exclusions enforce the same
balance gates/costs, and purchases are atomic. Local normal/training/replay
modes remain available and do not publish verified scores.

The existing SQLite Durable Object class/binding/name remains
`MonthlyLeaderboard` / `LEADERBOARD` / `monthly-v1`. New `verified_*` tables are
additive. The original `scores`/`tickets` are preserved, with historical scores
read-only and clearly unverified. Pending old browser outboxes stay private and
are never promoted into verified results. The board switches between new
server-verified results and historical community records; both offer monthly
best, total metres and attempts. New results are segmented by balance version.

The server fetches actual recent mempool transactions, caches that source for
at most five seconds, chooses the seed, and freezes the run's profile. **Its
first transaction may be an impossible sequoia.** No safe-start filters exist.
Only approved replenishment is applied to the predicted browser game, at an
acknowledged frame; the client feed cannot inject transactions into that run.

Verified POST bodies are buffered with byte/time limits at the edge before the
shared object reserves a simulation slot. Starts and simulation have separate
concurrency pools. Background replenishment cannot stall simulation while an
approved reserve remains; live-source failure never triggers a replay.

The browser predicts the same simulation at 120 fixed steps/second and sends
about one batch per second. A batch contains only run ID, sequence, frame count
and bounded input events. The server validates ownership, elapsed-time budget,
sequence and events, then computes collisions, rewards and progression itself.
Acknowledgements reconcile later predicted inputs. No client-provided metres,
coins or upgrades are accepted. Lost responses retry idempotently. Two seconds
of unacknowledged prediction is the maximum; further simulation freezes while
reconnecting. Pauses/data waits still consume no game time/metres/abilities.

Run state is persisted by the server. Expired snapshots are settled and cleared
in bounded batches before accepting more sessions, so abandoned runs do not
accumulate full game snapshots indefinitely. Closing/reloading does not replay an
unconfirmed tail: **Settle interrupted run** ends at the last confirmed state,
then another run can start. An old rules/protocol session cannot be simulated
with updated physics; close it without applying a different ruleset. Existing
permanent server progress remains. Tabs cannot share an active run concurrently.
A server profile never overwrites the local character when leaving the mode.

Bounds: 2-hour server session, 240 frames/64 input events/16 KiB per batch,
512 KiB snapshot, one run slot per owner, 128 stored active sessions (four simulation batches, two starts, four controls in flight), 10,000 server
profiles and five new profiles/day/source IP. Owner operation limit is 90/min;
DO backstops and perimeter limits provide additional bounds. Native edge rate
limits are approximate **per Cloudflare location**, not a globally precise
anti-DDoS guarantee. Persistent monthly history still needs normal operational
storage monitoring over the project's lifetime.

**Verified means server-simulated inputs**, not proof of a human player, bot
resistance, a globally fair mempool draw, or financial ranked security. There
is no 1000-sat entry, custody or payout. A paid mode still requires its own
identity, payment, abuse and fairness review. The browser key is a bearer
credential; keep it private. Clearing/separating browser storage creates a new
identity; profile exports do not contain the key or restore ownership.

## Temporary administrator `/test`

`/test` is gated by a short-lived ECDSA P-256 signed capability. Only its public
verification key and expiry are deployed. The private key and access URL/QR
remain **outside the checkout**; never commit them or print them to logs.
A link places the capability in the URL **fragment**, not the HTTP query/path.
The login script clears the fragment, posts to a same-origin session endpoint,
and gets a Secure, HttpOnly, SameSite=Strict host cookie (8-hour lifetime,
also limited by the signed 24-hour deadline). An expired/modified link or an
unauthenticated visit cannot open the test game. A bounded same-origin lease check also revalidates open test pages. Test pages use `no-store` and
the PWA worker never caches them. `/test/` redirects to the canonical `/test`.

The same game/rendering/mempool runs there with coins replenished to a safe
integer balance and shown as **∞**. Other unlocks, prices, stats and gates still
apply. The test character starts as a copy of the local character, then uses
`wl-admin-test-progress` and separate migration/import backups. It is visibly
marked ADMIN TEST. Verified entry is hidden; no test run publishes a score.
Test exports are marked and normal UI rejects importing them as regular play.
Editing client code cannot inject admin coins into a server profile.

Renew access by generating a new public verifier and **private output outside
the repository**, then deploy the verifier:

```
node tools/create-admin-test-access.mjs --output /private/new-directory
```

The tool refuses existing private key output and directories within the
checkout, writes mode-0600 key/access files in a mode-0700 directory, optionally
makes a QR with `qrencode`, and never prints the capability. Rotating the public
key immediately invalidates old capabilities after deployment. Do not make the
entire root app an admin mode and do not add a client-side password check.

## Verification

- `npm test`: targeted forgery/ownership/sequence/timing/retry/race tests, legacy
  migration, indexed query plans, body timeout/cancellation, invalid imports,
  headers/rate bindings, signed token validation and shared Qt/web fixtures.
- `npm run test:verified`: actual mobile browser + local SQLite worker, separate
  profiles, first sequoia, authoritative result, reload, preserved local save,
  and an explicitly local admin UI fixture. Gate cryptography is tested
  independently; that fixture is not evidence of production authentication.
- Existing browser, input, mobile, PWA, monthly, inventory, environment and native
  checks cover regressions. Native profile rejection tests assert original bytes
  remain unchanged. The checked deploy dry-run bundles the real worker/DO/rate
  bindings. Physical mobile testing is still required.

[Verified result preview](browser/verified-run-mobile.png) ·
[Local admin UI test preview](browser/admin-test-mobile.png).
These are labeled local test fixtures, not production mempool screenshots.

References: [Cloudflare rate-binding scope](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/),
[GitHub Action SHA pinning](https://docs.github.com/en/actions/reference/security/secure-use).

Observed locally: 61 Node tests, all existing browser suites (including 54
keyboard/mouse/touch trials), mobile/PWA/verified/monthly integration, native
build plus 35 Qt and 3 Python tests, and checked deployment dry-run passed.
A real local Workerd instance with HTTPS, native rate bindings and SQLite also
passed live-source simulation and duplicate finish, plus real signature/cookie
authorization of the test page. No fake production leaderboard entries are used.
