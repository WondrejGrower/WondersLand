# WondersLand [WL] · podklady pro analýzu

Analyzuj větev `game/roguelite-0.3`, nikoliv `main` (tam je jiný webový projekt).

Jde o funkční ranou kostru samostatné nativní hry pro Omarchy/Linux:
C++17, Qt Quick/QML, qmake6. Současná implementace je nativní; primární cílový provoz bude v prohlížeči na doméně (BROWSER_TARGET.md). Nejde o plugin kiosku. Záměr a další
směr jsou v docs/PROJECT.md; aktuální ovládání a příkazy v README.md.

## Kde co hledat

- src/backend.cpp a .h: herní stav, fyzika běhu, kolize, mince, postup,
  pohyb v táboře, živé transakce přes Qt Network.
- src/Main.qml: okno, vstupy, běžecká scéna a výsledky po nárazu.
- src/CampView.qml: průchozí Base Camp, kreslení a interakce stanovišť.
- src/theme.* a translator.*: Omarchy téma a samostatná volba jazyka; cs/en v src/i18n/.
- tests/game_tests.cpp: trénink bez odměn, živé mince právě jednou,
  pohyb, skok, kolize, persistence, snapshot a skutečné ovládání QML.
- pkgbuild/: lokální Arch balíček, desktopový spouštěč a ikona.

## Důležité záměry

Rostlina v živém běhu odpovídá skutečné transakci. Velikost určuje součet
výstupů v satoshi, nikoliv čistá převáděná částka. Po kolizi se ukáže TXID
a odkaz. Zdroj obsahuje jen nedávné transakce, ne celý mempool. Běh má doplňovanou deduplikovanou frontu; nové transakce vstupují
do budoucí části aktuálního běhu a už viditelné překážky se nemění.

Trénink má ukázkové rostliny bez TXID a nepřidává persistentní mince ani
živé rekordy. Herní mince nejsou bitcoin. Dílna, vybavení, skilly a výzkum jsou funkční. Ruční tiery nahradil souvislý les podle metrů; aktuální změny a migrace popisuje JOURNEY_UPDATE.md. Nákupy
používají pouze herní body, žádné platby neprobíhají.

Budoucí směr: magický roguelike inspirovaný hlavně Magicraftem a Terrarií.
Síla má vycházet ze skillů, synergií a hraní; základní upgrady mají být
běžně dostupné, kosmetické skiny dražší bez bojové výhody. Ne pay-to-win.

Pro aktuální revizi nejprve čti docs/BRIEF_0_3.md a docs/IMPLEMENTATION_0_3.md.
Balanc: src/balance.json. Postup: progress.*. Fronta: transactionfeed.*.
