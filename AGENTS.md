# WondersLand [WL]

Primárně prohlížečová hra pro wondersland.online; současně zachovaná nativní
C++17 / Qt Quick/QML aplikace. Není součástí kiosku.

Přečti docs/JOURNEY_UPDATE.md pro herní pravidla a docs/BROWSER_TARGET.md
pro aktuální cílovou platformu. Výslovný pokyn Wondreje z 8. listopadu 2026:
hra má na wondersland.online nahradit původní web. Starší pravidlo ponechat
web na main je tím nahrazené. Archiv původního webu musí zůstat zachovaný.

Sdílené: src/balance.json, src/i18n/cs.json, src/PixelArt.js. Webový runtime
je web/core.mjs + app.mjs; build generuje dist bez uživatelských dat.
Cloudflare konfigurace a ověření: docs/CLOUDFLARE_DEPLOYMENT.md.

Zachovej skutečné TXID v živém režimu a označení tréninku/záznamu. Satoshi
přenášej přesné jako desetinné řetězce, mince nejsou bitcoin. Nezaváděj
platby. Zachovej existující postup, interní ID a migraci schématu.

Web: npm ci; npm test; npm run test:browser; npm run deploy:check.
Native: ./bin/build; ./bin/test; ./bin/install.
Zdroj nativní hry v src/, testy v tests/, web v web/. Build, node_modules,
.wrangler, privátní postup a přihlašovací údaje nepatří do Gitu.
