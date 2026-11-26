# Server WondersLand na Supabase

Projekt: `semslmbkllxmnzmgeheo` (WondersLand, eu-west-1). Server tvoří Edge Function
`wondersland` a PostgreSQL 17. Prohlížeč/PWA dál používá wondersland.online a
stejné `/api/…` adresy. Cloudflare doručuje soubory, ověřuje přístup k `/test`,
omezuje provoz a podepisuje proxy požadavky; serverová simulace a data jsou v Supabase.

## Zachování dat a přístup

- Migrují se všechny tabulky původního `monthly-v1`, včetně starých komunitních
  výsledků, privátních hashů vlastníků, veřejných ID, profilů a rozehraných běhů.
- `wonderland_private` není vystavené přes Data API. Všech 11 tabulek má RLS;
  přístup získá jen interní role `wonderland_server`. Prohlížeč neobsahuje
  databázové heslo, service-role klíč ani podpisové tajemství proxy.
- `web/verified-worker.mjs` je jeden společný ověřovací protokol pro obě
  úložiště. Simulace nadále importuje stejné `core.mjs` jako klient.
- PostgreSQL používá parametrizované dotazy, transakce/savepointy a omezený
  koordinační advisory zámek. Opakované pakety nepřidají druhou odměnu.
- Soukromý prohlížečový vlastnický token zůstává kompatibilní. Není to Nostr
  NSEC. Nostr pravidlo a budoucí přihlášení popisuje [plán](NOSTR_AUTH_PLAN.md).

## Přenos a přepnutí

Chráněný `/api/supabase-migration` používá časově omezenou ECDSA capability;
v repozitáři je pouze veřejný ověřovací klíč. Privátní capability se neloguje.
Příkaz `freeze` uloží podpisové tajemství webové proxy do privátního objektu
Cloudflare a uzavře tam ověřené zápisy. Před exportem se nechají doběhnout
starší požadavky (alespoň 15 sekund).

Import čte malé stránkované dávky. Každou stránku zapíše atomicky spolu s
kurzorem, ověří přesnou shodu všech polí i počty řádků. Při přerušení pokračuje
od uloženého kurzoru. Supabase nepřijímá herní databázové operace, dokud nejsou
všechny tabulky dokončené. Po aktivaci už web při chybě Supabase nepřepne
zápisy zpět do staré databáze.

Původní `MonthlyLeaderboard` / `LEADERBOARD` / `monthly-v1` zůstává zachovaný
jako zmrazený archiv a soukromé úložiště podpisového tajemství webové proxy.
Nemaž binding, objekt, tabulky ani jeho persistentní ID. Archiv je třeba
zachovat i při dalších verzích. Samotné vrácení starého kódu by obnovilo zápisy
do zastaralých dat; bezpečný rollback vyžaduje zastavit zápisy a přenést novější
stav zpět, nebo opravit a znovu nasadit Supabase backend.

Proxy má HMAC-SHA256 podpis svázaný s metodou, cestou/query, časem, IP zdroje
a hashem těla; Supabase nezávisle ověřuje i vlastnictví herního profilu.
Veřejné health a mempool čtení nemají přístup k soukromým datům. Cookies webu
se na Supabase nepřeposílají. Prohlížeč nevolá databázi přímo a nepotřebuje
publishable/service-role klíč.

## Build a další nasazení

`npm ci`, `npm test`, `npm run build:checked`, `npm run deploy:check`.
`npm run supabase:prepare` připraví ignorovaný deploy payload v `supabase/.build/`:
vždy obsahuje aktuální sdílenou simulaci, balance, validátor a serverové moduly.
Nasazení Edge Function musí používat tyto stejné soubory jako webový commit.
Databázové změny patří do verzovaných migrací vytvořených Supabase CLI.
Soubor `supabase/config.jsonc` používá CLI 3; `deno.json` připíná Postgres.js.

`verify_jwt=false` je úmyslné: stávající herní klíč není Supabase JWT. Citlivé
požadavky místo toho ověřují podpis webové proxy a vlastníka profilu. Interní
import/probe vyžaduje zvláštní krátkodobý podpis, po expiraci nelze použít.
Produkční probe před aktivací kontroluje skutečný Deno/Postgres profil,
simulaci, odmítnutí podvrženého skóre a opakované dokončení; všechny jeho
zápisy se vrátí savepointem a nevytvářejí veřejné výsledky.

Další změny balancu/simulace vyžadují znovu nasadit web i Edge Function.
PostgreSQL snapshoty běhů mají stejnou protokolovou/verzovací kontrolu jako dřív.
Aktivní běhy z jiné verze se nesmějí ověřovat novou fyzikou.

## Ověření při migraci

- 76 testů, včetně PostgreSQL schématu/RLS, serverové simulace, souběžných
  nákupů, idempotence, obnovitelného importu a podpisů proxy.
- `build:checked`, audit bez zranitelností a Cloudflare deploy dry-run.
- Prohlížečové sady byly zkuseny; místní Chromium chybí a stahování binárky
  je blokované prostředím. Tuto část nelze označit za provedenou.
- Bezpečnostní advisor po vytvoření schématu bez nálezů. Nové nepoužité indexy
  jsou očekávaná informační hlášení před přenosem dat/provozem.

Konečný stav živého přenosu a kontrol API doplňuje záznam v GitHub PR.

Přenos devíti původních tabulek byl dokončen 26. 11. 2026. Zachovány jsou
1 serverový profil, 2 historické měsíční výsledky, 10 starších ticketů a
související indexy/metadatové záznamy; zdroj neměl aktivní ověřené výpravy ani
ověřené výsledky. Import porovnal všechna pole záznamů a všechny počty.
JSON metadat se zapisuje explicitním přetypováním text→jsonb, aby nedošlo k
dvojí serializaci ovladačem. Proxy používá podporovaný režim `manual` a
odmítá 3xx, takže nepřepošle oprávnění na další adresu.
