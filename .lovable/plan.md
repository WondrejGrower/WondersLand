# Fix: 3D world stuck on "Growing the garden…"

## What happens

Entering the garden shows the loading text forever. Reproduced in a test browser: the canvas mounts, but every 3D model fails to finish loading.

## Why

The security headers added in the recent security pass are too strict for the 3D scene:

- The model loader decodes textures through in-browser `blob:` addresses, which the rules block.
- The model decompressor runs a small WebAssembly module, which the rules also block.

Because the models never finish, the scene never appears and the loading screen stays up. Fonts from Google are blocked by the same rules too (separate, cosmetic).

## The fix

Adjust the header rules in `src/server.ts` only — no scene, no world, no auth changes:

- `script-src`: add `'wasm-unsafe-eval'` (allows WebAssembly, still forbids `eval`/`unsafe-eval`).
- `connect-src`: add `blob:` and `data:` so loaded model data can be read back.
- `font-src`: add `https://fonts.gstatic.com`; `style-src`: add `https://fonts.googleapis.com` so the brand fonts load.
- Keep everything else unchanged: no wildcard script sources, no `unsafe-eval`, `object-src 'none'`, frame-ancestors, HSTS, nosniff all as they are.

## Verify

- Re-run the browser flow: sign in, Enter Garden, confirm the scene renders with no blocked-resource or WebAssembly errors.
- Check the loading screen disappears and the exit control still works.
- Run typecheck and build.
- Note the header change in `PROJECT_STATE.md` / `AI_HANDOFF.md` security section.
