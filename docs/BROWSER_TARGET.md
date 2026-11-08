# Primary target: wondersland.online

On 2026-11-08 Wondrej first specified browser delivery, then explicitly chose
the apex **wondersland.online** and asked to remove the old website there.
The game is the replacement. Earlier notes about preserving the old website
on main describe historical scope and are superseded by this explicit request.

A working browser client now lives in web/ (Canvas/ES modules), with a
Cloudflare Worker and a repeatable root npm build. Native Qt/QML remains
functional in src/. Balance, translations and art are shared. The simulation
ports have separate runtime code and tests; their RNG streams are not claimed
to be identical. Preserve IDs, exact decimal satoshi strings, schema 4, camera
independence and migration behavior across both implementations.

Build/deployment: CLOUDFLARE_DEPLOYMENT.md.
Actual verification/deployment status: BROWSER_VERIFICATION.md.
The original website survives in archive/website-before-game-2026-11-08 and
Git history, with its separate local checkout untouched.
