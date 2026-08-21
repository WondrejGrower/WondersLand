# Návrat k verzi, která běží na wondersland.online

Cíl: preview (aktuální kód) má vypadat a fungovat přesně jako publikovaná verze na doméně. Žádná nová funkcionalita, jen návrat.

## Co se stalo

Publikovaná verze na doméně je starší snapshot. V posledních krocích se přepracoval přihlášený dashboard (`HomeDashboard`, nový `GrowFeed`, hero obrázek, ikonová navigace). Preview tedy ukazuje novější, nechtěnou podobu.

## Doporučený postup (nejbezpečnější): obnovit z historie

1. Otevřít **History** (ikona hodin v horní liště vedle přepínače postranního panelu, nebo Plus (+) → History).
2. Najít poslední verzi označenou jako publikovaná / odpovídající tomu, co je na doméně.
3. Použít **Restore** na tuto verzi.

Tím se vrátí celý projekt (včetně souborů, kterých se poslední úpravy dotkly) do přesně toho stavu, který je live. Nic se neztratí — novější verze zůstávají v historii, takže se k redesignu dá kdykoli vrátit.

## Záložní postup: cílený revert redesignu

Pokud v historii nepůjde jednoznačně určit publikovaný bod, vrátím zpět jen soubory, které redesign zavedl a změnil:

- `src/ui/HomeDashboard.tsx` — zpět na variantu před redesignem (hero „Enter My Garden“, sekce „Today in your Garden“, diary karty, garden/relay status).
- `src/ui/GrowFeed.tsx`, `src/state/useFeedStore.ts`, `src/nostr/feed.ts`, `src/progression/growth.ts` — odstranit nebo odpojit, pokud nebyly v publikované verzi.
- `src/assets/garden-island.png` — odstranit, pokud byl přidán jen pro nový hero.
- Dokumentaci (`PROJECT_STATE.md`, `AI_HANDOFF.md`, `CHANGELOG.md`) srovnat s tím, co reálně zůstane.

Beze změny zůstane: 3D svět, ovládání a mobilní joystick, kolize, cottage / Indoor Garden, Nostr datový model, GardenConfig, routing i signed-out landing page.

Po revertu spustím typecheck a build a ověřím v prohlížeči, že přihlášený dashboard odpovídá live verzi.

## Co potřebuji vědět

Než začnu, potvrď prosím jednu věc: má se vrátit **celý projekt** do publikovaného stavu (varianta 1), nebo jen **přihlášený dashboard** a zbytek novějších změn si nechat?
