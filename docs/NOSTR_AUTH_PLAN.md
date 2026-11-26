# Registrace a přihlášení WondersLand přes Nostr

Stav: první implementace používá NIP-07. Prohlížeč nebo mobilní aplikace musí
poskytovat externí signer přes `window.nostr`. NIP-46, připojení existujícího
hodnoceného profilu a odhlášení všech zařízení zůstávají ve fázi návrhu.

## Co obsahuje první verze

- V menu v táboře a při tvorbě postavy je **Účet Nostr**. První schválený
  podpis založí účet. Další podpis stejného klíče obnoví stejný účet.
- Při prvním přihlášení lze uložit osobní postavu z aktuálního zařízení nebo
  začít novou. Osobní postup na účtu se automaticky synchronizuje po dokončení
  výpravy a po uložených akcích v táboře. Stav synchronizace je v menu účtu.
- Hodnocený profil vytvořený v přihlášeném režimu se načte i na jiném zařízení.
  Starší hodnocený profil svázaný s prohlížečem lze dál používat jako host.
- Uložení je podmíněné revizí. Při souběžné změně si hráč vybere cloudovou
  či místní kopii. Odhlášení ruší aktuální relaci a vrací osobní profil hosta.
- Backend běží v existující Supabase Edge Function `wondersland`. Pro
  nasazení aplikuj novou migraci `wonderland_nostr_accounts`, nasaď Edge
  Function přes `npm run supabase:prepare` a potom stejnou revizi webu.
  Databázové tabulky jsou soukromé a přihlášení nepoužívá Supabase JWT.

Níže je širší plán včetně dalších etap.

## Závazné pravidlo Wondreje

**NIKDY SE NESMÍ UKLÁDAT PRIVÁTNÍ KLÍČ UŽIVATELE (NSEC) NIKAM DO DAT.
Jediné, co se může uložit, je NPUB a ostatní data nespojená s NSEC.**

Platí pro databázi, Supabase Auth metadata, Storage, Vault, Edge secrets, cache,
localStorage, sessionStorage, IndexedDB, cookies, URL, analytiku, logy, chybová
hlášení, exporty, testovací snímky, repozitář i zálohy. Zákaz platí také pro
hexadecimální/bajtový zápis, seed a šifrovanou kopii soukromého klíče uživatele.
WondersLand NSEC ani nevyžaduje, nepřijímá a nevytváří. Soukromý klíč zůstává
výhradně v externím signeru pod kontrolou uživatele. Žádné políčko „vložit NSEC“.

## Uživatelský postup

1. Hra nadále nabídne hraní jako host s dosavadním lokálním postupem.
2. „Přihlásit přes Nostr“ nabídne rozšíření/signer v prohlížeči (NIP-07) nebo
   připojení vzdáleného signeru (NIP-46, QR/deep link). Signer uživateli ukáže
   žádost o podpis přihlášení k wondersland.online.
3. První platně podepsané přihlášení založí účet; další otevře stejný účet.
   Uživatel bez Nostr identity ji vytvoří ve zvoleném externím signeru.
4. Ukážeme zkrácený NPUB, připojený profil, stav synchronizace a odhlášení.
   Samotné vložení NPUB umožní nanejvýš veřejný náhled; nedokazuje vlastnictví.

## Ověření přihlášení

- Klient získá veřejný klíč a požádá signer pouze o podpis. NIP-07 poskytuje
  `getPublicKey()` a `signEvent()`. Signer vrací veřejný klíč v hex; pro uložení
  a zobrazení jej převedeme na kanonický NPUB podle NIP-19.
- `POST /api/auth/nostr/challenge` vytvoří kryptograficky náhodnou jednorázovou
  výzvu s expirací 60 sekund, svázanou s konkrétním prohlížečem a účelem
  `login` nebo `link`. Do databáze patří její hash, účel a expirace.
- Klient odešle výzvu v těle `POST /api/auth/nostr/verify`. Signer podepíše
  NIP-98 HTTP autentizační událost druhu 27235: přesnou veřejnou URL,
  metodu POST, aktuální čas a SHA-256 **přesných odesílaných bajtů těla**.
  Do `Authorization: Nostr …` přijde pouze podepsaná veřejná událost.
- Edge Function nezávisle ověří ID události, Schnorr podpis, veřejný klíč,
  druh, časové okno, prázdný obsah, jednoznačné tagy `u`, `method`, `payload`,
  hash těla a vazbu výzvy na prohlížeč/účel. Duplicitní nebo konfliktní tagy
  odmítne. Použije veřejnou URL wondersland.online, nikoli interní proxy URL.
- V jediné databázové transakci spotřebuje výzvu, vytvoří/najde účet podle
  unikátního NPUB a založí relaci. Opakování výzvy vždy selže, i souběžně.
- Webová vrstva nastaví náhodný relaci identifikující token jako
  `Secure; HttpOnly; SameSite=Strict; Path=/` cookie s `__Host-` prefixem.
  Databáze uloží pouze hash tokenu. Token je přihlašovací relace aplikace,
  není NSEC a neumožňuje podepisovat Nostr události. Relace mají expiraci,
  rotaci, serverové zneplatnění a možnost odhlásit všechna zařízení.

V první verzi zvolíme vlastní ověřování na Edge Functions a privátní tabulky.
Nepředstíráme, že Supabase nabízí vestavěného Nostr OAuth poskytovatele.
Prohlížeč nebude zapisovat do serverových tabulek přímo; požadavky dál ověří
stejný server. Pokud později přibude Supabase JWT, musí jej vydávat jen
ověřený server, bez soukromého klíče uživatele a bez klientem měnitelných rolí.

## Data a převzetí dosavadní postavy

| Tabulka / údaj | Uložená data |
| --- | --- |
| `nostr_accounts` | Interní UUID, unikátní kanonický NPUB, časy založení/přihlášení |
| `nostr_challenges` | Hash výzvy, hash vazby na prohlížeč, účel, expirace, spotřebování |
| `account_sessions` | UUID účtu, hash náhodného relačního tokenu, expirace, odvolání |
| `account_verified_players` | UUID účtu a existující interní ID vlastníka serverového profilu |
| Osobní save účtu | Validovaný osobní postup, revize pro souběžné zápisy, čas změny |

Veřejný hex klíč je jen jiný zápis stejného NPUB a lze jej při ověřování odvodit;
není nutná další persistentní kopie. Podpis se zpracuje při přihlášení a potom
zahodí. Profilová metadata budou volitelná a nepoužijí se jako oprávnění.

Stávající serverový profil lze připojit pouze po současném prokázání jeho
stávajícího vlastnictví a Nostr podpisu s účelem `link`. Zachová se public ID,
mince, výzkum, rozehraná výprava i výsledky. Shodná přezdívka nedokazuje
vlastnictví. Profil již připojený k jinému NPUB nelze přivlastnit.

Osobní lokální postava zůstává oddělená od ověřeného serverového postupu.
Při prvním přihlášení nabídneme uložení lokální osobní postavy nebo převzetí
existujícího cloudového save; uchováme zálohu nahrazené kopie. Mince se nesčítají.
Souběžné změny řeší revize a výběr verze, nikoli tiché přepsání. Ztracený Nostr
klíč WondersLand nedokáže obnovit; pravidlo zakazuje jeho zálohování ve hře.

## NIP-46 a hranice přístupu

Vzdálený signer může mít jiný veřejný klíč než uživatel; po připojení je nutné
získat skutečný klíč identity přes `get_public_key`. Požadujeme pouze podpis
přihlašovací události. Žádné platby, peněženka, obecný podpis zpráv ani přístup
k soukromým zprávám.

Dočasný aplikační pár pro šifrované spojení NIP-46 není soukromý klíč uživatele.
Zůstane pouze v RAM, nebude serializován a zanikne po přihlášení/odhlášení nebo
zavření stránky. Přetrvání přihlášení zajistí relační cookie aplikace; nové
připojení signeru může vyžadovat nové schválení. Bunker tokeny, jejich tajné
parametry a připojovací URI se neukládají ani nelogují.

## Pořadí implementace a přijímací podmínky

1. Přidat soukromé tabulky, unikátní NPUB, RLS/oprávnění a transakční výzvy.
2. Dodat serverové ověření NIP-98, relace, CSRF/Origin kontroly a limity pokusů.
3. Zapojit NIP-07, následně NIP-46 pro mobil/PWA; chybové stavy neodhalují data.
4. Doplnit převzetí profilů a osobní synchronizaci s revizemi.
5. Před vydáním ověřit přihlášení na dvou zařízeních, odhlášení, odmítnutý
   podpis, expiraci, opakovanou i souběžnou výzvu, jinou URL/metodu/tělo,
   falešný podpis, únos cizí postavy a zachování starého postupu.
6. Zkontrolovat schéma, síť, cookies, všechna úložiště, logy a exporty pomocí
   syntetických markerů: žádný NSEC, seed, jejich bajtový/hex ekvivalent ani
   šifrovaná kopie. API přijímá jen výslovně povolená pole a nikdy neodráží
   neznámý vstup do chyb či logů. Kontrola samotného prefixu `nsec1` nestačí.

Nostr přihlášení samo o sobě neznamená ověřeného člověka, peněženku ani
placený ranked. Stávající plán vstupného a výplat je samostatná budoucí práce.

Primární specifikace: [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md),
[NIP-19](https://github.com/nostr-protocol/nips/blob/master/19.md),
[NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md),
[NIP-98](https://github.com/nostr-protocol/nips/blob/master/98.md).

## Vydání s resetem hráčů

Vydání s epochou 2 zakládá nové účty i místní postavy od nuly. Nejdřív aplikuj
migraci tabulek Nostr, potom nasaď Edge Function s kontrolou epochy. Ověř nový
backend a teprve pak aplikuj uživatelem potvrzenou migraci
`wonderland_player_reset_v2`. V jedné transakci smaže postavy, osobní postup
a oba žebříčky včetně historických řádků. Nemění připojení webu k Supabase.
Následně nasaď web ze stejné revize. Nový web zahazuje stará lokální uložení
při načtení a používá nový jmenný prostor, takže stará karta nový save nepřepíše.
Archivní Cloudflare Durable Object smaže původní herní údaje při inicializaci
nového kódu, ověřovací binding a podpisové tajemství zachová.
