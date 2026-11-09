> Current architecture (2026-11-09): one web/Canvas implementation and desktop/mobile
> PWA. The Qt descriptions below are project history. Read BROWSER_TARGET.md,
> BALANCE.md and WEB_PWA_TIMING.md for the current state.

# WondersLand [WL] · zadání a další rozvoj

Samostatná desktopová pixelová hra inspirovaná jednoduchostí offline dinosaura,
arkádovým postupem Jetpack Joyride a atmosférou Terrarie. Projekt vznikl
8. listopadu 2026 na Wondrejovo zadání. Není součástí KioskChy ani webu WondersLand.

## Hratelná kostra 0.1

Automatický běh, skok s podržením pro větší výšku, rozmanité rostliny podle
součtu výstupů skutečných transakcí, mince a lokální rekord. Po nárazu hra
ukáže konkrétní rostlinu, částku, TXID a odkaz na explorer. Aktuální potvrzení
transakce ověřuje až po nárazu; při chybě zůstává poctivě uvedené pouze její
pozorování v mempoolu. Trénink používá označené ukázkové rostliny bez TXID.

Živý zdroj: mempool.space /api/mempool/recent, nejvýše 10 nedávných TX na
odpověď každých 15 sekund, paměťový zásobník nejvýše 256. Nejde o úplný mempool.
Každý běh zmrazí výchozí zásobník a při dlouhém běhu jej opakuje. Nové
transakce vstupují do dalšího běhu. Částky jsou součtem výstupů v satoshi,
nikoli čistou převáděnou hodnotou. Poplatek neurčuje velikost rostliny.

## Nápady na další vrstvy

- Výrazně větší herbář a čitelnější jedinečné druhy rostlin.
- Vyvážení překážek: obří stromy mohou být nepřeskočitelné; vybavení umožní
  delší běh, případně větev či cesta kořeny nabídne záchranu zdarma.
- Vylepšení za herní mince: dvojskok, kluzák z listu, jetpack, další postavy.
- Denní výzvy ze stejného snapshotu, oddělené žebříčky, sdílení výsledků.
- Reakce krajiny na vytěžený blok.
- Volitelné doplňování mincí za satoshi přes Lightning. Návrh ekonomiky,
  platební backend a pravidla férovosti se teprve dohodnou. Tato kostra
  žádné platby, peněženku na bitcoin ani převody satoshi neobsahuje.

Základní identita: „Tvůj běh ukončila tahle transakce.“ Každá překážka
v živém režimu má skutečné TXID. Nepoužívat náhodné falešné TXID v tréninku.

## Base Camp a směr hry · 0.2 / 8. listopadu 2026

Aktuální pokyn Wondreje: trénink ponechat, jeho mince se nepřičítají.
Od 0.2 se do persistentních zásob ani živého rekordu nezapisují tréninkové
odměny. Dosavadní zůstatek se nemaže, protože starší verze neukládala původ
mincí a nelze bezpečně odlišit trénink od živých odměn.

Base Camp je výchozí průchozí domov s pohledem shora: domek, ohniště,
portál do živého lesa, cvičiště, runová dílna, šatník a zahrada kouzel.
Pohyb WASD / šipkami nebo kliknutím, interakce E u stanoviště. Živý běh
i trénink se spouštějí na příslušných stanovištích. Z pauzy či po nárazu
se lze vrátit domů. Neutracené živé mince se při návratu započtou jednou.

Hlavní reference: Magicraft — magické útočiště, výpravy, kombinace kouzel
a roguelike postup; Terraria — pixelová příroda, domov a drobné detaily světa.
Vlastní programově kreslené prostředí, žádné přebírání herních assetů.
Reference: https://store.steampowered.com/app/2103140/Magicraft/

Další rozvoj směřuje k roguelike: schopnosti, synergie a rozhodování během
běhu mají být hlavním zdrojem síly. Základní upgrady mají být ekonomicky
dostupné běžným hraním; skiny jsou dražší dlouhodobé kosmetické cíle bez
bojové výhody. Vyhnout se pay-to-win. Konkrétní ceny nejsou stanovené.
Dílna, šatník a zahrada kouzel zatím obsahují popis plánů bez nákupů
a bez strhávání mincí. Platby ani funkční skill systém zatím nepřidávat.

## Nové závazné zadání a hratelná 0.3

Soubor BRIEF_0_3.md ze dne 8. listopadu 2026 nahrazuje dřívější odklady skillů,
dílny, vybavení a výzkumu i návrhy povinně průchozího generátoru. Velká
transakce může správně vytvořit nepřekonatelnou překážku. Aktuální funkční
stav, omezení, migrace a skutečná měření jsou v IMPLEMENTATION_0_3.md.
Pracovní větev je game/roguelite-0.3; main zůstává původní web.

## Souvislý les a cílová platforma

Aktuální stav a nahrazení tierů: [JOURNEY_UPDATE.md](JOURNEY_UPDATE.md).
Primární cílový provoz je prohlížeč na doméně: [BROWSER_TARGET.md](BROWSER_TARGET.md).
Starší odstavce tohoto dokumentu jsou historie; popis opakujícího se snapshotu
a odložených nákupů neplatí pro současnou implementaci.
