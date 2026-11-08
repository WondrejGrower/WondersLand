# Install WondersLand on a phone

WondersLand is an installable Progressive Web App at **https://wondersland.online**.
It opens in a standalone app window and supports portrait/landscape. Installation
does not change physics, balance, mempool order or profile schema.

## Pro hráče / installation

**Android:** otevři web v Chromiu/Chrome, potom Nastavení hry → Nainstalovat
aplikaci. Pokud prohlížeč nabídne instalační tlačítko, použij ho. Jinak otevři
nabídku prohlížeče → Nainstalovat aplikaci / Přidat na plochu.

**iPhone / iPad:** otevři web v Safari → Sdílet → Přidat na plochu. Pokud se
nabídne „Otevřít jako webovou aplikaci“, nech to zapnuté. Potom hru spouštěj
ikonou WondersLand na ploše. iOS nepoužívá naše Chromium instalační okno.

Před instalací si pro jistotu v Nastavení **exportuj postup**. Pokud nová aplikace
otevře novou postavu, importuj soubor; některé systémy oddělují úložiště webové
aplikace od původního prohlížeče. Export postupu neobsahuje soukromý klíč
žebříčku, takže oddělené úložiště znamená i novou komunitní identitu. Staré
veřejné výsledky se nemažou. Mazání dat prohlížeče/aplikace může smazat místní
postup; instalace sama není cloudová záloha.

**English:** in Android Chrome, use Game Settings → Install app, or the browser
menu → Install app / Add to Home screen. On iPhone/iPad, use Safari → Share →
Add to Home Screen and keep Open as Web App enabled if offered. Export your
progress before installing; import it if the app opens with separate storage.
An internet connection is required to open the game and receive live data.

## Implementation and security boundaries

- `web/manifest.webmanifest`: stable root identity/scope/start URL, standalone
  display, no orientation lock, 192/512 PNG icons and a separate maskable icon.
- Apple touch icon (180 px) and standalone metadata are in `web/index.html`.
  Committed PNGs come from the existing game SVG; regenerate with
  `node tools/build-pwa-icons.mjs` (ImageMagick 7).
- `web/pwa.mjs` captures a supported `beforeinstallprompt` and consumes it only
  after a player action. Browser installation heuristics decide when to offer
  it. Dismissal does not cause a prompt loop. Unsupported platforms show manual
  instructions. `appinstalled` and standalone display suppress the install CTA.
- `web/sw.js` has root scope but intercepts **only GET root/index document
  navigations**. Network comes first. If navigation fails, the app serves a
  self-contained, clearly marked English/Czech offline notice. Static-host clean-URL
  redirects are normalized before caching so offline navigation can reuse it.
- Only `/offline.html` is in its single-entry Cache Storage cache. No API data,
  authenticated requests, game modules, live/replay transactions, saves or board
  keys are cached by the service worker. Existing browser HTTP caching remains
  normal; opening gameplay requires a connection. This is not offline live play.
- Worker updates do not call `skipWaiting`, reload running clients, reset data
  or migrate profiles. Registration uses `updateViaCache: none`; `sw.js` and the
  manifest have revalidation headers. New game modules remain network assets,
  so an old service-worker shell cannot pin an outdated balance. Change the
  `wl-offline-*` cache version when changing the offline notice. Activation
  removes only old caches in that prefix and leaves localStorage untouched.
- English/Czech install instructions are in Settings. No push notifications,
  new permissions, payment integration, analytics or external install service
  are introduced. Native Qt packaging is unchanged.

## Verification

`npm run test:pwa` uses an isolated **persistent** Chromium profile (a private
browser context cannot install apps). It checks CDP manifest parsing and
installability errors, actual PNG sizes, Apple icon metadata, synthetic one-shot
prompt/dismissal UI, EN/CS guidance, SW control and cache contents, offline
navigation/reconnection and unchanged local progress. The synthetic prompt is
an interface test, not a claim of an OS installation. `test:mobile` covers
responsive play controls; both commands are included in GitHub CI.

[Install instructions screenshot](browser/pwa-install-mobile-cs.png) ·
[Offline notice screenshot](browser/pwa-offline-mobile.png).
Physical Android/iOS installation still needs a device check.

Browser behavior references: [Google's installation prompt guidance](https://web.dev/learn/pwa/installation-prompt/),
[WebKit home-screen web apps](https://webkit.org/blog/13878/),
[Apple's Add to Home Screen instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

Observed locally on 2026-11-08: npm ci, 43 Node tests, PWA, mobile, browser
journey, monthly desktop/mobile integration and environment browser checks
passed. Native rebuild, 33 Qt + 3 Python tests and deploy dry-run also passed.
No mechanical balance or profile schema version was changed.

Security update: the offline cache was bumped to `wl-offline-v3-security` to
refresh cached response headers after CSP/HSTS hardening. It still stores only
the offline notice and never API, admin pages or player credentials.
