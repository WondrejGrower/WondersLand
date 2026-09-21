# Oprava brány a cesty u spawnu

## Problém (potvrzeno v kódu i na fotce)

1. **Nápis WondersLand je obráceně.** Cedule na bráně (`src/world/Plaza.tsx`,
   `EntranceArch`) je namalovaná na ploše otočené `rotation-y={Math.PI}` na
   straně `-z`. Hráč ale spawn stojí na straně `+z` (spawn z=15.2, brána
   z=12.6), takže se dívá na rub cedule a nápis nejde přečíst.
2. **Cesta nenavazuje.** Pěšina je jedna rovná rovina z `(0,16)` do
   `(4.4,-4.1)`. Už pod bránou (z=12.6) je její střed na x≈0.75 a u spawnu se
   stáčí doprava mimo hráče — na fotce cesta „začíná" vedle postavy místo pod
   ní a neprochází středem brány.

## Změny

**1. Otočit nápis brány ke spawnu** — `src/world/Plaza.tsx`, `EntranceArch`:
- cedulku s textem přesunout na stranu `+z` (z `-0.26` na `+0.27`) a odebrat
  `rotation-y={Math.PI}`, aby čela k příchozímu hráči; rubová strana zůstane
  holé dřevo (stejně jako dnes z druhé strany).

**2. Cesta se zlomem pod bránou** — `src/world/Plaza.tsx` + `src/world/layout.ts`:
- nová konstanta `PATH_VIA = { x: 0, z: 12.6 }` (střed brány) v layoutu;
- pěšinu vykreslit jako **dva rovné úseky**: `(0,16.5) → (0,12.6)` (od za
  spawnu středem brány) a `(0,12.6) → (4.4,-4.1)` (od brány k domku) — cesta
  tak začíná pod hráčem, prochází přesně středem brány a dál navazuje k domu;
- `pathPoint`/`nearPath` upravit na dva úseky (clearance vegetace zůstane
  konzistentní).

Nic jiného se nemění: kolize brány (sloupky) zůstávají, pohyb, interakce,
domů ani cedule se nedotknu.

## Ověření

- Browser (desktop + mobil 390×844): nápis WondersLand čitelný ze spawnu,
  cesta vede od postavy středem brány až k domku.
- Kolizní simulace chůze spawn → domek bez zaseknutí; `assertSpawnClear` OK.
- Typecheck, všech 57 testů, build.
- Doplnit ROADMAP.md, PROJECT_STATE.md, AI_HANDOFF.md, CHANGELOG.md.
