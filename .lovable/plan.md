# Grow Lens — otevřený, viditelný algoritmus pro Grow feed

Dnes se Grow feed hledá jen podle pevného seznamu hashtagů (`#t`) a lokálního
anti-spam filtru. Buď je příspěvek otagovaný, nebo neexistuje. Cílem je nahradit
to čitelným skórováním, které si uživatel může sám prohlédnout a nastavit —
žádný černý box, žádný backend.

## Princip

1. **Sběr kandidátů (recall)** — víc zdrojů než jen hashtagy:
   - hashtagy (dnešní `#t` seznam, per-relay dotazy zůstávají),
   - lidé, které sleduješ (kind 3 → jejich poslední kind 1),
   - autoři, které už tenhle klient označil za pěstitele (viz níže),
   - autoři diářů (kind 30078 s weedoshi tagem) a jejich běžné poznámky —
     tím se chytí i příspěvky bez hashtagu.
2. **Skórování (ranking)** — každý kandidát dostane body z několika signálů:
   - shoda s grow slovníkem v textu,
   - kvalita hashtagů (grow tagy plus, tag-stuffing mínus),
   - „grower reputation": autor, který má diář nebo opakovaně grow obsah,
   - čerstvost (útlum podle stáří),
   - má fotku (grow obsah je vizuální),
   - lidé, které sleduješ / se kterými jsi interagoval,
   - anti-spam penalizace (dnešní pravidla se stanou zápornými body,
     tvrdé odmítnutí zůstane jen pro zjevný spam).
3. **Diverzita** — max. 2 příspěvky od jednoho autora na stránku, round-robin
   přes relaye zůstává.

## Otevřenost (to hlavní)

- U každého příspěvku bude malý štítek se skóre; po kliknutí se rozbalí
  **„Proč tohle vidím"** — seznam signálů a kolik bodů každý přidal/ubral.
- V nastavení feedu bude **Grow Lens panel**: posuvníky pro váhy signálů
  (čerstvost, slovník, sledovaní, fotky, reputace autora), přepínače zdrojů
  a editovatelný seznam hashtagů a klíčových slov. Uloženo lokálně u profilu.
- Konfigurace se dá exportovat/importovat jako JSON — to je ten formát, který
  by jiní klienti mohli převzít. Váhy a signály budou v jednom modulu, ne
  rozeseté po UI.

## Co se nemění

Weedoshi/Nostr formát, kind 30078 diáře, Blossom, 3D svět, přihlašování,
klíče. Žádný backend, žádná databáze, žádné odesílání chování na server —
celé skórování běží v prohlížeči nad tím, co relaye vrátí.

## Technické detaily

- `src/nostr/lens/signals.ts` — čisté funkce signálů (vstup: event + kontext,
  výstup: `{id, label, points}`), bez UI a bez sítě.
- `src/nostr/lens/config.ts` — výchozí váhy, typ `LensConfig`, verze schématu,
  export/import JSON.
- `src/nostr/lens/rank.ts` — složí skóre, vrátí i rozpad signálů pro UI.
- `src/nostr/feed.ts` — recall rozšířen o follows + autory diářů; místo
  `isRelevantGrowNote` jako binárního filtru se použije skóre s prahem.
- `src/state/useLensStore.ts` — konfigurace v Zustandu, persistence přes
  existující `storage`.
- UI: `src/ui/LensPanel.tsx` (nastavení) a rozbalovací „Proč tohle vidím"
  v kartě příspěvku v `GrowFeed.tsx`.
- Testy: signály a řazení na fixních eventech (vitest, jako `timer.test.ts`).

## Postup

1. Modul signálů + config + ranking s testy (bez UI změn).
2. Napojení na feed, rozšíření recall o follows a autory diářů.
3. „Proč tohle vidím" v kartě příspěvku.
4. Grow Lens panel s posuvníky a export/import JSON.
5. Ověření na živých relayích, aktualizace ROADMAP/PROJECT_STATE/CHANGELOG.
