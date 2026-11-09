# WondersLand [WL]

Jedna JavaScript/Canvas hra pro prohlížeč a instalovanou PWA na počítači i
mobilu. Výslovný pokyn Wondreje z 9. listopadu 2026 ruší samostatný C++/Qt
runtime. Nevracet druhou implementaci fyziky, UI ani nativní balíček.
Projekt není součástí kiosku. Hra na wondersland.online nahrazuje starý web;
archiv původního webu musí zůstat zachovaný.

Nejprve čti docs/BALANCE.md, docs/BROWSER_TARGET.md a docs/SECURITY_HARDENING.md.
Historická zadání v docs/JOURNEY_UPDATE.md a starších dokumentech popisují i
již odstraněnou Qt aplikaci; aktuální pravidla a výslovné pokyny mají přednost.

## Zdroj a ověření

- web/core.mjs: jediná herní simulace pro klienta i ověřující server.
- web/app.mjs: UI, vstupy a start; web/art.mjs, pixels.mjs, environment.mjs:
  vykreslování. sprites.mjs a environment-regions.mjs jsou předpočítaná data.
- src/balance.json a src/i18n/cs.json: konfigurace a český katalog.
- web/progress-validation.mjs: jediný validátor místních/serverových profilů.
- web/timing.mjs: 120 pevných kroků/s, interpolace a volitelný limit 60/144 FPS.
  FPS nesmí měnit fyziku, kolize, odměny, mempool ani rychlost cooldownů.
- assets/runtime/README.md: grafické zdroje a regenerace. Běžný build nepotřebuje Qt,
  ImageMagick ani obrazovou AI. Oblečení je kosmetické, základní boty/rukavice
  nesmějí aktivovat původní Diamond booleany hands/boots.

Node.js 24+: npm ci; npm test; npm run test:browser; npm run deploy:check.
Podle změny spusť test:timing, test:jump-feel, test:jump-input, test:mobile,
test:pwa, test:inventory, test:environment, test:monthly, test:verified a test:analysis.
Build: npm run build. Lokální náhled: npm run preview. Produkční konfigurace a
ověření: docs/CLOUDFLARE_DEPLOYMENT.md. build:checked (testy + audit + build) je
povinná deploy brána, neobcházej ji. dist, node_modules, .wrangler, privátní
postup a přihlašovací údaje nepatří do Gitu.

## Závazná herní pravidla

Živý běh může začít libovolnou skutečnou transakcí včetně nepřekonatelné sekvoje.
Nikdy nefiltruj, nenahrazuj ani neodkládej velké TX kvůli bezpečnému začátku
nebo síle postavy. Zachovej deduplikaci, doplňování a poctivé čekání bez replay.
Satoshi přenášej přesně jako desetinné řetězce; částka je součet výstupů.
Konopí určuje prefix 420 částky, nikoli TXID. Velikostní křivka, TXID a již
vytvořené rozměry překážek jsou nezávislé na kameře, FPS, postavě a regionu.
Trénink/záznam musí být označené a bez trvalých odměn. Mince nejsou bitcoin.

Všechny tři role se volí při tvorbě postavy. Role je pak neměnná až do
výslovného resetu. Zachovej postup, interní ID, schéma 5, inventory/equipment,
původní owned/hands/boots a migrace. Starší exporty Qt zůstávají importovatelné.
Neměň ani nemaž skutečné uživatelské soubory původní desktopové aplikace.
Obratnost zpomaluje celou výpravu o 0,04 % za úroveň, max. 2 %; buffer je
pevný 0,1 s. Tábor, odpočítávání, výzkum a síť běží v reálném čase.

Balance journey-7: základní/tap impuls 140, gravitace 210/280, kvadratická
Síla 5.7. Výška začátečníka ~46.67 px, maximum Síly ~312.67 px. Animace letu
a mělké propružení nemění hitbox. Při změně mechanik aktualizuj balanceVersion,
relevantní testy a docs/BALANCE.md. Kosmetika/FPS/PWA nevyžadují nový balance.

## Server a PWA

Ověřené běhy mají vlastní serverový profil a serverovou simulaci vstupů,
nikoli klientské skóre/import buildu. Zachovej historické komunitní výsledky
jako read-only. SQLite Durable Object: MonthlyLeaderboard, binding LEADERBOARD,
jméno monthly-v1. Persistentní ID nemaž/nepřejmenovávej bez migrace.
Server-verified není důkaz lidské identity ani placený ranked. Platby, vstupné
1000 sats, custody a výplaty nejsou implementované a nepatří do běžného balancu.
Admin /test musí ověřovat server; privátní capability/klíč/QR nepatří do Gitu/logů.

PWA: docs/PWA.md. Service worker ukládá pouze offline oznámení, nikdy API,
privátní klíče, replay nebo starý herní shell s balancem. Instalace používá
stejný webový kód; nevyžaduje samostatnou fyziku nebo C++ wrapper.
Změna skoku, architektura a výsledky: docs/JUMP_FEEL.md a docs/WEB_PWA_TIMING.md.
