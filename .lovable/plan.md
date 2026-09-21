# Edit mode jako strategický pohled shora

Editor rozmístění přestane být „chození s postavou". Po zapnutí se svět přepne
do klidného pohledu z ptačí perspektivy, jako ve stavitelských hrách: postava
zmizí, chůze se vypne a kamera patří jen tobě.

## Jak se to bude ovládat

- Zapnutí editoru (`?edit=1`, F2, nebo dvěma prsty na mobilu) — kamera se plynule
  zvedne nad zahradu a podívá se šikmo dolů. Panáček a jeho stín se schovají,
  chůze, klikání do světa i interakce jsou po dobu editace vypnuté.
- Tažení po prázdné zemi = posun mapy (kamera jede do stran, svět se neotáčí).
- Tažení za objekt = přesun objektu, přesně jako dnes.
- Kolečko myši / štípnutí dvěma prsty = přiblížení a oddálení.
- Pravé tlačítko myši / dva prsty do stran = otočení pohledu kolem středu;
  dvěma prsty nahoru a dolů se mění náklon (od skoro shora po nízký pohled).
- V panelu přibudou tři tlačítka: „Vycentrovat na výběr", „Celá zahrada"
  (oddálí tak, aby bylo vidět všechno) a „Resetovat pohled".
- Vypnutím editoru se postava vrátí přesně tam, kde stála, a kamera se plynule
  vrátí za ni. Nic z toho se nikam neukládá.

## Co se nemění

Objekty, jejich seznam, posouvání, otáčení, měřítko, přidávání a mazání stromů,
varování o cestě a spawnu i export textu „Zkopírovat rozmístění" zůstávají
beze změny. Běžný návštěvník nepozná žádný rozdíl.

## Technické detaily

- Nový `src/world/editor/editorCamera.ts`: modulový singleton `{ targetX, targetZ,
  distance, yaw, pitch }` (refs, ne React state) + `focusOn(x, z)`, `frameAll()`,
  `reset()`. Meze: distance 8–70, pitch 0.35–1.35 rad, target clamped na
  `GARDEN_RADIUS`.
- Nový `src/world/editor/EditorCamera.tsx` (uvnitř Canvasu, mount jen při editaci):
  `useFrame` počítá pozici z target/distance/yaw/pitch a lerpuje `state.camera`
  na ni — stejný easing jako dnes v `Player.tsx`, žádná alokace ve smyčce.
- `src/world/Player.tsx`: když `editorActive()`, přeskočí celý blok zápisu kamery
  a proximity detekce, zavolá `stop()` / `clearKeyboardInput()` / `clearTouchInput()`
  a nevykreslí `<CharacterAvatar />` ani stínový kroužek (`character.pos` zůstává
  netknutá, takže návrat je přesný). Pohybová logika se nemaže, jen se v editoru
  neprovádí.
- `src/world/editor/EditorLayer.tsx` dostane rozšířené pointer handlery:
  `pointerdown` bez trefy do markeru → režim `pan` (posun `target` podle rozdílu
  dvou průsečíků paprsku se zemní rovinou, takže bod pod prstem zůstává pod prstem);
  pravé tlačítko → `orbit` (yaw/pitch); `wheel` → distance; dva prsty → pinch zoom
  + orbit. Zůstává `GRAB_RADIUS` výběr a snap na `step`.
- `src/world/World.tsx`: `{editing ? <><EditorLayer /><EditorCamera /></> : <WorldPointerInput />}`.
- `useLayoutEditorStore.open()` zavolá `frameAll()`, `close()` nic neresetuje
  kromě výběru — návrat kamery obstará zase `Player.tsx`.
- `src/ui/LayoutEditorPanel.tsx`: řádek tří tlačítek nad seznamem; „Vycentrovat na
  výběr" volá `focusOn` na souřadnice vybrané položky.
- Bez nových balíčků (žádné OrbitControls z drei), bez backendu, bez ukládání.
- Ověření: typecheck, 57 testů, build; v prohlížeči desktop 1280 i mobil 390 —
  zapnutí editoru, pan/zoom/orbit, přesun objektu, export, vypnutí a normální
  chůze bez chyb v konzoli. Doplním `ROADMAP.md`, `PROJECT_STATE.md`,
  `AI_HANDOFF.md`, `CHANGELOG.md`.
