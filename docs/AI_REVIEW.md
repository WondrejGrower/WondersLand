# WondersLand [WL] · podklady pro analýzu

Analyzuj větev `game/wondersland-0.2`, nikoliv `main` (tam je jiný webový projekt).

Jde o funkční ranou kostru samostatné nativní hry pro Omarchy/Linux:
C++17, Qt Quick/QML, qmake6. Nejde o web ani plugin kiosku. Záměr a další
směr jsou v docs/PROJECT.md; aktuální ovládání a příkazy v README.md.

## Kde co hledat

- src/backend.cpp a .h: herní stav, fyzika běhu, kolize, mince, postup,
  pohyb v táboře, živé transakce přes Qt Network.
- src/Main.qml: okno, vstupy, běžecká scéna a výsledky po nárazu.
- src/CampView.qml: průchozí Base Camp, kreslení a interakce stanovišť.
- src/theme.* a translator.*: Omarchy téma a jazyk; cs/en v src/i18n/.
- tests/game_tests.cpp: trénink bez odměn, živé mince právě jednou,
  pohyb, skok, kolize, persistence, snapshot a skutečné ovládání QML.
- pkgbuild/: lokální Arch balíček, desktopový spouštěč a ikona.

## Důležité záměry

Rostlina v živém běhu odpovídá skutečné transakci. Velikost určuje součet
výstupů v satoshi, nikoliv čistá převáděná částka. Po kolizi se ukáže TXID
a odkaz. Zdroj obsahuje jen nedávné transakce, ne celý mempool. Běh má
pevný výchozí zásobník; nové příchozí transakce vstupují do dalšího běhu.

Trénink má ukázkové rostliny bez TXID a nepřidává persistentní mince ani
živé rekordy. Herní mince nejsou bitcoin. Dílna, šatník a zahrada kouzel
zatím jen představují budoucí rozvoj. Žádné nákupy ani platby neprobíhají.

Budoucí směr: magický roguelike inspirovaný hlavně Magicraftem a Terrarií.
Síla má vycházet ze skillů, synergií a hraní; základní upgrady mají být
běžně dostupné, kosmetické skiny dražší bez bojové výhody. Ne pay-to-win.
