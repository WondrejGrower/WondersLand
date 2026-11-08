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

Aktuální pravidlo rolí: všechny tři se vybírají při tvorbě postavy. Role
je pak neměnná; změna vyžaduje výslovný reset postavy/postupu. Nevracet
odemykání rolí podle metrů ani přepínání rolí v táboře. Stávající roli
a ostatní postup při aktualizaci zachovat.

Další zadání postavy a inventáře: [docs/CHARACTER_INVENTORY_BRIEF.md](docs/CHARACTER_INVENTORY_BRIEF.md).
Pixelartové podklady jsou v assets/art-source/2026-11-08/. Jde o zdroje pro
vrstvené sprity; obyčejné startovní boty/rukavice nesmějí aktivovat staré
Diamond booleany hands/boots. Diamantový vzhled je vyhrazen budoucímu skinu.

Inventář je implementován ve schématu 5 (`inventory` a `equipment`).
Mince a staré `owned`/`hands`/`boots` nadále reprezentují původní herní postup.
Katalog oblečení a výchozí set jsou v balance.json; CharacterSprites.js obsahuje
sdílená předpočítaná pixelová data pro Qt i web. Regenerace PNG vrstev a prompty:
assets/runtime/README.md. Ověření: npm run test:inventory. Cvičiště používá
přeložené `workshop[].description` pro vysvětlení každého statu.

Verze 0.3.3: nové táborové a botanické PNG v assets/runtime/camp.png a flora.png;
EnvironmentArt.js je sdílený vykreslovač s předpočítanými regiony. PNG se načítají
jednou, nikoli za každý snímek; obří překážky se před škálováním oříznou na viewport.
Oblečení sleduje pózové klouby, včetně deformace trupu a ohybu rukávů.
Obratnost už NEZVYŠUJE input buffer: zpomaluje celou simulaci výpravy o 0,04 %
za úroveň, max. 2 %. Tábor, odpočítávání, výzkum a síť běží v reálném čase.
Dosavadní konopné pravidlo používá prefix 420 kanonické částky v satoshi,
nikoli TXID; zachovej částku, TXID a velikostní křivku. Ověření: npm run test:environment.
