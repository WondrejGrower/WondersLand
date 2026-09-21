# Skrytý editor rozmístění 3D světa

Nástroj jen pro tebe: ve světě si objekty přesuneš myší/prstem, otočíš a zvětšíš, a na konci ti nástroj vypíše hotový text se souřadnicemi, který mi vložíš do chatu — já ho zapíšu natrvalo, aby to viděli i ostatní.

## Jak se to bude ovládat

- Zapnutí: přidáš `?edit=1` na konec adresy světa (nebo stiskneš `F2`). Bez toho editor vůbec neexistuje — běžný návštěvník na něj nenarazí.
- V rohu se objeví panel „Layout editor" se seznamem objektů. Objekt vybereš klepnutím na něj ve světě nebo v seznamu.
- Vybraný objekt dostane rámeček a šipky. Tažením po zemi ho posuneš, posuvníky/tlačítky otočíš a zvětšíš. Krok posunu je volitelný (jemný 0.1 nebo mřížka 0.5), takže se dá trefit přesně.
- Na mobilu fungují stejná tlačítka (posun po krocích), ať to jde ladit i z telefonu.
- Zapnutý editor pozastaví chození a klikání po světě, aby se výběr nepral s pohybem. Vypnutím se vše vrátí do normálu.
- Tlačítko „Zkopírovat rozmístění" dá do schránky hotový text; ten mi pošleš.
- „Vrátit vše" zahodí rozehrané úpravy a vrátí svět do uloženého stavu.

## Co půjde přesouvat

- Stavby a objekty: brána WondersLand, domek My Garden, task cedule, uvítací cedule, skleník, vyvýšené záhony.
- Cesta: body začátku, zlomu pod bránou a konce u domku (cesta se překreslí živě).
- Spawn point.
- Stromy: každý strom z tree line zvlášť — posun, otočení, velikost; jde i strom přidat nebo smazat.
- Rostliny z deníků: pozice jednotlivých slotů v zahradě.

Kolize se během úprav přepočítávají živě, takže hned vidíš, jestli cesta zůstala průchozí (editor navíc ukáže varování, když objekt překrývá pěšinu nebo spawn).

## Technické detaily

- Nový `src/world/editor/useLayoutEditorStore.ts`: runtime přepis hodnot z `layout.ts` (stavby, cesta, spawn, `TREE_INSTANCES`, sloty rostlin). Jediný zdroj pravdy pro editovaný stav; mimo editor je prázdný a všechno čte původní konstanty.
- `src/world/layout.ts` zůstává zdrojem výchozích hodnot. Přidá se tenká vrstva `layoutValues()` (getter s aplikovaným přepisem), kterou začnou používat `Plaza.tsx`, `Cottage.tsx`, `GardenBoard.tsx`, `WelcomeSign.tsx`, `GrowBeds.tsx`, `Trees.tsx`, `GardenPlants.tsx`, `collision.ts` a `interactables.ts`. Bez zapnutého editoru vrací identická čísla — žádná změna chování ani výkonu.
- `src/world/editor/EditorGizmo.tsx` (uvnitř Canvasu): výběrový rámeček + raycast tažení po zemní rovině, přichytávání na krok. Žádné nové balíčky, žádný transform-controls z drei — jen stávající raycast z `WorldPointerInput`.
- `src/ui/LayoutEditorPanel.tsx` (mimo Canvas): seznam objektů, číselná pole X/Z/rotace/měřítko, krok, přidat/smazat strom, varování o kolizích, „Zkopírovat rozmístění", „Vrátit vše".
- Export: funkce `serializeLayout()` vypíše hotový TypeScript — nové hodnoty konstant v `layout.ts` plus literální pole `TREE_INSTANCES` (nahradí dnešní generování přes `rng`, jakmile stromy poprvé upravíš) a slotové souřadnice.
- Gating: editor se načítá `React.lazy` a montuje jen při `?edit=1` / `F2`, takže do běžného balíčku nepřibude nic podstatného. Zapnutý editor nastaví ve `useWorldStore` příznak, který pozastaví click-to-move a interakce.
- Bez backendu, bez ukládání na Nostr, bez analytiky. Úpravy žijí jen v paměti stránky do zkopírování.
- Ověření: typecheck, testy, build; v prohlížeči desktop 1280 i mobil 390 — výběr, posun, export textu, vypnutí editoru a normální chůze bez chyb v konzoli. Doplním `ROADMAP.md`, `PROJECT_STATE.md`, `AI_HANDOFF.md`, `CHANGELOG.md`.
