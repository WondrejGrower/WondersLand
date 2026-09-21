# Spawn u brány + brána vycentrovaná s cestou

## Co teď
- Brána stojí na `[0, 0, 17]`, spawn je `[0, 9.2]` — hluboko uvnitř zahrady, brána za zády.
- Pěšina běží z `(0, 16)` k domku `(3.1, -1.7)` a mírně se křiví (Bézier), takže otvor brány nesedí přesně na osu cesty.

## Cíl
Hráč se objeví na místě ze screenshotu (těsně u brány) a brána stojí vycentrovaná na pěšině kousek před spawnem — aby hráč při vstupu do zahrady dřevěnou branou skutečně prošel.

## Změny (jen `src/world/layout.ts`, data jedou dál samy)

1. **Spawn:** `SPAWN = [0, 15.2]` — místo u brány ze screenshotu.
2. **Brána:** `ARCH_POSITION = [0, 0, 12.6]` — cca 2,6 m před spawnem, přímo na ose cesty; sloupky zůstávají `±2.4`, takže otvor sedí na střed pěšiny.
3. **Cesta:** `PATH_FROM = { x: 0, z: 16 }` zůstává za spawnem; zkontrolovat/zesrovnat začátek pěšiny v `Plaza.tsx`, aby pás šel přímo skrz otvor brány (úvodní úsek zarovnat na osu x=0, křivku nechat až za branou).

## Ověření
- `assertSpawnClear` projde (sloupky brány jsou 2,4 m od spawn osy, nekolidují).
- Browser desktop + mobil 390×844: spawn u brány, pohled skrz otvor do zahrady, klik/WASD průchod branou bez zaseknutí, kamera neklipuje do sloupků.
- Typecheck, všechny testy, build.

## Dokumentace
ROADMAP.md, PROJECT_STATE.md, AI_HANDOFF.md, CHANGELOG.md — záznam posunu spawn/brány.

## Mimo rozsah
Žádné změny pohybu, kamery, modelu brány ani ostatních staveb.
