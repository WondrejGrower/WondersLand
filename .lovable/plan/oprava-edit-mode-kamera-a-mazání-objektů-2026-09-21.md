# Oprava Edit mode: kamera a mazání objektů

## Co je špatně

**1. Kamera se nedá ovládat.** V editoru platí, že kliknutí do země do 2,2 metru od
jakéhokoli objektu znamená "chytit objekt". Ve světě je ale dnes mnoho objektů
(stromy, tři body cesty, spawn, místa pro rostliny, stavby), takže skoro každé
místo obrazovky spadá do něčího dosahu. Místo posunu mapy se proto téměř vždy
chytne a odtáhne nejbližší objekt — kamera se nehne a navíc se nechtěně přesouvá
scenérie.

**2. Cesta (a další základní prvky) nejdou odstranit.** Body cesty, spawn a vstup
do domku jsou v katalogu označené jako neodstranitelné, takže se u nich tlačítko
Odstranit vůbec nezobrazí. Zároveň pro ně neexistuje způsob, jak samotnou
pěšinu ve světě skrýt.

## Co udělám

### Kamera
- Přidám do panelu přepínač **Kamera / Úpravy** (dvě velká tlačítka).
  - V režimu **Kamera** tažení vždy posouvá mapu, dvěma prsty / pravým tlačítkem
    se otáčí, kolečko a štípnutí zoomuje. Nic se nechytá ani nepřesouvá.
  - V režimu **Úpravy** funguje tažení objektů jako dnes.
- I v režimu Úpravy se objekt chytne jen tehdy, když je kliknutí blízko **na
  obrazovce** (cca 30 px od značky), ne v metrech světa. Při oddáleném pohledu
  tak jde běžně posouvat mapu.
- Prázdná plocha v režimu Úpravy = posun mapy (zůstává).
- Na mobil přidám k panelu malé ovládání kamery: zoom + / −, a tlačítko
  vycentrovat na výběr (to už existuje).

### Mazání
- Body cesty, spawn a vstup do domku půjde **vybrat a posouvat** jako dnes, ale
  navíc přidám samostatnou položku **Pěšina** se zaškrtnutím "skrýt", takže
  se cesta přestane ve světě kreslit.
- Ostatní objekty (stavby, stromy, kopie, místa pro rostliny) půjde odstranit
  jako dnes.
- Spawn a vstup do domku zůstanou nesmazatelné — bez nich by se hráč neměl kam
  objevit a domek by nešel otevřít. Půjdou jen přesunout.
- "Vrátit vše" obnoví i skrytou pěšinu.

### Ověření
- Vyzkouším v prohlížeči na mobilní i desktopové velikosti: posun mapy, zoom,
  otáčení, výběr a tažení objektu, skrytí pěšiny, odstranění stromu a "Vrátit vše".
- Spustím typovou kontrolu, testy a sestavení.

## Technické detaily

- `EditorLayer.tsx`: nový `pointerMode` ze store (`camera` | `edit`); hit-test
  převeden na screen-space (projekce pozice značky do NDC a porovnání v px);
  pan zůstane fallback pro prázdnou plochu.
- `useLayoutEditorStore.ts`: `pointerMode`, `setPointerMode`, snapshot/revert
  doplněn o `HIDDEN_LAYOUT_ITEMS` (už tam je) včetně nového klíče `path`.
- `items.ts`: nová položka `path` (skrytí pěšiny), `removable` u bodů cesty
  zůstává false, mazání řeší skrytí celé pěšiny.
- `Plaza.tsx`: pěšina se nevykreslí při `HIDDEN_LAYOUT_ITEMS.has("path")`;
  navigace/waypointy zůstávají beze změny.
- `LayoutEditorPanel.tsx`: přepínač režimu, zoom tlačítka, položka pěšiny.
- Žádný nový balíček, žádná persistence, editor zůstává owner-only a lokální.
