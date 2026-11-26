# Supabase pro WondersLand

První etapa přidává databázové úložiště pro volitelné přihlášení a osobní postup
mezi zařízeními. Osobní postava, zlaté, inventář, výzkum a Důl na bloky mají jeden
společný save ve formátu hry. Hosté se dál ukládají do prohlížeče. Hodnocené běhy,
jejich mince, ověřování vstupů a pořadí zůstávají v Cloudflare Durable Objectu.

Tento PR obsahuje migraci a návod. Přihlašovací a synchronizační klient je
samostatný krok popsaný níže. Samotná migrace nemění chování živé hry.

## 1. Nasazení v Supabase

V Supabase pluginu otevři projekt **WondersLand** a ověř jeho project ref. Pokud
existuje stejnojmenný projekt, vyber správný workspace a ref před zápisem. V
projektu nejprve zkontroluj existující tabulky a historii migrací. Aplikuj [SQL z migračního souboru](../supabase/migrations/20261126092547_wonderland_personal_saves.sql)
jako jednu pojmenovanou migraci
`wonderland_personal_saves`. Pokud tabulka stejného jména existuje a migrace
chybí v historii, nejdřív porovnej její definici a přístupová pravidla.

Tabulka `public.wonderland_personal_saves` používá jako primární klíč ID ze
`auth.users`. RLS dovoluje přihlášenému uživateli číst, založit a měnit vlastní
save. Databáze spravuje revizi a čas posledního zápisu. V nastavení Data API
ověř, že je schéma `public` vystavené. Po migraci spusť bezpečnostní a výkonnostní
advisors a ověř, že tabulka má RLS a všechny tři vlastnické policies. [Data API](https://supabase.com/docs/guides/api/securing-your-api) · [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Text ke vložení do chatu se Supabase a GitHub pluginy:

> Otevři PR s názvem „Supabase setup for WondersLand personal saves“ v repozitáři
> WondrejGrower/WondersLand. Načti celý SQL soubor z adresáře
> `supabase/migrations/` ve větvi PR. V mém Supabase projektu **WondersLand**
> ověř project ref, existující tabulky a historii migrací. Poté použij SQL beze
> změn jako pojmenovanou migraci `wonderland_personal_saves`. Ověř tabulku,
> oprávnění, tři RLS policies a spusť security a performance advisors. Vrať mi
> project ref, Project URL a stav migrace. Databázové heslo a tajné klíče nikam
> nevypisuj.

## 2. Připojení herního klienta

1. V Supabase Auth povol přihlášení e-mailem. Pro šestimístný kód nastav v
   šabloně **Magic Link** proměnnou `{{ .Token }}`. Použij
   `signInWithOtp({ email })` a `verifyOtp({ email, token, type: 'email' })`.
   Pro veřejný provoz nastav vlastní SMTP. [Přihlášení e-mailem](https://supabase.com/docs/guides/auth/auth-email-passwordless)
2. V nastavení hry přidej volitelné přihlášení, odhlášení a stav synchronizace.
   Připni verzi `@supabase/supabase-js` v lockfilu a doruč ji ve stejném buildu
   jako hru. Inicializuj ji pomocí Project URL a **publishable key**. Tyto dva
   údaje mohou být ve veřejné konfiguraci. `service_role`, secret key a heslo k
   databázi do klienta ani repozitáře nepatří. Do pravidla CSP `connect-src` ve
   [společném modulu](../web/security.mjs) přidej přesný origin projektu
   `https://<project-ref>.supabase.co`. [Typy API klíčů](https://supabase.com/docs/guides/getting-started/api-keys)
3. Synchronizuj výhradně osobní save. Před odesláním a po stažení použij
   [stávající validaci a migraci](../web/core.mjs). Odesílej potvrzený stav po
   návratu do tábora a po nákupech, vybavení, výzkumu nebo akcích dolu. Po
   obnově připojení odešli čekající změnu při další návštěvě tábora. Session,
   soukromý klíč hodnoceného profilu ani nedokončený checkpoint výpravy do
   synchronizovaného dokumentu nepatří.
4. Při prvním přihlášení načti stav účtu. Pokud ještě nemá uloženou postavu,
   nabídni převzetí místní postavy a zapiš ji operací `insert`. Pokud existují
   různé místní a cloudové uložení, zobraz výběr obou verzí a po rozhodnutí
   ponech zálohu nahrazené kopie. Mince a postup z obou kopií nesčítej.
5. Další zápisy dělej podmíněně podle poslední načtené revize (příklad níže).
   Zápisy na jednom zařízení řaď za sebe. Nula vrácených řádků znamená
   konflikt, smazaný řádek nebo chybějící přístup. Znovu načti stav a nabídni
   řešení konfliktu, pokud se revize mezitím změnila. Po odhlášení odpoj
   čekající synchronizaci od původního účtu.

Příklad zápisu s ochranou proti přepsání novějšího uložení:

```js
const { data, error } = await supabase
  .from('wonderland_personal_saves')
  .update({ progress })
  .eq('user_id', user.id)
  .eq('revision', loadedRevision)
  .select('revision, updated_at')
  .maybeSingle()
```

Před vydáním zkus přihlášení na dvou zařízeních, převzetí existující postavy
včetně Dolu na bloky, souběžný zápis ze stejné revize a návrat po výpadku sítě.
S druhým účtem ověř, že cizí save nelze načíst, založit ani přepsat. Publikuj
zapojení do hry až po ověření v testovacím prostředí.
