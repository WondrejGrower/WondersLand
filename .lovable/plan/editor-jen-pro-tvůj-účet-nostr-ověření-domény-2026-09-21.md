# Editor jen pro tvůj účet + Nostr ověření domény

Dvě oddělené věci: (1) skrytý editor rozmístění světa smí otevřít jen tvůj účet, (2) doména wondersland.online se stane ověřenou Nostr adresou pro tvůj npub.

## 1. Editor jen pro tvůj účet

Tvůj npub `npub1c0cj4x59hm4yd6nrrj2k22shuqknhjlyw773wzf4pushupkzzvqsjelp5x` se zapíše jako jediný vlastník. Kdokoli jiný — i s adresou `?edit=1` nebo klávesou F2 — editor neotevře; nic se mu nezobrazí a chová se to, jako by funkce neexistovala.

Zároveň přibude pohodlné otevření na telefonu: dlouhý stisk (cca 1,2 s) dvěma prsty kdekoli ve světě editor přepne. Reaguje jen u tebe, u ostatních je gesto neaktivní.

Pozor: přihlášení přes uložený klíč v prohlížeči je jen měkká ochrana pro tvé pohodlí — editor mění rozmístění jen ve tvém prohlížeči a výsledek stejně musíš poslat do chatu, aby se uložil natrvalo. Nejde o bezpečnostní zámek dat.

## 2. Nostr ověření na doméně

Na `wondersland.online/.well-known/nostr.json` vznikne ověřovací odpověď, která mapuje kořenové jméno na tvůj veřejný klíč. V Nostr klientech se pak u tvého profilu ukáže ověřená adresa `wondersland.online`.

Aby se checkmark objevil, musíš si po nasazení do svého Nostr profilu vyplnit pole NIP-05 hodnotou `_@wondersland.online`. To se dělá v tvém Nostr klientu, nemůžu to za tebe podepsat.

## Technické detaily

- `src/nostr/owner.ts` (nový): konstanta s owner pubkey v hex (dekódováno z npubu) + `isOwner(pubkey)`.
- `src/world/editor/useLayoutEditorStore.ts`: `open()` provede fail-closed kontrolu proti `useNostrStore.getState().pubkey`; při neshodě se stav nezmění.
- `src/routes/index.tsx`: `?edit=1` a F2 se registrují jen když `isOwner(pubkey)`; přidán two-finger long-press handler (touchstart/touchend, 1,2 s, 2 dotyky, zruší se při pohybu) taktéž jen pro ownera.
- `src/routes/[.]well-known/nostr[.]json.ts` (nový): server route s GET handlerem vracejícím `{"names":{"_":"<hex pubkey>"},"relays":{"<hex>":[...]}}`, `content-type: application/json`, `access-control-allow-origin: *` (NIP-05 vyžaduje CORS), krátká cache. Relays vezmu ze stávající relay konfigurace projektu.
- Ověření: typecheck, 57 testů, build; curl na `/.well-known/nostr.json` v dev serveru; kontrola v prohlížeči (desktop i 390×844), že editor nejde otevřít bez ownera a jde s ním.
- Dokumentace: ROADMAP.md, PROJECT_STATE.md, AI_HANDOFF.md, CHANGELOG.md.

Nedotknu se: deníků, Blossom, Grow Feedu, přihlašování, šifrování, Garden Boardu ani pohybu ve světě.
