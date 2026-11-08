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
