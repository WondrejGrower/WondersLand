Aktualizace 0.3.1: aktuální změny popisuje [JOURNEY_UPDATE.md](JOURNEY_UPDATE.md), ověření [JOURNEY_VERIFICATION.md](JOURNEY_VERIFICATION.md). Následující text zachycuje předchozí verzi 0.3.

# Ověření 0.1.0 · 8. listopadu 2026

- Qt 6.12 / GCC 16, sestavení qmake6 a make.
- Fyzika, skok a pauza; přesný TXID a satoshi po kolizi; uložení rekordu;
  neměnný snímek během běhu; odmítnutí poškozených transakcí.
- Skutečné QML: klik na Trénink, stisk mezerníku a ověření výskoku.
- Syntetický herní náhled docs/screenshot.png zkontrolovaný bez osobních dat.
- Desktop soubor ověřený desktop-file-validate.
- Platební systém ani upgrady nejsou součástí této verze.

Výsledek: 8 testů prošlo, 0 selhání. Čeština ověřená přímo v QML,
živé přepnutí na angličtinu a rozložení v nejmenším okně 720 × 540.
Samostatný Qt klient skutečně načetl 10 živých transakcí příkazem
`check --live --json`. Arch balíček 0.1.0-1 nainstalován do systému.

## Verze 0.2 · Base Camp

- Tréninkové mince ani rekord se nepřičítají při nárazu ani návratu domů.
  Test skutečně sebere minci a ověří i znovunačtení stávajících zásob.
- Živé odměny se při návratu započtou jednou; opakovaný návrat nepřidá nic.
- Průchozí tábor: pohyb, hranice mapy, zastavení, chůze kliknutím, stanoviště.
- Skutečné QML: D pro pohyb, E na cvičišti, kliknutí na spuštění tréninku,
  mezerník pro skok, návrat do tábora. Čeština a malé anglické okno.
- Syntetický náhled tábora viz docs/base-camp.png.
- Původní data zachována, schéma progress.json se nemění. Starší mince se
  zpětně neodečítají, protože verze 0.1 neukládala jejich původ.

Finální výsledek 0.2: 11 testů prošlo, 0 selhání. Český tábor a malé
anglické okno vizuálně zkontrolované. Balíček 0.2.0-1 nainstalovaný.

## 0.2.0-2 · mince

Výrazný zlatý ukazatel uložených mincí v horním panelu zůstává viditelný
v táboře i při běhu. Při živém běhu zvlášť uvádí přírůstek z výpravy,
v tréninku informaci, že se odměny neukládají. Všech 11 testů prošlo;
malé okno 720 × 540 vizuálně zkontrolováno. Účetní pravidla se nemění.

## 0.2.0-3 · ovládání bez myši

E otevírá i potvrzuje bránu/cvičiště, Esc zavírá nabídky, B vrací do tábora,
R opakuje běh. Ověřen celý průchod QML klávesnicí včetně potvrzení při
fokusu tlačítka, bezpečného čekání na chybějící data a návratu. 11 testů prošlo.

## 0.3 · nové závazné zadání BRIEF_0_3.md

Vývoj ve větvi game/roguelite-0.3. Celý rozsah a známé limity jsou výslovně
popsané v IMPLEMENTATION_0_3.md; starší zápisy výše popisují historické verze.

- ./bin/build: úspěšně sestaveno na Qt 6.12 / GCC 16.
- Qt testy: 21 prošlých kontrol včetně init/cleanup; 0 selhání.
- Dva Python testy analyzátoru: prošly.
- Křivka: nula, monotónnost, velké hodnoty, růst nad poslední kotvou,
  konopí bez změny rozměrů. Fronta: deduplikace, hranice, seed, doplňování,
  žádné opakování TXID, zamčené viditelné objekty, čekání a odpočet.
- Fyzika: skutečné trajektorie, limity obyčejného/leteckého skoku,
  konečné palivo, opakované vstupy, záchrany proti širokým stromům.
- T1–T3: prahy odemčení i skutečné násobitele sběru a vyplacení.
- Postup: trénink bez odměn, nákupy a maxima, research podle hodin,
  starý save, reset/zrušení, poškozený soubor, odměny právě jednou,
  oddělené replay rekordy. Zrušení výběru skillu nepřidá dokončený běh.
- Nativní QML: psaní Q/P/E do jména, tvorba postavy, E/E na bráně,
  výběr skillu, skok, pauza a B; přepnutí fullscreen v offscreen platformě.
- Vizuální kontrola sedmi syntetických/označených náhledů včetně češtiny
  a 720×600. Výsledkový náhled používá zaznamenané veřejné TX a výslovně
  uvádí, že nejde o live a aktuální potvrzení není ověřené.
- Finální Qt síťový probe: live=true, skutečně načteno 10 nedávných TX.
- Jeden veřejný vzorek 10 TX uložen s původem a časem; analyzátor běžel
  s 50 seedy. Syntetický dataset zvlášť s 30 seedy. Žádné tvrzení o
  reprezentativním mempoolu nebo ověřených měsíčních ekonomických cílech.

Neprovedeno: dlouhodobá lidská herní studie, měsíce ekonomického testování,
plný node, veřejný žebříček a produkční grafický benchmark. Tyto věci nejsou
nahrazené syntetickým testem. Nová verze neprovádí webový deployment.

Poslední regresní kontrola: data přijatá během pauzy při vyčerpané frontě
po obnovení spustí odpočet. Diagnostický záznam běhu ukládá také výsledný
čas, vzdálenost, mince a počet použitých záchran. Znovu prošlo 21 Qt kontrol
a dva Python testy; aktualizovaný balíček byl nainstalován.

Finální sestava 0.3.0-1: balíček vytvořen bez debug balíčku; instalace ověřena
přes pacman. Živý Qt probe vrací jeden JSON s live=true a 10 transakcemi.

Kontrola skutečné desktopové relace po instalaci: okno se správným app id
wondersland-game a titulkem WondersLand [WL] se otevřelo. Hyprland jej
v rozdělené ploše zmenšil na 621×672, tedy pod deklarované minimum 720×600;
pro celou herní scénu na tomto rozdělení je vhodné F11. Z agentem spuštěného
procesu přišla nefatální výstraha registrace host portálu (spojení už má
přiřazené app id); QML se načetlo. Automaticky nebylo otevřeno externí okno
exploreru, takže skutečné předání odkazu portálem z této relace není potvrzené.
