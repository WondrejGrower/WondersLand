# Komunitně ověřený milník „Zdokumentuj svůj projekt“ (první průchod)

Jeden malý, celý propojený průchod gamifikace. Žádný nový klient, přihlášení,
dashboard ani backend — vše jede přes stávající Nostr pool, signer a deníky.

## Co uživatel uvidí

1. V sekci **Missions** přibude karta „Zdokumentuj svůj projekt“.
2. Karta nabídne deníky, které mají alespoň tři zápisy s fotografií. Formulář
   je předvyplněný z existujícího deníku (název, rostlina, tři vybrané zápisy
   s náhledy) a jasně říká, že podklady jsou veřejné.
3. Po vědomém odeslání karta ukazuje „Čeká na potvrzení · 0/3“, pak 1/3, 2/3.
4. Třetí platné potvrzení od tří různých oprávněných účtů milník uzná:
   +100 Observation XP a odemčená značka (dřevěná cedulka „Documented“
   z existujících assetů) — bez nových modelů.
5. Stav se počítá znovu z Nostru, takže se obnoví i na druhém zařízení.
6. Rozpracované odeslání, přijetí relayem a neúplná synchronizace jsou
   v kartě rozlišené třemi různými stavy.

Během čekání zůstávají deníky, tabule i 3D svět plně použitelné. Karta je
dostupná i bez vstupu do 3D světa a funguje na telefonu i PC.

## Datový model na Nostru

- **Claim** (veřejný, addressable): kind `30078`,
  `d = wondersland:milestone:document-project:<projectId>`.
  Tagy: `t=wondersland-milestone`, `milestone`, `project`, `e` na každý
  důkazní zápis, `client`. Obsah JSON: verze, milestoneId, projectId,
  seznam tří důkazů, `proofHash` (sha256 setříděných ID důkazů).
  Diary parser se nespustí — nemá diary tag ani `diary-` prefix.
- **Potvrzení**: NIP-32 label, kind `1985`,
  `L=wondersland.milestone`, `l=verified|revoked`, `a` na claim koordinát,
  `e` na claim i na každý důkaz, `p` na autora, `proof-hash`.
  Novější event stejného ověřovatele přepisuje starší, takže odvolání je
  jen podepsaný `l=revoked`.
- **Seznam ověřovatelů**: NIP-51 set kind `30000`,
  `d = wondersland:verifiers:v1`, publikovaný ownerem. Identifikátor
  nekoliduje s `growmies`.

## Pravidla (čistý TypeScript, `src/milestones/rules.ts`)

- Platí jen potvrzení od pubkey v seznamu ověřovatelů.
- Autor nesmí potvrdit sám sebe; více eventů stejného účtu = jeden hlas.
- Potvrzení musí sedět na `proofHash` aktuálního claimu — hlasy ze starší
  verze claimu se nesčítají.
- Uznáno při třech platných hlasech; XP se počítá z pravidel, nikdy z čísla
  zapsaného v eventu nebo v localStorage.
- Jedna kombinace autor + projekt + milník = maximálně jedna odměna.
- Když potvrzení zmizí (odvolání) nebo se ověřovatel ze seznamu odebere,
  milník se vrátí do stavu čekání a XP odpadne. UI to říká předem.
- Když seznam ověřovatelů není nakonfigurovaný, nic se automaticky
  nepovoluje — karta ukáže „Ověřování zatím není nakonfigurováno“.

## Soubory

Nové: `src/milestones/{types.ts,rules.ts,nostr.ts,useMilestonesStore.ts,milestones.test.ts}`,
`src/ui/MilestoneCard.tsx`.
Upravené: `src/ui/HomeDashboard.tsx` (karta v Missions + odlišení osobního
Garden Growth od ověřených milníků), `src/nostr/kinds.ts` (nové konstanty),
dokumentace `ROADMAP.md`, `PROJECT_STATE.md`, `AI_HANDOFF.md`, `CHANGELOG.md`
včetně zápisu této schválené změny rozsahu.

Garden Growth zůstává beze změny a nepřevádí se na ověřené XP; v rozhraní
budou vedle sebe jako „osobní růst“ a „komunitně ověřeno“, ne dva soupeřící
panely.

## Ověření

Testy nad pravidly: duplicitní hlasy, vlastní potvrzení, neoprávněný podpis,
odvolání, jiné pořadí doručení, změna claimu, opakovaná odměna.
Dále typecheck, build a ruční kontrola karty na 390px i na desktopu.
