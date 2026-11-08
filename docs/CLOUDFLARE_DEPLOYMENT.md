# GitHub → Cloudflare → wondersland.online

Wondrej explicitly requested on 2026-11-08 that the game replace the original
website at **wondersland.online**. This supersedes the earlier instruction to
leave the website on main. The old website is archived at
`archive/website-before-game-2026-11-08` (5830ff11efe82eb6eb5bdb65927a825a0d16002a)
and remains in Git history. Keep the separate local website checkout intact.

## Product and build

The browser client is real executable ES modules + Canvas, in `web/`.
It shares balance.json, the Czech catalog and native pixel art with Qt.
`npm run build` generates `dist/`; no Qt runtime is required in a browser.
The native app remains in src/ and is built with ./bin/build.

Prerequisite: Node.js >=22 (CI uses 24), npm. Dependencies are pinned in
package-lock.json, including Wrangler and Playwright.

```sh
npm ci
npm test
npm run test:browser
npm run deploy:check
npm run dev
```

Browser tests use installed /usr/bin/chromium when present, otherwise
Playwright's Chromium. On a new CI machine:
`npx playwright install --with-deps chromium`.
GitHub's Browser checks workflow runs unit tests, browser tests, dry-run
packaging and uploads the dist artifact.

## Cloudflare configuration

`wrangler.jsonc`: Worker name **wondersland**, worker entry `web/worker.mjs`,
static assets from dist bound as ASSETS, build `npm run build`, custom domains
wondersland.online and www.wondersland.online. www redirects to the apex.
The Worker runs before assets so the canonical redirect works on all paths.
Only GET /api/mempool and /api/tx/<64-hex-txid>/status proxy the public
mempool.space API. Responses are shared at the edge for 15 seconds; upstream
failures remain 502, never fake data. /health reports game/version/balance.
All other paths go to static assets. No arbitrary proxy, keys or payments.

The existing Cloudflare Workers Git integration watches
repository WondrejGrower/WondersLand, production branch main, root directory
`/`. Build command `npm run build`; deploy command `npx wrangler deploy`.
Wrangler also declares its own build, so it can deploy from a fresh checkout.
Keep this existing integration as the production deploy owner; the GitHub
workflow verifies but does not perform a second competing deployment.

A manual deploy, when signed into the correct Cloudflare account, is:

```sh
npx wrangler login
npm run deploy
```

Production Git deployment was verified successfully (see BROWSER_VERIFICATION.md).
GitHub Actions
currently cannot start because the GitHub account reports a billing lock.

At preparation time dry-run succeeded but the local Wrangler CLI was not
logged into Cloudflare. A dry-run does NOT establish a live deployment.
Verify the actual /health, HTML and /api/mempool on the domain after the
GitHub-triggered build. Record the observed result in BROWSER_VERIFICATION.md.

Cloudflare primary references:
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- https://developers.cloudflare.com/workers/wrangler/configuration/

## Data and language

Browser progress and language are separate localStorage entries wl-progress
and wl-language. English is the fresh-install default. Opening
`https://wondersland.online/?lang=cs` stores the user's Czech choice.
Settings switches language without reload, exports progress and imports a
native progress.json with a keyboard-operated confirmation. The old browser
save is backed up before import, and schema 3 recipes/unlocks migrate to 4.
The native source file is `~/.local/share/wondersland-game/progress.json`.
No account or automatic cross-device sync exists; native and browser saves
remain separate until explicitly imported/exported.

`?recorded=1` is an explicitly marked, reward-free replay of the included
10 public recorded transactions. It never substitutes for the default live
mempool feed. Training uses sample plants without fabricated TXIDs and pays
no persistent rewards. No user data or credentials belongs in dist/GitHub.

## Rollback

The old site is retained in the archive branch and original main history.
Any rollback must be an explicit new deployment of that archived website,
not deletion of game progress. Normal updates push to main after checks;
feature work can continue on game/roguelite-0.3.
