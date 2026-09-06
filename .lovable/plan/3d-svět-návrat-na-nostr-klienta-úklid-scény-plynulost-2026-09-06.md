# 3D svět: návrat na Nostr klienta, úklid scény, plynulost

Čtyři věci v jednom průchodu. Žádný backend, žádné nové modely, žádné nové balíčky.

## 1. Tlačítko zpět na Nostr klienta (i na počítači)

Dnes je plovoucí tlačítko „← Nostr“ vidět jen na dotykových zařízeních; na počítači existuje jen skrytá klávesa `C`.

- Tlačítko bude vidět vždy, vpravo nahoře.
- Na počítači ponese popisek „Nostr“ a vedle malou značku klávesy `C`, aby bylo jasné, čím se přepíná. Kliknutí funguje stejně jako klávesa.
- Na mobilu zůstává beze změny (dostatečně velký cíl, `aria-label`).
- Skrývá se dál, když je otevřený deník, Indoor, About nebo „Coming soon“.

## 2. Odstranění vymyšlených prvků

- Pryč jde kulatý kamenný záhon uprostřed plácku (to, co vypadá jako fontána) i jeho neviditelná překážka, aby na jeho místě nešlo narazit do ničeho.
- Pryč jde umělá „tráva“ (kuželíky) a rozsypané kamínky na zemi. Odstraní se i jejich neviditelné překážky, ať se hráč nezasekne o nic, co není vidět.
- Zůstávají: brána, cesta, stromy na okraji, skleník, domek, cedule, rostliny z deníků.

## 3. Cesta

- Cesta povede rovně od brány ke spawn bodu a dál k zahradě, s pravidelnými rozestupy dlaždic tak, aby mezi nimi nebyly díry ani se nepřekrývaly.
- Hliněný pruh pod dlaždicemi se srovná na šířku cesty a posadí těsně nad zem, aby dlaždice „neplavaly“ ani nemizely pod terénem.
- Ověřím, že spawn stojí na cestě a že po celé délce nic nepřekáží.

## 4. Plynulost

- Snížení pixel ratio na mobilu a vypnutí stínové mapy tam, kde ji nahradí levné kruhové stíny, které už scéna používá.
- Sloučení opakovaných materiálů a geometrií, aby ubylo vykreslovacích volání (odstranění trávy/kamínků samo o sobě ubere stovky instancí).
- Přiblížení mlhy a zmenšení dohledu, aby se stromová linie kreslila levněji.
- Kontrola, že se v každém snímku nic nealokuje a nevolá překreslení Reactu.

## Technické detaily

- `src/ui/ExitWorldSwitch.tsx`: tlačítko renderovat vždy; při `pointer: fine` přidat `<kbd>C</kbd>`. Klávesová logika beze změny.
- `src/world/Plaza.tsx`: smazat `GardenIsland` a exporty `ISLAND_CENTER` / `ISLAND_RADIUS`; upravit geometrii cesty (`PATH_FROM`/`PATH_TO`, počet dlaždic, šířku pruhu, `y` offsety).
- `src/world/collision.ts`: odebrat kruh ostrova a kolizní kruhy z `ROCK_INSTANCES`.
- `src/world/layout.ts`: odstranit `GRASS_INSTANCES` a `ROCK_INSTANCES` (a `scatter`, pokud zůstane nepoužitý).
- `src/world/Ground.tsx`: odebrat obě instancované vrstvy.
- `src/world/World.tsx`: `dpr={[1, 1.5]}`, revize `shadows`, `fog` a `far`.
- Ověření: typecheck + build, Playwright na 1280px a 390px (tlačítko, cesta, prostupnost, žádné chyby v konzoli), aktualizace `ROADMAP.md`, `PROJECT_STATE.md`, `AI_HANDOFF.md`, `CHANGELOG.md`.
