# One game for browser and installed PWA

Wondrej explicitly chose on 2026-11-09 to maintain one browser implementation.
Desktop and mobile installation use the PWA. The duplicate C++/Qt runtime,
QML UI, native tests and Arch package/build chain have been retired from the
working source; their history remains in Git. No installed native application
or its personal files are removed by this source change.

The Canvas renderer is ordinary source in web/art.mjs and web/pixels.mjs.
There is no build-time extraction from QML and no manually synced JS copy.
web/core.mjs is the same simulation imported by browser, PWA and server.
Balance and Czech translations stay in src/balance.json and src/i18n/cs.json.
Old Qt schema 3/4/5 exports remain importable without resetting progress.

Settings offers 60/144 FPS (default 144); requestAnimationFrame follows the
actual display. A 60 Hz display cannot display 144 different frames/second.
Simulation always uses 120 fixed steps/second, with presentation interpolation
between steps. Frame-rate choice does not change collisions or rewards.
See [architecture and verification](WEB_PWA_TIMING.md).

The production game replaces the original website on wondersland.online,
as explicitly requested on 2026-11-08. The old website remains preserved in
archive/website-before-game-2026-11-08 and Git history. Build/deploy configuration:
CLOUDFLARE_DEPLOYMENT.md; observed production status: BROWSER_VERIFICATION.md.
