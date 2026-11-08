# Zadání pro Codex: postava, startovní oblečení a inventář

Zadání Wondreje z 8. listopadu 2026. Navazuje na `game/roguelite-0.3`.
Tento commit dodává výtvarné podklady a úkol pro další implementaci.
Inventář ani nový renderer tímto commitem ještě nejsou implementované.

## Co uživatel požaduje

- Zachovat schválený detailní pixelart s přírodními barvami a čitelnými siluetami.
  Inspirace atmosférou Terrarie / Core Keeper, vlastní grafika WondersLand.
- Nabídnout více klučičích a krátkých účesů: v nové sadě je 12 krátkých či
  klučičích a 4 delší varianty. Účes je dostupný každé postavě, bez zámku podle pohlaví.
- Přiložené oblečení je základ pro NOVOU postavu. Obyčejné boty, rukavice,
  kalhoty a oděv mají být skutečné nasazené kusy výbavy.
- Tyrkysové diamantové boty a rukavice do startovní sady NEPATŘÍ.
  Jejich vzhled vyhradit pro budoucí kosmetický skin.
- Přidat postavě inventář, vybavování a viditelné změny oblečení.

## Dodané pixelarty

| Soubor | Účel |
| --- | --- |
| [starter-customization-v2.png](../assets/art-source/2026-11-08/starter-customization-v2.png) | Aktualizovaná sada: 16 účesů, 2 pokrývky hlavy, 6 oděvů, 2 kalhoty, 2 páry kožených bot, pracovní rukavice a brašna |
| [character-roster-reference.jpg](../assets/art-source/2026-11-08/character-roster-reference.jpg) | 12 původních postav jako reference proporcí, obličejů, barev a oblečení |
| [forest-camp-reference.jpg](../assets/art-source/2026-11-08/forest-camp-reference.jpg) | Původní reference postavy, kapradí, hub, stromů, domku a portálu |
| [camp-props-reference.jpg](../assets/art-source/2026-11-08/camp-props-reference.jpg) | Dodatečný atlas 12 táborových objektů a stanovišť (4 × 3) |
| [botanical-plants-reference.jpg](../assets/art-source/2026-11-08/botanical-plants-reference.jpg) | Dodatečný atlas 12 motivů rostlin, hub, keřů a stromů (4 × 3) |
| [manifest.json](../assets/art-source/2026-11-08/manifest.json) | Názvy komponent, vizuální řádky/sloupce, výchozí set a kontrolní součty |
| [generation-prompt.txt](../assets/art-source/2026-11-08/generation-prompt.txt) | Přesné zadání poslední grafické úpravy pro další konzistentní iterace |

Nová PNG má skutečný alfa kanál; všechny přiložené JPG mají bílé pozadí.
Starý atlas s diamantovými botami/rukavicemi tento balíček záměrně nenahrazuje
ani nepřidává jako platnou startovní variantu. Autoritativní je nová sada v2.

## Start nové postavy

Tvůrce nabízí účes, barvu vlasů, odstín pokožky a základní oděv. Krátké účesy
nesmí být jen přebarvená jedna silueta. Základní varianty jsou dostupné zdarma.
Všechny tři role zůstávají dostupné při tvorbě; uložená role je dále neměnná.

Výchozí set při první tvorbě, pokud hráč nevybere jinou základní variantu:

| Slot | Položka |
| --- | --- |
| Hlava | Bez pokrývky, zvolený účes zůstává vidět |
| Trup | Zelená látková tunika `torso_green_tunic` |
| Nohy | Tmavé kalhoty `legs_charcoal_trousers` |
| Boty | Hnědé kožené boty `feet_brown_leather_boots` |
| Rukavice | Kožené pracovní rukavice `hands_leather_work_gloves` |
| Opasek / brašna | Kožená brašna `belt_leather_pouch` |

Vybrané startovní kusy při potvrzení tvorby přidat do vlastněných položek
a rovnou vybavit v jedné uložené transakci. Každý kus jen jednou; opakované
otevření inventáře, načtení nebo aktualizace nesmí duplikovat startovní odměnu.
Startovní oblečení nemá bonus ke skoku, sběru, záchranám ani jiné síle.

## Inventář a vybavování

- Přístup od začátku, i před odemčením pokročilých funkcí Šatníku. Viditelná
  akce Inventář / Inventory v táboře a vhodné tlačítko pro dotykové ovládání.
- Panel obsahuje náhled postavy, její aktuální sloty a skutečně vlastněné kusy.
  Vybraná položka ukáže název, slot a akci Nasadit / Sundat.
- Vlasy a pokožka patří do vzhledu postavy; oblečení patří do slotů výbavy.
  Zvolený účes při výměně bot či rukavic neztratit.
- V jednom slotu je nejvýše jeden kus. Ověřit vlastnictví a kompatibilní slot.
  Pouhá změna oděvu nesmí odstranit předchozí kus z inventáře.
- Změna je vidět v náhledu, táboře i běhu a přežije restart / export a import.
  Sundání rukavic ukáže ruce; boty nesmí zůstat skrytě vykreslené po sundání.
- Angličtina je zdrojový a výchozí jazyk; celé rozhraní také česky přes
  existující překlady. WASD / šipky navigují, E potvrdí, Esc se vrátí; myš
  i dotyk fungují. Klávesy při psaní jména dál zadávají text.

## Datový model a stávající diamantová výbava

Nyní `web/core.mjs` používá `schemaVersion:4`, `owned`, `hands` a `boots`.
`src/progress.cpp` má odpovídající nativní stav. Aktuální položky `hands`
a `boots` v `src/balance.json` jsou Diamond Hands / Diamond Boots;
nejde o obecné sloty oblečení. `src/PixelArt.js` navíc přes tyto booleany
kreslí tyrkysovou výbavu. Tyto významy nesmí nový inventář smíchat.

Zaveď stabilní ID položek a samostatné mapování vybavených slotů.
Startovní kožené boty NESMÍ nastavovat staré `boots=true`; kožené rukavice
NESMÍ nastavovat `hands=true`. Získání obyčejného oblečení nesmí odemykat
Diamond set, skokový bonus, magnet, záchranu nebo výzkum.

Diamantový VZHLED je od této chvíle návrh pro budoucí kosmetický skin,
bez nového herního bonusu. V této etapě nezařazovat diamanty do tvorby ani
do startovního inventáře. U starých uložených postav zachovat již získaný
postup, vlastnictví a herní schopnosti přes explicitní migraci; nemaž je ani
je nepřepisuj výchozím setem. Dřívější bonusy oddělit od vzhledu, pokud se
převádí existující diamantová výbava na kosmetický systém.
Nové schéma verzovat a otestovat migraci z verze 4 v obou runtimech.

## Grafická implementace

Tři obrázky jsou VÝTVARNÉ ZDROJE, nikoli hotové rozřezané a zarovnané
animační vrstvy. Nový atlas má vizuální uspořádání 6 × 5, ale skutečné obrysy
je nutné před výřezem ověřit; nepoužívat jeho řádky/sloupce jako finální
souřadnice snímků. Původní JPG nepovažovat za průhledné sprity.

Vyřízni a vyčisti vybrané komponenty, slaď pixelovou mřížku, měřítko, pivot
a připojovací body těla. Zachovej zdroje a odvozené produkční PNG ukládej
odděleně. Prosté zmenšení celého atlasu ani výměna celé postavy za ikonku nestačí.
Doplň zarovnané vrstvy a skutečné snímky pro idle, běh, skok, dopad a zásah;
na směrovém pohybu tábora se nesmí díly rozjíždět. Neprohlašuj jeden statický
výřez za kompletní animovanou sadu.

Současný sdílený renderer `src/PixelArt.js` kreslí postavu do 24 × 40.
Volbu výsledného rozlišení ověř při skutečné velikosti ve hře, s jednotnou
pixelovou mřížkou a nejbližším sousedem bez vyhlazování.
Vzhled skládej po vrstvách: zadní vlasy / plášť, tělo a nohy, oděv, boty,
ruce a rukavice, přední vlasy, pokrývka a brašna podle překryvů.
Klobouk či kapuce skryjí pouze překryté části vlasů; účes v datech zůstává.

Zachovat stejný výsledek v `web/app.mjs`, `src/CharacterView.qml`,
`src/CampView.qml` a běžeckém zobrazení. Produkční soubory musí kopírovat
webový build a zahrnout nativní `src/resources.qrc`, bez závislosti na
externí URL nebo nedostupném lokálním souboru.

## Ověření hotové implementace

1. Čerstvá postava libovolné role začíná viditelně oblečená; inventář obsahuje
   právě její základní set, žádné diamanty a žádné bonusy za kožené kusy.
2. Ověř alespoň 12 odlišných krátkých a 4 delší účesy a kombinace s oblečením.
3. Nasadit / sundat boty a rukavice, přepnout oděv, projít tábor a běžet:
   vizuální vrstvy souhlasí s uloženými sloty a drží při animaci.
4. Restart, export/import, reset a opakované otevření inventáře neduplikují
   položky. Migrace zachová jméno, roli, mince, rekordy, odemčení i staré předměty.
5. Nová postava nepřebírá obsah inventáře resetované postavy; volba jazyka přežije.
6. Ověř české i anglické texty, klávesnici, myš, dotyk a úzký mobilní viewport.
7. Podle AGENTS.md spusť webové kontroly `npm ci`, `npm test`,
   `npm run test:browser`, `npm run deploy:check`; u nativních změn také
   `./bin/build`, `./bin/test`, `./bin/install`. Zaznamenej reálné výsledky
   a náhledy postavy s vybavením.

Nesahat kvůli inventáři na skutečné TXID, přesné satoshi, fyziku překážek,
platební systémy nebo neměnnost role. Jde o rozšíření postavy a výbavy.
