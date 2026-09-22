# Další krok: ověřovací strana milníku „Zdokumentuj svůj projekt“

První průchod gamifikace umí odeslat claim a počítat hlasy, ale chybí mu
druhá strana smyčky: žádný ověřovatel nemá jak potvrdit cizí milník a seznam
ověřovatelů zatím na relayích neexistuje. Bez toho zůstane každý milník navždy
ve stavu „Čeká na potvrzení · 0/3“. Tento malý průchod smyčku uzavře.

## Co uživatel uvidí

1. **Owner (ty)** získá v sekci Missions nástroj „Reviewer list“:
   - zobrazí aktuální seznam ověřovatelů načtený z relayů (nebo „není
     publikován“),
   - přidá/odebere pubkey (npub nebo hex, validace),
   - tlačítko „Publish reviewer list“ podepíše a publikuje NIP-51 set
     kind 30000, `d = wondersland:verifiers:v1`.
   - Vidí ho jen owner pubkey; ostatním se nezobrazí.
2. **Ověřovatel** (pubkey v seznamu) uvidí v Missions sekci „Waiting for
   review“: cizí claimy ve stavu pending, s náhledy tří důkazů (fotky),
   názvem projektu a autorem. Tlačítka:
   - **Confirm** — podepíše NIP-32 label `l=verified`,
   - **Withdraw my confirmation** — podepíše `l=revoked` (už existuje).
   - Ověřovatel nevidí vlastní claimy k potvrzení (self-verification pravidla
     stejně ignorují).
3. **Autor** po třetím potvrzení vidí „Confirmed · +100 Observation XP“ —
   to už funguje z prvního průchodu, jen se teď poprvé naplní daty.
4. Karta dál jasně říká, že XP je vratné při odvolání nebo změně seznamu.

## Co se NEstaví

- Žádný WoT graf, reputační váhy, další milníky, další skills.
- Žádná 3D odměna/dekorace — zůstává odznak na nástěnce.
- Žádný nový backend, klient ani auth systém. Pouze existující signer,
  pool a relaye.

## Technické detaily

- `src/milestones/verifiers.ts`: přidat `publishVerifierList(signer, pubkeys)`
  — kind 30000, `d = wondersland:verifiers:v1`, `p` tagy, client tag
  (stejný publish mechanismus jako claimy).
- `src/milestones/nostr.ts`: přidat `fetchPendingClaims(excludeAuthor)` —
  dotaz na kind 30078 s `t=wondersland-milestone` napříč relayi, bez author
  filtru, deduplikace newest-per-(milestone, project, author).
- `src/ui/MilestoneCard.tsx` (nebo malá součást `ReviewerPanel.tsx`):
  - owner: editor seznamu ověřovatelů (jen `isOwner(pubkey)`),
  - ověřovatel: seznam pending claimů + Confirm/Withdraw,
  - attest() ve store už existuje — jen se napojí na UI.
- Validace npub/hex přes existující dekódování v Nostr vrstvě; neplatné
  vstupy odmítnout v UI.
- Stavy odesílání seznamu: sending / accepted / partial / error (stejný
  tříhodnotový model jako u claimů).

## Ověření

- Testy: fetchVerifiers parse nového formátu, pending claims filtr (bez
  vlastních, bez duplicit, newest-wins), npub validace.
- Typecheck + `bunx vitest run` (57 + milestones 9 + nové).
- Ruční kontrola karty na 390px i desktopu.
- Aktualizace ROADMAP.md, PROJECT_STATE.md, AI_HANDOFF.md, CHANGELOG.md.

## Co bude chybět i potom (konfigurace, ne kód)

- Owner musí skutečně publikovat seznam ověřovatelů (tlačítko v UI to udělá,
  ale rozhodnutí koho tam dát je na tobě).
- První reálný průchod: ty publikuješ seznam → někdo odešle claim → tři
  ověřovatelé potvrdí.
