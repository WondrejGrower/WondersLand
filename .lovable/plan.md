# Přepínání mezi 3D světem a Nostr klientem (klávesa C + mobilní tlačítko)

Cíl: jedním stiskem `C` (desktop) nebo jedním tlačítkem (mobil) přepínat mezi 3D zahradou a 2D Nostr klientem (dashboard), bez ztráty stavu a bez zásahu do Nostr dat, 3D obsahu nebo ovládání.

## Chování

- `C` v 3D světě → zpět do dashboardu (Nostr klient).
- `C` v dashboardu → skok do 3D světa (stejné jako "Enter Garden"), ale jen když uživatel právě nepíše do inputu/textarea a není otevřený žádný modal (deník, composer, reader, About, Coming soon, Indoor).
- Ve 3D světě `C` neaktivuje, když je otevřený nějaký overlay — tam Esc/X zůstávají beze změny.
- Přepnutí je jen změna pohledu: přihlášení, deníky, feed i pozice hráče v rámci session zůstávají. (Pozice hráče se resetuje na spawn pouze pokud už se tak dnes chová; nový save systém nepřidáváme.)

## Mobil / dotyk

- V 3D světě: malé plovoucí tlačítko vpravo nahoře (mimo joystick a interakční prvky), ikona + popisek „Nostr“, dostatečný tap target (min. 44px), `aria-label` „Přepnout na Nostr klienta“.
- V dashboardu: existující „Enter Garden“ zůstává hlavní cestou; navíc se přidá stejná ikona do spodní mobilní navigace jako „Garden“ přepínač, pokud tam ještě není duplicitní.
- Tlačítko se zobrazuje pouze při `pointer: coarse` (stejná detekce, jaká už se používá v TouchControls/InteractionPrompt).

## Technické detaily

- `src/state/useWorldStore.ts`: přidat `exit()` a `toggleEntered()`; `entered` zůstává jediný zdroj pravdy.
- Nový `src/ui/WorldSwitch.tsx`: sdílený hook/komponenta, která
  - registruje globální `keydown` na `KeyC` s guardem na `input/textarea/[contenteditable]` a na otevřené overlaye (`journalOpen`, `indoorOpen`, `aboutOpen`, `comingSoon`),
  - vykreslí dotykové tlačítko při coarse pointeru.
- `src/routes/index.tsx`: `WorldSwitch` renderovat v obou větvích (dashboard i 3D), aby klávesa fungovala všude.
- `src/ui/HomeDashboard.tsx`: pouze doplnit hint „C“ vedle tlačítka Enter Garden (bez redesignu).
- Žádné změny v `Player.tsx`, Avatar, kolizích, Nostr vrstvě ani datovém modelu.

## Ověření

- Typecheck + build.
- Playwright: desktop 1280px — `C` tam a zpět; při otevřeném deníku `C` nic nedělá; psaní „c“ v composeru nepřepne.
- Playwright 390px — dotykové tlačítko viditelné, nepřekrývá joystick, přepne do dashboardu.
- Aktualizace `PROJECT_STATE.md`, `AI_HANDOFF.md`, `ROADMAP.md`, `CHANGELOG.md`.
