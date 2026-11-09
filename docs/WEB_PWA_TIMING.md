# Jedna hra pro web a PWA, 60 / 144 FPS

Výslovný pokyn Wondreje z 9. listopadu 2026 nahrazuje předchozí paralelní
údržbu desktopového C++/Qt a webu. Web, desktopová PWA a mobilní PWA používají
jeden JavaScript/Canvas kód v web/. Konfigurace a české texty zůstávají v src/.

## Architektura

- core.mjs je jediná simulace pro klienta i ověřující server.
- art.mjs obsahuje přímo obě scény, bez extrakce z QML během sestavení.
- pixels.mjs, environment.mjs, sprites.mjs, environment-regions.mjs a
  plant-visual.mjs jsou přímé ES moduly. Generátory grafických dat píšou rovnou
  do web/; synchronizační kopie a sync skripty byly odstraněny.
- progress-validation.mjs je jediný validátor pro klientské importy a server.
- Qt/C++ runtime, QML UI, qmake projekty, nativní testy a Arch balení byly
  odstraněny z pracovních zdrojů. Původní zdroje zůstávají v Git historii.
  Starší nainstalovaná aplikace ani její osobní soubory se automaticky nemažou.
- PWA instalace používá stejný manifest, identitu aplikace a webový postup.
  Staré exporty Qt schémat 3/4/5 zůstávají importovatelné. Nemění se schéma 5,
  klíče osobního/serverového postupu ani persistentní ID žebříčku.

## Snímky a fyzika

Nastavení → Snímková frekvence nabízí **60 FPS** a **144 FPS**, výchozí 144.
Volba je v samostatném wl-frame-rate; reset postavy ji nemaže. Stejné nastavení
funguje v běžné kartě i PWA okně. Prohlížeč vykresluje pomocí requestAnimationFrame
podle skutečného displeje a zvoleného limitu; na 60Hz displeji nelze zobrazit
144 různých snímků za sekundu. Stabilní výkon závisí také na zařízení a zátěži.

Fyzika běží vždy ve 120 pevných krocích/s, včetně osobních běhů. Klientská
predikce a server ověřených běhů mají stejný krok. Pozice postavy, animace,
posun světa, mince a překážky se při vykreslování interpolují mezi kroky.
Interpolace nemění uložený stav, kolize, odměny, cooldowny nebo velikost TX.
Při změně běhu, přechodu herní fáze a opravě serverové predikce se nepřenáší
stará interpolace. Výzkum a síť dál používají reálný čas. Mezi vykreslenými
snímky se sčítá i čas barevného přechodu, takže limit FPS nemění jeho délku.
Texty rozhraní se přepisují pouze při změně, aby nevytvářely zbytečnou práci
při 144 snímcích/s.

Vyšší základní skok a plynulejší let: [JUMP_FEEL.md](JUMP_FEEL.md).
Náhled nastavení: [60 FPS](browser/frame-rate-60.png), [144 FPS](browser/frame-rate-144.png).

## Ověření

- npm test: fyzika/progrese, importy, bezpečnost, serverová simulace, rostliny,
  interpolace a shoda výsledků při 60/144 callbacks/s.
- npm run test:timing: skutečný browserový app loop s řízenými 144Hz callbacks;
  za dvě sekundy přesně 120 / 288 vykreslení podle volby, shodná fyzika a výsledek,
  skutečná klávesová událost a zachování nastavení po reloadu.
- test:browser, test:mobile, test:pwa: ovládání, čtyři rozměry a otáčení,
  Chromium instalovatelnost, návod EN/CS, offline oznámení a zachování postupu.
- test:jump-feel, test:jump-input, test:inventory, test:environment,
  test:roles, test:results, test:input-feed, test:monthly, test:verified:
  regresní kontroly podle package.json.
- npm run test:analysis: tři analytické/překladové kontroly v Pythonu.
- npm run deploy:check: kontrolovaný build, závislostní audit a balení Workeru
  bez skutečného nasazení.

Testy FPS používají syntetické časové značky. Nejde o tvrzení, že testovací
monitor fyzicky běžel na 144 Hz, ani o změřený výkon na všech zařízeních.
Test instalace ověřuje Chromium instalovatelnost a instalační rozhraní;
skutečná instalace do operačního systému a fyzický telefon nebyly provedeny.

Lokálně ověřeno 9. listopadu 2026: **68 Node testů + 3 Python testy** prošly;
prošly i browser, timing, jump-feel, jump-input, mobile, PWA, inventory,
environment, roles, results, input-feed, monthly a verified browser sady.
Deploy dry-run včetně build:checked a závislostního auditu prošel.

## Spuštění a nasazení

```sh
npm ci
npm run build
npm run preview
# http://127.0.0.1:4173/?lang=cs
```

Wondrej 9. listopadu výslovně požádal o publikování na web pro hraní z mobilu.
Nasazení používá stávající GitHub main → Cloudflare integraci. Výsledek na
doméně se ověřuje samostatně v BROWSER_VERIFICATION.md; samotný build není
důkaz nasazení. Původní webový archiv, hráčské soubory a měsíční historie zůstávají.
