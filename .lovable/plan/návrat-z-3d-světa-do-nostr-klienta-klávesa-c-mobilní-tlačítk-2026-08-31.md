# Návrat z 3D světa do Nostr klienta (klávesa C + mobilní tlačítko)

Cíl: ve 3D zahradě umožnit rychlý návrat do dashboardu (Nostr klient) klávesou `C` na desktopu a speciálním tlačítkem na mobilu. Cesta do 3D světa zůstává jediná — tlačítko „Enter Garden“ v dashboardu; `C` v dashboardu nefunguje a nic nepřepíná.

## Chování

- `C` ve 3D světě → zpět do dashboardu (Nostr klient).
- `C` v dashboardu → bez efektu; do 3D světa vede pouze „Enter Garden“.
- Ve 3D světě `C` neaktivuje, když je otevřený nějaký overlay (deník, Indoor, About, Coming soon) — tam Esc/X zůstávají beze změny.
- Přepnutí je jen změna pohledu: přihlášení, deníky a feed zůstávají. Nový save systém nepřidáváme.

## Mobil / dotyk

- V 3D světě: malé plovoucí tlačítko vpravo nahoře (mimo joystick a interakční prvky), ikona + popisek „Nostr“, dostatečný tap target (min. 44px), `aria-label` „Přepnout na Nostr klienta“.
- V dashboardu žádné nové tlačítko — vstup do 3D světa řeší pouze existující „Enter Garden“.
- Tlačítko se zobrazuje pouze při `pointer: coarse` (stejná detekce, jaká už se používá v TouchControls/InteractionPrompt).

## Technické detaily

- `src/state/useWorldStore.ts`: přidat `exit()`; `entered` zůstává jediný zdroj pravdy.
- Nový `src/ui/ExitWorldSwitch.tsx`, renderovaný pouze ve 3D větvi, který
  - registruje `keydown` na `KeyC` (s guardem na otevřené overlaye `journalOpen`, `indoorOpen`, `aboutOpen`, `comingSoon`) a volá `exit()`,
  - vykreslí dotykové tlačítko při coarse pointeru.
- `src/routes/index.tsx`: `ExitWorldSwitch` pouze uvnitř větve se 3D světem; dashboard beze změny.
- Žádné změny v `Player.tsx`, Avatar, kolizích, Nostr vrstvě ani datovém modelu.

## Ověření

- Typecheck + build.
- Playwright: desktop 1280px — `C` ve 3D vrací do dashboardu; při otevřeném deníku `C` nic nedělá; v dashboardu `C` nic nedělá.
- Playwright 390px — dotykové tlačítko viditelné, nepřekrývá joystick, přepne do dashboardu.
- Aktualizace `PROJECT_STATE.md`, `AI_HANDOFF.md`, `ROADMAP.md`, `CHANGELOG.md`.
