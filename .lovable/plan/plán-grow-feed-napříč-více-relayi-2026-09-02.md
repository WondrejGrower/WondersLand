# Plán: Grow feed napříč více relayi

## Problém
`fetchFeedPage()` posílá jeden dotaz na všechny zapnuté relaye současně a `queryWithSources()` se sloučí do jednoho výsledku. Rychlý relay (typicky nos.lol) vrátí svých 40 eventů dřív, timeout 7 s doběhne, a pomalejší relaye (nostr.band, damus, snort) se do výsledku skoro nepromítnou. Feed tak vypadá „jen z nos.lol" — viz relay chipy u příspěvků.

## Cíl
Feed skutečně kombinuje více relayí, uživatel u čipů vidí různé zdroje, a grow obsah se lépe cílí.

## Kroky

### 1. Per-relay dotazování s rovnoměrným rozložením (`src/nostr/feed.ts`, `src/nostr/pool.ts`)
- Místo jednoho sloučeného dotazu poslat **stejný filter na každý relay zvlášť** (pool už trackRelays umí; doplnit helper `queryPerRelay()` vracející `Map<relayUrl, events[]>`).
- Z každého relayu vzít max `ceil(limit / počet_relayí)` nejnovějších eventů, pak sloučit, deduplikovat podle `id`, seřadit podle `created_at`.
- Tím se garantuje zastoupení každého zapnutého relaye, pokud něco vrátí.

### 2. Relaye zaměřené na grow obsah (`src/nostr/relays.ts`)
- Do výchozího seznamu přidat komunitní/niche relaye, kde žije weedoshi a grow obsah (ověřit dostupné; kandidáti: relay.nos.social, nostr.mom, případný weedoshi relay). Každý nový relay přidat jen po ověření, že odpovídá na `#t` filtry — jinak feed zpomaluje.
- Nechat stávající velké relaye zapnuté; žádný backend.

### 3. Ladění `#t` tagů (`src/nostr/feed.ts`)
- Odebrat příliš generické tagy (`grow`, `plants`, `soil`), které táhnou spam, doplnit komunitní (`cannabis`, `microgrowery`, `autoflower`, `weedoshi`).
- Lokální spam-brána zůstává beze změny.

### 4. Diagnostika v UI (malý doplněk)
- Relay chipy u příspěvků už existují (`SourceChips`) — po změně přirozeně ukážou různé relaye. Žádná nová UI práce, jen ověřit.

## Ověření
- Typecheck + build.
- Playwright: otevřít feed, zkontrolovat v DOM relay chipy u příspěvků — měly by se objevovat aspoň 2–3 různé relay hostnames.
- Zkontrolovat paginaci (cursor `until`) po per-relay slučování — žádné duplicity.

## Co se nemění
- Nostr/Weedoshi formáty, Blossom, 3D svět, diary flow. Čistě načítací logika feedu a konfigurace relayí.
