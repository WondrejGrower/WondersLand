Aktualizace 0.3.1: aktuální změny popisuje [JOURNEY_UPDATE.md](JOURNEY_UPDATE.md), ověření [JOURNEY_VERIFICATION.md](JOURNEY_VERIFICATION.md). Následující text zachycuje předchozí verzi 0.3.

# WondersLand 0.3 · stav implementace

Vývojová větev: `game/roguelite-0.3`, odvozená z herní větve 0.2.
Závazné zadání je beze změn uložené v BRIEF_0_3.md. Předchozí texty o
odložení skillů a upgradů v historických zápisech 0.1–0.2 jsou tím překonané.
Původní web v main ani KioskChy se nemění. Žádné platby.

## Funkční cyklus

- Tvorba jedné postavy: jméno, čtyři účesy, palety vlasů/pokožky/oděvu,
  tři classy, náhled stejného vrstveného 24×40 sprite jako ve hře.
- Průchozí Base Camp; portál vybírá tier a náhodné tři startovní skilly;
  cvičiště spouští označený trénink bez persistentních odměn.
- Všech šest tierů se známými násobiteli a časovými odemčeními.
- Sedm funkčních skillů: odraz, magnet, vzdušný sběr, dvojskok, kluzák,
  jednorázový štít a jetpack. Šest slotů, ranky nejvýše 3 (štít 1).
  Rarita přidává 1/2/3 ranky do maxima; UI ukazuje skutečný výsledný účinek.
  Každá třetí sebraná nabídka preferuje společný tag, pokud existuje.
- Letící nabídka každých 30 aktivních sekund, fyzický sběr bez menu;
  přílet se oznámí předem, okno sběru je 3 s / 4 s pro Sběratele.
  Nabídka čeká před nebezpečně obsazeným prostorem, nepřemísťuje stromy.
- Fyzika se integruje nejvýše po 1/120 s. Skok má vstupní buffer již bez
  nákupu. Jelikož první trať nemá mezery/padající plošiny, coyote-time po
  opuštění okraje nemá na aktuální ploché zemi samostatný herní projev.
- Dvojskok lze použít jednou v pobytu ve vzduchu. Explorerova nouzová
  varianta je pouze jednou za běh; nesčítá další skok do stejného letu.
  Výšky omezují dostupná energie a gravitace, nikoliv dodatečný clamp y.
  Jetpack má 3 s paliva, kluzák pouze omezeně zpomaluje sestup.
- Výplata, milníky, semena a rekordy při konci nebo návratu právě jednou.
  Dílna: pět větví po 50 úrovních, vypočtené ceny a příští efekty.
- Výroba a nasazení Diamond Hands / Boots, recept bot při T2:120.
  Viditelné rukavice a boty, jeden setový náboj. Záchrany ze všech zdrojů
  dohromady nejvýše dvě za běh, spotřebování neobnovuje rozpočet.
- Čtyři funkční výzkumy, 1–3 místa podle milníků. Skutečný čas pokračuje
  při zavření hry. Výsledky se neduplikují po restartu. Stabilní nabídky
  dovolí vyloučit jeden skill, pokud zůstanou nejméně tři.
- Reset s výslovným potvrzením; zrušení nemění postup. Psaní jména
  neaktivuje Q/P/E. E otevře i potvrdí; B vrací domů, R opakuje,
  1/2/3 vybírá skill, F ovládá jetpack, Tab/mezerník obsluhuje nabídky.

## Data a ukládání

Síť: pouze stávající mempool.space `/api/mempool/recent` každých 15 s,
plus `/api/tx/{txid}/status` po nárazu. Fronta je ohraničená na 512 řádků,
každý běh na 10 000 unikátních TXID. Zásobník se náhodně vybírá s vlastním
seedem, nikdy podle síly nebo zůstatku. Nová data vstupují do budoucí části
běhu; zobrazené rozměry se zamykají. Živá TX se v běhu neopakuje.
Při vyčerpání dat se dojede viditelná trať a nastane bezpečné čekání,
bez bodů a aktivního času; návrat dat vyvolá třísekundový odpočet.

`progress.json` má schemaVersion 3. Před převodem starého save vznikne sousední záloha `.pre-v3`.
Staré mince převezme jednorázově až
vytvořená postava, starý rekord je legacy. Reset starou měnu nevrací.
Poškozený save se sám nepřepisuje. Atomické zápisy používají QSaveFile;
odmítnutý nákup ani neúspěšný commit nemění zůstatek v paměti.
Běh má UUID a záznam vyplacení, kontrolní bod každých 5 aktivních sekund.
Po korektním zavření se vyplatí aktuální stav; po pádu poslední kontrolní
bod. Po tvrdém pádu tedy může chybět až posledních pět sekund odměn.

Trace posledního živého běhu: `last-trace.json` vedle save, s TXID,
částkami, rozměry, aktivním časem, tierem, verzí, sestavou a událostmi.
Paměť trace je omezená; při více než 20 000 událostech mohou být vypuštěny
nejstarší události ovládání, transakce mají přednost. Není to archiv všech
běhů ani síťový stream celého mempoolu.

`open --dataset <recorded.json> --seed 42` připravuje budoucí pevné výzvy:
pořadí je reprodukovatelné, není označené jako live, rekord je oddělený
podle seedu a bez trvalých ekonomických odměn. Syntetické datasety tento
režim odmítá; patří do tréninku/testů.

## Balanc a měření

Jediný zdroj čísel: `src/balance.json`, `balanceVersion=wl-0.3-draft-1`.
`balance.cpp` řeší monotónní logaritmickou křivku a energetické limity;
konopí nemění mechanickou velikost. Výška roste i nad 10 000 BTC.

`tools/record_mempool.py` pořizuje omezený dataset max. jedním požadavkem
za 15 s. `tools/analyze.py` vypíše percentily, geometrické nemožnosti při
ideálním načasování, časové distribuce pro více seedů a 0/1/2 záchran.
Výškovou geometrickou nemožnost uvádí odděleně od nenalezeného řešení
v konečném numerickém hledání načasování. To druhé není matematický důkaz
nemožnosti pod apexem. Kontroluje celý průchod podle šířky a trajektorie; při simulaci průběhu
používá binovanou rychlost v povoleném rozsahu. Rozlišuje doběhnutí datasetu
od smrti. Není to model lidské chybovosti ani plná ekonomická simulace.

Změřeno: jeden skutečný vzorek 10 nedávných transakcí, report
`analysis-live-small.json`; algoritmus navíc ověřen syntetickou fixture.
Tento vzorek není reprezentativní. Cílové podíly nepřekonatelných stromů,
30–50 mincí/min při běžném hraní, délky běhů a 5–10 h na set NEJSOU
ověřeným balancem. Výchozí kotvy, ceny a ekonomické cíle zůstávají návrhem.

## Grafika a praktické limity

Původní pixelové mřížky postavy s několika kloubovými pózami a společnými
vrstvami, procedurální rostliny s větvemi/kůrou, pixelový tábor a terén.
Žádné převzaté assety. Herní plátno 640×360 s celočíselným zvětšením a
letterboxem. Na 1280px displeji bývá zvětšení 1× a okolní prázdný prostor;
menu se škáluje samostatně. Nejmenší podporované okno 720×600.
Jde stále o první originální vizuální základ, nikoliv hotovou produkční
knihovnu detailních animací nebo srovnatelný rozsah assetů jako Terraria.
