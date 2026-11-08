# WondersLand [WL] — detailní zadání pro Codex

Datum zadání: 8. listopadu 2026.

Pracuj na existujícím projektu WondersLand [WL]:

https://github.com/WondrejGrower/WondersLand/tree/game/wondersland-0.2

Základem je větev `game/wondersland-0.2`, nikoli `main`. Před úpravami ověř aktuální stav větve, přečti příslušné `AGENTS.md`, `README.md`, `docs/PROJECT.md` a `docs/AI_REVIEW.md`. Respektuj rozpracované změny. Pro tuto práci použij samostatnou vývojovou větev odvozenou od herní větve.

Níže je nové zadání další hratelné verze. Implementuj jej v existující aplikaci, ne pouze jako popis budoucích možností. Starší text v projektové dokumentaci, který odkládá funkční skilly a upgrady, aktualizuj podle tohoto zadání. Platby, peněženku na bitcoin a produkční nasazení tímto nepožaduji.

## 1. Identita projektu a reference

WondersLand je samostatná pixelová arkádová roguelite v bitcoinovém lese. Postava automaticky běží a překážky představují skutečné bitcoinové transakce pozorované v živém mempoolu. Jejich součet výstupů určuje velikost rostliny. Po konečném nárazu musí hráč zjistit, která skutečná transakce jeho běh ukončila.

Reference mají různé role:

| Reference | Co z ní přenést |
| --- | --- |
| Terraria | Detailní originální pixel art, příroda, animované postavy, viditelné vybavení a útulný tábor. |
| Magicraft | Výpravy z tábora, schopnosti, synergie a různé sestavy pro jednotlivé běhy. |
| Google Dinosaur | Jednoduché ovládání, automatický běh, jasná kolize a rychlý další pokus. |
| Flappy Bird | Důraz na načasování a skutečné zlepšování hráče. |
| Jetpack Joyride | Mince v prostředí, riskování pro odměnu, dočasné schopnosti a efektní záchrany. |
| The Tower | Dlouhodobá dílna, výzkum, tiery, milníky a postupné otevírání dalších systémů. |

Inspiruj se principy, nekopíruj jejich assety ani rozhraní. Hra nemá poslední úroveň s definitivním vítězstvím. Dlouhodobé cíle jsou další tiery, výzkum, specializace, vybavení, herbář a rekordy. První implementace může mít konečný počet položek; jejich dokončení nesmí ukončit možnost dalších běhů.

Současný projekt je nativní C++17 / Qt Quick / QML aplikace pro Linux/Omarchy. Zachovej samostatnou aplikaci a spouštěč WondersLand [WL] mimo kiosk. Neměň KioskChy ani původní web v `main`. Budoucí umístění na wondersland.online je samostatná práce; nyní kvůli tomu nepřepisuj aplikaci do jiné technologie.

## 2. Nejdůležitější změna: nepřekonatelná transakce je součást hry

NEPLATÍ předchozí návrh, podle kterého musí generátor pro každou překážku vytvořit dosažitelnou cestu.

Platí toto:

- Trať vzniká z reálných transakcí. Velká transakce může vytvořit strom, který aktuální postava nepřeskočí.
- Není povinné nabídnout pod stromem tunel, cestu po větvích nebo bezplatnou záchranu.
- Generátor nesmí strom zmenšit, odstranit nebo přesunout jen proto, že hráč nemá dostatečný skok.
- Výběr transakcí nesmí být skrytě zvýhodňován podle vybavení, počtu proher, zůstatku nebo síly postavy.
- Silnější postava překoná větší část distribuce transakcí. Největší objekty zůstávají hrozbou i pro pokročilé sestavy.
- Délku běhu ovlivňují ovládání, sestava, spotřeba omezených schopností a aktuální složení transakcí.
- Nepřidávej pevný čas, po kterém hra hráče povinně zabije.

Čitelnost a technická správnost jsou stále důležité. Hráč musí mít možnost překážku vidět před kontaktem, kolize musí odpovídat zobrazení a velký strom se nesmí objevit přímo na hráči. Nemusí však existovat řešení bez použití záchrany. Nedostatečná velikost skoku není chyba generátoru, kterou má automaticky opravit.

## 3. Co ověřit v současném kódu

Ve zkontrolované verzi se v `src/backend.cpp` používá počáteční rychlost výskoku 285, gravitace 570 při drženém vzestupu a 850 jinak. Maximální skok vychází přibližně na 70 logických pixelů. Rostliny končí pevnou výškou sekvoje 148 px.

Pevný poslední rozměr by po dostatečných upgradech dovolil přeskočit všechny velikostní kategorie. To odstraň přechodem na plynulou velikostní křivku a kontrolou maximálního účinku všech schopností dohromady.

Ve stejné verzi se při startu kopíruje `pool` do `runPool` a překážky se vybírají pomocí `index % runPool.size()`. To není průběžná živá fronta a při delším běhu opakuje stejný zásobník. Uprav to podle části o zdroji dat. Pokud už se kód změnil, vycházej ze skutečné aktuální implementace.

## 4. Velikost transakce → velikost rostliny

Peněžní hodnotu ukládej jako celočíselné satoshi. Zobrazenou hodnotu označuj jako „součet výstupů“ / „output total“, nikoli čistý převod mezi dvěma lidmi. Poplatek nemá určovat velikost.

Výpočet rozděl na:

`baseHeight = sizeCurve(outputTotalSats)`

`collisionHeight = baseHeight × tierSizeMultiplier`

`width = widthCurve(collisionHeight)`

Rozměry jsou v logických pixelech herního světa, nikoli v pixelech monitoru. Změna velikosti okna, DPI nebo fullscreen nesmí změnit fyziku ani obtížnost.

Startovní kotevní body křivky:

| Součet výstupů | Satoshi | Základní výška při T1 |
| --- | ---: | ---: |
| 0,001 BTC | 100 000 | 12 px |
| 0,01 BTC | 1 000 000 | 28 px |
| 0,1 BTC | 10 000 000 | 48 px |
| 1 BTC | 100 000 000 | 72 px |
| 10 BTC | 1 000 000 000 | 108 px |
| 100 BTC | 10 000 000 000 | 162 px |
| 1 000 BTC | 100 000 000 000 | 243 px |
| 10 000 BTC | 1 000 000 000 000 | 365 px |

Tato tabulka je výchozí návrh měřítka, nikoli už změřený balanc. Podle analýzy skutečných zaznamenaných dat ji bude možné globálně změnit. Nepředstírej, že už s ní vychází požadované délky běhů.

Pro implementaci použij mezi kladnými kotevními body interpolaci logaritmu výšky podle logaritmu hodnoty:

`t = log(V / V_i) / log(V_next / V_i)`

`H = exp(log(H_i) + t × (log(H_next) - log(H_i)))`

Pro `0 ≤ V < 100 000 sats` začni například `H = 4 + 8 × sqrt(V / 100 000)`. Nulovou platnou hodnotu obsluž explicitně. Nad poslední kotvou pokračuj růstem přibližně ×1,5 za každý desetinásobek hodnoty, bez herního zastropování na posledním řádku. Nevytvářej logaritmus nuly. Převod na celočíselný pixel musí být stabilní a monotónně neklesající.

Výchozí šířka může být `clamp(round(12 + 0.18 × H), 14, 96)`. Omezovat šířku kvůli čitelnosti lze; výšku nepřivazuj k maximální výšce viewportu. Kolizní rozměry a sprite musí působit jako tentýž objekt. Dekorativní listy mohou přesahovat jasně definovaný kolizní obrys, ale ne o polovinu stromu.

Odděl druh rostliny od mechanického rozměru. Větší hodnota se nesmí kvůli zvláštnímu druhu změnit na malou překážku. Stávající easter egg s hodnotou začínající na 420 může ovlivnit druh nebo vzhled konopí, nikoli přepsat vypočtenou výšku na 43 či 110 px. Varianty podle TXID používej hlavně pro barvy, listy, větvení a další vzhled.

V rámci stejného `balanceVersion` a tieru musí stejná transakce dostat stejný rozměr. Nikdy nedopočítávej velikost podle dosažené výšky skoku, vybavení nebo aktuálního rekordu konkrétní postavy.

## 5. Skok, statistiky a konečné limity pohybu

Smyslem upgradů je zpřístupnit větší část lesa, nikoli vytvořit sestavu, která přeskočí každou reprezentovatelnou transakci.

Startovní fyzikální cíle:

| Mechanika | Cíl |
| --- | --- |
| Základní obyčejný skok | Přibližně 70 px. |
| Běžný skok se silnou sestavou | Přibližně 100–110 px. |
| Tvrdý limit obyčejného skoku | 110 px nad zemí. |
| Dvojskok a letecké schopnosti | Společný konečný limit přibližně 170 px nad zemí. |
| Vysoké stromy nad tímto dosahem | Vyžadují omezený průchod / záchranu, jinak ukončí běh. |

To jsou cíle skutečné simulované trajektorie. Nestačí omezit jednu položku v UI. Spočítej dohromady vliv výchozí síly, dílny, classy, vybavení, dočasných skillů, držení tlačítka, gravitace a opakovaných vstupů.

Síla má zvyšovat výšku skoku. Pozor: procento přidané k počáteční rychlosti není stejným procentem výšky. Kalibruj podle výsledné trajektorie, zejména při rozdílné gravitaci při držení a puštění skoku.

U dvojskoku omezuj přidaný impuls/energii, ne pouze následně ořezané `y` s nepřirozeným nárazem do neviditelného stropu. Během jednoho pobytu ve vzduchu lze vyčerpat jen povolený počet skoků. Vzdušný upgrade nesmí neomezeně obnovovat další skok.

Kluzák může prodloužit sestup, ale nezvyšuje sám výšku. Jetpack musí mít konečnou zásobu paliva na běh a respektovat společný letecký limit. Pro první verzi navrhni například 3 sekundy paliva celkem bez automatické regenerace. Magnet, mince a další skilly nesmí vytvářet nekonečnou smyčku doplňování paliva či záchran.

Limit 170 px není záruka, že lze překonat každou rostlinu vysokou 169 px: záleží i na šířce, načasování a skutečné trajektorii. Pro analýzu používej simulaci celého průchodu kolem překážky, ne pouze porovnání dvou výšek.

## 6. Tiery a obtížnost

Tier si hráč vybírá před během. Jeho pravidla jsou předem známá a během běhu se nepřepínají podle úspěšnosti hráče.

| Tier | Název pro prototyp | Násobitel velikosti | Násobitel mincí | Odemčení dalšího tieru |
| --- | --- | ---: | ---: | --- |
| T1 | Okraj lesa | ×1,0 | ×1,0 | Přežít 180 s v T1. |
| T2 | Hustý porost | ×1,3 | ×1,6 | Přežít 240 s v T2. |
| T3 | Kořenový labyrint | ×1,7 | ×2,5 | Přežít 300 s v T3. |
| T4 | Prastarý les | ×2,2 | ×4,0 | Přežít 360 s v T4. |
| T5 | Myceliální hlubina | ×2,8 | ×6,0 | Přežít 420 s v T5. |
| T6 | Hluboký les | ×3,6 | ×9,0 | Pro první verzi bez dalšího odemčení. |

Po odemčení může hráč nadále hrát nižší tier. Dosažení posledního dostupného tieru neukončuje hru. Názvy nemají slibovat tunely nebo plošiny, pokud taková mechanika není skutečně implementovaná.

Pro první hratelnou verzi důkladně ověř T1–T3, další tiery mohou používat stejnou funkční logiku a datovou konfiguraci. Nepřidávej desítky nefunkčních nebo prázdných obrazovek.

Na začátku použij stávající měřítko rychlosti kolem 105 logických px/s a rozestupy zhruba 2,3–2,9 s. Zrychlení v rámci běhu omez na přibližně +35 % výchozí rychlosti. Nastavení drž v konfiguraci.

Nevkládej do živé sekvence automaticky připravené snadné úseky, umělé bossové transakce ani zaručené obří stromy v konkrétní minutě. Můžeš upravovat tempo, ale rozměry a skladbu transakcí určuje skutečný datový vstup. Základní rozestup musí zabránit nečitelnému náhodnému překrytí dvou spritů; nemusí zaručit dosažitelnost celé sekvence.

## 7. Živý mempool a fronta překážek

Zachovej existující síťový adaptér a odděl jej od hry tak, aby bylo možné později doplnit úplnější zdroj nebo vlastní node. Nepodmiňuj dokončení prototypu provozem vlastního bitcoinového uzlu.

Stávající `/api/mempool/recent` je výřez nedávno pozorovaných transakcí. Neoznačuj jej jako načtení celého mempoolu. V UI zobraz například „Live: recent transactions“ a počet dostupných položek. Pokud použiješ další endpointy, nejdřív ověř jejich dokumentaci a limity.

Požadavky na frontu:

1. Přijaté řádky validuj a deduplikuj podle skutečného TXID.
2. Nové transakce smějí vstoupit do další, dosud nezobrazené části právě probíhajícího běhu.
3. Vybírej z dostupné fronty náhodně s reprodukovatelným RNG; výběr nesmí záviset na hodnotě TX, výbavě ani síle hráče.
4. Už zobrazené překážce zamkni TXID, hodnotu a rozměry. Síťová aktualizace ji nesmí změnit během skoku.
5. Ve stejném běhu znovu nepoužívej stejné TXID. Odstraň cyklické opakování `runPool[index % size]`.
6. Fronta, historie deduplikace i síťové požadavky mají omezenou paměť a rozumné limity. Pokud zahazuješ přebytek, nefiltruj podle velikosti nebo ceny transakce.
7. Při vyčerpání dat nevyráběj falešné transakce a nepřidávej neoznačený replay. Dokonči průjezd viditelných objektů a přejdi do jasně označeného bezpečného čekání na data. Čas výpravy, skilly i výzkumný herní čas se v tomto čekání nepřičítají. Výzkum podle reálných hodin může dál běžet.
8. Po návratu dat dej krátký viditelný odpočet pro pokračování, ne náhlý rozběh po delší pauze.
9. Pokud zdroj vypadne, odliš dostupné už načtené skutečné transakce od nových živých dat. Neukazuj nepravdivé „live“, když není spojení.
10. Transakce byla při příjmu pozorována v mempoolu. Neprohlašuj ji automaticky za stále nepotvrzenou o několik minut později. Aktuální stav po kolizi ověř stejně jako dosud; při chybě zobraz jen to, co skutečně víš.

Reprodukovatelnost živého běhu vyžaduje vedle seedu také záznam skutečně použitých transakcí a událostí. Samotný seed nezrekonstruuje měnící se živý vstup. Pro analýzu ukládej kompaktní trace nebo fixture s pořadím použitých TX, rozměry, tierem a verzí balancu. Různé zdroje náhody (pořadí TX, skilly, dekorace) mají mít oddělené RNG, aby změna vzhledu nerozhodila herní sekvenci.

## 8. Analýza distribuce a skutečný balanc

Náhodný mempool není kurátorovaná trať. Neslibuj garantovanou délku běhu nebo řešení každé situace. Sestav nástroj pro nastavení jedné pevné křivky z reprezentativnějšího zaznamenaného vzorku.

Cíle pro orientační podíl objektů, které daná referenční sestava geometricky nepřekoná bez omezené záchrany:

| Referenční sestava na odpovídajícím tieru | Orientační podíl |
| --- | ---: |
| Začátečník | 2–4 % |
| Rozvinutá postava | 1–2 % |
| Velmi dobrá sestava | 0,5–1 % |

To není pravděpodobnost, kterou má generátor hráči vnutit. Je to návrhová metrika pro kontrolu mapování. Skutečný živý vzorek se může výrazně lišit.

Při přibližně nezávislém výběru, 25 objektech za minutu a 1 % nepřekonatelných objektů vychází střední čekání na takový objekt asi 4 minuty bez započtení chyb a záchran. Je to pouze model. Reálné shluky, odběr vzorku a omezená fronta nezaručují nezávislost; uváděj také simulované mediány a rozptyl.

Analyzátor má pro vstupní dataset vypsat alespoň počet unikátních TX, původ a časové rozpětí dat, percentily hodnot a výšek, podíl nad dosahem referenčních sestav, délky běhů pro více seedů a vliv 0/1/2 záchran. Zahrň šířku a tempo překážek. Odliš geometrickou nemožnost od nepovedeného načasování hráče.

Nekalibruj distribuci celého mempoolu podle jedné odpovědi s deseti transakcemi. Pro první verzi stačí funkční analyzátor a jasně označená neověřená výchozí konfigurace. Syntetická testovací data jsou pro ověření algoritmu, ne důkaz vyvážené ekonomiky nebo skutečné distribuce mempoolu.

Pokud naměřené výsledky nesedí, uprav globální kotvy křivky, referenční limity nebo parametry tierů a přidej novou `balanceVersion`. Neřeš to skrytým dynamickým zmenšováním stromů či výběrem slabších transakcí.

## 9. Tvorba postavy a životní cyklus

Pro první verzi je jeden aktivní profil postavy. Při prvním spuštění bez postavy zobraz tvorbu postavy:

- jméno;
- několik účesů;
- barva vlasů, pokožky a oblečení;
- výběr ze tří class;
- živý náhled používající skutečný herní sprite.

Po vytvoření přejdi do Base Campu. Před během zvol tier a startovní skill. Po konečné prohře můžeš spustit nový běh se stejnou postavou nebo se vrátit do tábora. Obyčejná smrt nemaže trvalý postup.

Trvalý stav postavy: vzhled, classa, mince, vybavení, dílna, výzkum, milníky, odemčené tiery a rekordy. Stav běhu: čas, vzdálenost, dočasné skilly, sebrané odměny, spotřebované záchrany, palivo a konkrétní pořadí transakcí.

V menu přidej samostatné „Reset postavy a postupu“. Po explicitním potvrzení smaže aktivní postavu, měny, vybavení, dílnu, výzkum, odemčení, milníky, rekordy i rozehraný běh a vrátí uživatele do tvorby postavy. Reset není synonymum nového běhu. Zrušení dialogu nic nezmění.

Při psaní jména nesmí globální klávesová zkratka `Q` aplikaci ukončit ani `P` či `E` spustit herní akci. Vstupy a fokus ošetři podle aktuální obrazovky. Kliknutí na menu nesmí zároveň vyvolat skok.

## 10. Classy

Classy mají měnit styl hry. Všechny respektují stejné konečné pohybové a záchranné limity. Pro první verzi použij tento výchozí návrh:

| Classa | Výhoda | Kompromis |
| --- | --- | --- |
| Zahradník | +10 % herních mincí. | −10 % základního dosahu magnetu. |
| Průzkumník | Jeden nouzový dvojskok za běh i bez získání běžného dvojskoku. | −5 % výšky obyčejného skoku. |
| Sběratel | +20 % dosahu magnetu a +1 s dostupnosti letícího upgradu. | −5 % výšky obyčejného skoku. |

Čísla jsou počáteční, nikoli prohlášení o stejné síle class. Ve výsledcích a diagnostice umožni porovnat výnos a přežití podle classy.

Nouzový a běžný dvojskok se nesmějí zřetězit do třetího či čtvrtého skoku. Průzkumníkova jednorázová schopnost nenavyšuje společný letecký limit. Pozdější class mastery připrav jako datově rozšiřitelný systém; nyní nevytvářej desítky prázdných talentů.

## 11. Dílna a trvalé statistiky

Základní dílna se otevře po prvním dokončeném živém běhu a obsahuje pět funkčních větví, každou s 50 úrovněmi:

| Větev | Celkový účinek při úrovni 50 |
| --- | --- |
| Síla | +20 % k cílové výšce obyčejného skoku před společnými limity. |
| Obratnost | Zvětšení tolerance vstupu nejvýše o 40 ms proti výchozímu stavu. |
| Magnetismus | +50 % dosahu sběru před společným limitem. |
| Štěstí | Nejvýše +10 procentních bodů do pravděpodobnosti vzácnější kategorie upgradu. |
| Výnos | +25 % herních mincí. |

Základní skok musí být příjemný i bez obratnosti. Vstupní buffer a krátká tolerance po opuštění země mají existovat už na úrovni 0. Obratnost není povinný nákup k opravení špatného ovládání.

Síla má klesající přírůstky, například bonus `0.20 × sqrt(level / 50)`. Ostatní větve mohou pro první verzi růst lineárně do uvedeného maxima. Konkrétní funkce ulož v konfiguraci a v UI zobraz skutečný účinek další úrovně.

Cena další úrovně v jedné větvi:

`ceil(50 × 1.12^ownedLevels)`

`ownedLevels` je před nákupem 0–49. Orientačně: první úroveň 50 mincí, po 10 zakoupených úrovních 156, po 25 úrovních 851, poslední nákup 12 902. Celá větev přibližně 120 026 mincí. Po dosažení maxima nepovol další nákup.

Procentní bonusy stejného typu nejdřív sečti, potom aplikuj jednou a respektuj společný limit. Nedovol neúmyslné násobení pěti zdrojů stejné statistiky. Pro prototyp nastav celkový dosah magnetu nejvýše 2,5násobek základního a součet běžných ekonomických bonusů nejvýše +100 % před samostatným násobitelem tieru. Pozdější výslovně definované mechaniky mohou mít vlastní pravidla, ne náhodný násobný efekt.

## 12. Startovní skilly a letící upgrady

Před každým během nabídni tři různé náhodně vybrané, již odemčené skilly. Hráč zvolí jeden. Nabídka je čitelná, popisuje přesný efekt a není časově omezená. Volbu ulož do stavu běhu před spuštěním.

Každých 30 sekund aktivního běhu se objeví jeden další letící upgrade. Pauza, menu, čekání na data a neaktivní okno tento čas neposouvají. Časování herního upgradu nemá být vázané na náhodnou dobu vytěžení bitcoinového bloku.

Upgrade předem oznám ikonou a názvem, prolétne zprava doleva a je dosažitelný přibližně tři sekundy, u Sběratele čtyři. Pozici a rychlost dolaď tak, aby toto okno odpovídalo skutečné možnosti sebrání při různých rychlostech hry. Pouhá konstantní rychlost rovná rychlosti stromů tento čas automaticky nezaručuje.

Upgrade musí být fyzicky sebrán. Po minutí odletí a hráč na něj nemá nárok. Sebrání neotevírá menu ani nezastavuje běh. Umísti jej mimo kolizní objem stromu a do výšky dosažitelné aktuální postavou. Tato kontrola dosažitelnosti odměny není povinností vytvořit bezpečnou cestu kolem transakce. Hráč může o odměnu přijít kvůli nebezpečnému úseku.

Jeden běh dovolí nejvýše šest různých skillů, každý nejvýše na úrovni 3. Vylepšení existujícího skillu nezabírá nový slot. Když jsou sloty plné, nabízej existující skilly pod maximem. Když je vše hotové, nabídni jasně označené mince nebo konečný krátkodobý bonus. Nedávej prázdné nebo neúčinné upgrady.

Příklady první sady funkčních skillů:

| Skill | Výchozí účinek a omezení |
| --- | --- |
| Silný odraz | +8 / +16 / +25 % k výšce obyčejného skoku; platí společný limit. |
| Magnetické kořeny | +15 / +30 / +45 % dosahu sběru; platí společný limit. |
| Dvojskok | Jeden další skok ve vzduchu. Vyšší úrovně zlepší řízení/impuls, nikoli počet opakování nad společný limit. |
| Listový kluzák | Omezené prodloužení sestupu, například 0,4 / 0,7 / 1,0 s na skok; nevytváří další výšku. |
| Myceliální štít | Přidá jednu záchranu, pokud ještě nebyl dosažen celkový rozpočet záchran pro běh. Je jednorázový a nemá tři kopie. |
| Vzdušný sběr | Bonus k hodnotě mincí sebraných ve vzduchu, například +10 / +20 / +30 %; započítává se do ekonomického limitu. |

Pro každý skill určuj daty `maxRank`, slot, tagy, předpoklady, efekt a dostupnost. Jednorázový štít může mít `maxRank = 1` jako explicitní výjimku.

Každá třetí sebraná nabídka má mít synergetický tag s některým vlastněným skillem, pokud taková platná nabídka existuje. Například dvojskok + kluzák + vzdušný sběr podporují vzdušnou sestavu, magnet + vzdušný sběr sběrnou sestavu. Při neexistenci vhodné odměny použij normální platnou nabídku. Tato pomoc se týká skillů, nikdy velikostí transakcí.

Vzácnost mění nabídku a sílu jasně definovaným způsobem, ne skrytě počet záchran. Výchozí váhy můžeš nastavit 75 % běžná, 22 % vzácná, 3 % epická. Bonus Štěstí přesouvá nejvýše 10 procentních bodů z běžné do vyšších kategorií v pevně definovaném poměru. Váhy musí zůstat nezáporné a mít součet 100 %. Kategorie nesmí nabízet skilly, které ještě nejsou implementované. Pokud je kategorie po odemčeních a dalších filtrech prázdná, přepočti váhy jen mezi neprázdnými kategoriemi. Nevytvářej kvůli tomu neplatný skill nebo nekonečné opakování náhodného výběru. Každé přiřazení rarity a jeho konkrétní efekt definuj daty; samotná barva ikony nesmí slibovat silnější účinek, který nemá.

Všechny skilly získané tímto způsobem platí pouze do konce běhu.

## 13. Vybavení a DIAMOND HANDS SET

Vybavení se nasazuje v táboře a trvale zůstává postavě. První sloty jsou ruce a boty. Efekty se nesmí přičíst vícekrát opakovaným otevřením šatníku nebo načtením uložené hry.

První set:

- Diamond Hands: +10 % dosahu magnetu.
- Diamond Boots: +5 % výšky obyčejného skoku před společným limitem.
- Oba předměty společně: jedna záchrana navíc na začátku každého běhu.

Set zabírá oba sloty. Na postavě jsou viditelné vlastní pixelové rukavice a boty. Připrav prostor pro jiné předměty, ale nepředstírej existenci dalších setů bez funkčního efektu.

Orientační cena pro prototyp může být 2 000 mincí za ruce a 5 000 za boty. Recept na boty vyžaduje první přežití 120 s v T2. Cíl pro komplet je přibližně 5–10 hodin aktivního postupu. Ceny i časový cíl jsou neověřené; pokud simulovaná ekonomika nesedí, uprav ceny nebo recept, nikoli výnos konkrétnímu hráči za zády.

Záchrany mají společný celoživotní rozpočet pro jeden běh: nejvýše dvě udělené ze všech zdrojů dohromady. Po spotřebování se limit neuvolní pro další doplnění. Počítej tedy i `rescuesGrantedTotal`, nejen právě držené náboje. Set může dodat první, později sebraný štít druhou. Třetí udělit nelze.

Při nárazu s dostupnou záchranou:

1. Spotřebuj právě jednu záchranu.
2. Označ konkrétní kolizi jako vyřešenou, aby během dalších snímků nespotřebovala další.
3. Přidej přibližně dvě sekundy nezranitelnosti a viditelný efekt.
4. Zajisti průchod celou konkrétní překážkou i tehdy, když je tak široká, že dvě sekundy nestačí. Může se ignorovat kolize s touto instancí až do jejího úplného projetí; nezpřístupňuj tím neomezenou nezranitelnost vůči dalším stromům.
5. Zachovej hodnotu, rozměr a TXID stromu. Schopnost nemění bitcoinová data.

Bez záchrany náraz ukončí běh. První verze nepřidává neomezenou regeneraci životů ani nákup pokračování za skutečné peníze.

## 14. Ekonomika, milníky a výzkum

Herní mince jsou pouze herní měna. Zobrazené částky bitcoinových transakcí nejsou odměnou ani zůstatkem hráče.

Na T1 cílí běžné aktivní hraní přibližně na 30–50 základních mincí za minutu před bonusy. Použij čitelné skupinky mincí v prostředí; jejich počet a trajektorie musí tento cíl reálně podporovat. Rizikovější sběr může vydělat více. Neodměňuj samotné stání v pauze, čekání na data, smrt ani otevření výsledků.

Příklad pořadí výpočtu: sebraná základní hodnota → součet povolených běžných bonusů → jeden násobitel tieru → stabilní zaokrouhlení při vyplacení. Nezaokrouhluj každou drobnou procentní minci způsobem, který systematicky smaže bonusy. Můžeš držet pevnou celočíselnou menší jednotku herní měny.

V každém tieru eviduj jednorázové milníky 30, 60, 120, 180, 300 a 480 sekund. Odemčení dalšího tieru může mít vlastní čas z tabulky. Milník poskytne datově definovanou odměnu nebo recept. První dosažení 60, 180 a 300 sekund v každém tieru může dodat vždy jedno vzácné semeno pro výzkum. Opakovaný běh stejné semeno za stejný milník znovu nedá.

Výzkum odemkni po prvním dosažení 60 s v T1. Začni jedním místem, druhé odemkni při 120 s v T2, třetí při 180 s v T3. Pro prototyp je odemčení slotu odměnou milníku, ne další skrytou měnou.

Výzkum platí herními mincemi a podle projektu semeny. Běží podle reálného času i při zavřené aplikaci. Pauza, čekání na mempool a zpomalení vykreslování jej neurychlí ani nezastaví. Lokální offline čas je pro prototyp dostačující; ošetři návrat systémového času zpět a zjevně neplatné hodnoty, bez budování platebního nebo anti-cheat backendu.

První plně funkční výzkumy:

| Projekt | Cena | Doba | Výsledek |
| --- | --- | --- | --- |
| Práce s listem | 100 mincí | 10 min | Odemkne Listový kluzák do nabídek. |
| Vzdušná technika | 500 mincí + 1 semeno | 30 min | Odemkne běžný Dvojskok do nabídek. |
| Spórová ochrana | 750 mincí + 1 semeno | 60 min | Odemkne Myceliální štít do nabídek. |
| Stabilní nabídky | 1 000 mincí + 1 semeno | 120 min | Dovolí v táboře vyloučit jeden odemčený skill z náhodné nabídky; minimum tří dostupných startovních skillů musí zůstat. |

Základní startovní pool proto obsahuje alespoň Silný odraz, Magnetické kořeny a Vzdušný sběr. Vzácnost na začátku smí používat jen dostupné varianty. Nouzový dvojskok Průzkumníka funguje nezávisle na odemčení běžného skillu a stále dodržuje limity.

Po dokončení výzkumu přidej jasné oznámení. Výsledky jsou trvalé. Dražší projekty na hodiny až dny připrav jako datové rozšíření, nikoli jako povinné čekání před prvním zábavným skillem.

Dlouhodobé kosmetické cíle nemají herní bonus. Lightning, dokupování mincí za satoshi, bitcoinové vklady a výběry nyní neimplementuj.

## 15. Pixel art a obrazovky

Současné vyhlazené nebo jednoduché obdélníkové kresby nejsou cílový vizuál. Chci detailní skutečný pixel art inspirovaný Terrarií. Samotný pixelový font, CSS efekt nebo vypnuté vyhlazování nestačí.

- Originální sprite postavy přibližně 24 × 40 px, čitelná silueta a animace běhu, skoku, dopadu a nárazu.
- Několik skutečných snímků běhu; žádné pouhé posouvání obdélníkových nohou.
- Viditelné vlasy, oblečení, rukavice a boty, sestavované ze společných vrstev.
- Rozpoznatelné květiny, kapradiny, konopí a různé stromy. Velký strom má větve, kůru a vlastní kresbu, ne roztažený sprite malého keře.
- Tráva, hlína, kamínky, kořeny a pixelové vrstvy pozadí s paralaxou.
- Omezená soudržná paleta, pixelové světlo a stínování, žádné hladké vektorové náhražky, gradientové objekty ani rozmazání.
- Canvas není sám o sobě zakázaný. Může vykreslovat originální bitmapové sprity nebo je jednorázově generovat do pixelové mřížky. Výsledek musí mít potřebný detail a jednotnou velikost pixelů.
- Herní scénu vykresluj v logickém rozlišení s nearest-neighbor a celočíselným zvětšením, s letterboxem podle potřeby. Menu může být škálované samostatně. Ověř i menší okno.

Nejdřív vytvoř reprezentativní záběr tábora a běhu s postavou, zemí a několika různě velkými rostlinami. Použij jej pro vlastní vizuální kontrolu a dále dokonči implementaci. Nezastavuj automaticky celou práci jen kvůli čekání na schválení každého assetu.

Base Camp zůstává průchozím domovem. Stanoviště mají jasné funkce: portál = tier a start běhu, cvičiště = trénink, dílna = trvalé statistiky a výroba, šatník = vybavení, zahrada/knihovna = výzkum. Nech otevření stanoviště vracet ovládání zpět do tábora bez ztraceného fokusu.

Běhové HUD obsahuje alespoň vzdálenost/skóre, aktivní čas, tier, sebrané mince, aktuální záchrany, palivo pokud je relevantní a šest slotů skillů s úrovní. Velký strom musí být před nárazem dostatečně čitelný, případně se značkou, že jeho koruna pokračuje mimo obraz. UI nemá ukazovat falešnou přesnou pravděpodobnost přežití z jediného malého vzorku.

Zachovej angličtinu i češtinu a existující překladový mechanismus. Omarchy téma může ovlivnit rám aplikace a menu; nesmí náhodně rozbít paletu herních assetů.

## 16. Výsledky běhu a detail transakce

Po konečné kolizi ukaž:

- skutečnou rostlinu, její druh a mechanickou výšku;
- celé TXID s rozumným zkrácením v hlavním zobrazení a možností zkopírovat;
- součet výstupů v BTC a přesnou hodnotu v satoshi;
- tier, vzdálenost a aktivní čas;
- mince za běh a nově získané milníky;
- skutečně ověřený stav transakce nebo poctivou informaci „pozorována v mempoolu, aktuální stav neověřen“;
- odkaz do exploreru;
- Nový běh, Base Camp a případně změnu sestavy v táboře.

Když postava narazila do objektu nad svým dosahem, můžeš to srozumitelně uvést. Neobviňuj hráče z pozdního skoku, pokud fyzicky nemohl překážku přeskočit.

Trénink má ukázkové rostliny bez falešných TXID. Neotvírá explorer s vymyšlenými daty. Trénink nepřidává trvalé mince, semena, živé rekordy, milníky ani postup k odemčení tierů. Reálný čas již spuštěného výzkumu během tréninku normálně plyne.

## 17. Ukládání, migrace a rekordy

Rozšiř současný save o `schemaVersion`. Odděl konfiguraci, stav postavy a stav běhu. Bonusy dopočítávej ze zdrojových nákupů a vybavení, ne opakovaným přičítáním do uložených efektivních statistik.

Zachovej existující oprávněně získané mince. Starší save bez postavy migruj tak, aby uživatel nejdřív vytvořil postavu a poté jednorázově převzal starý zůstatek. Starý rekord označ jako legacy; nevydávej jej za rekord na novém balancu. Neimportuj stejný zůstatek znovu při dalším spuštění nebo po resetu. Poškozený save nesmí automaticky vyvolat nevratný reset bez vysvětlení.

Výplata běhu je idempotentní: konec běhu, návrat do tábora, opětovné otevření výsledků, zavření okna a další načtení nesmějí stejnou odměnu připsat dvakrát. Použij identitu běhu a stav vyplacení nebo obdobné robustní řešení. Milníky a výzkumné platby mají stejnou ochranu.

Rekordy odděluj alespoň podle režimu, tieru a `balanceVersion`; vhodná je i classa. Živé běhy nad různým mempoolem nejsou přísně srovnatelné. Nyní nebuduj veřejný soutěžní žebříček. Pro budoucí denní výzvu připrav možnost fixního datasetu a seedu s odděleným rekordem.

## 18. Architektura a konfigurace

Zachovej stávající stack a vhodně rozděl přerostlé části. Navrhni například samostatné logické celky pro zdroj transakcí/frontu, velikostní křivku, fyziku a kolize, efekty skillů, postup a save. Přizpůsob názvy existujícímu projektu, nevytvářej framework samoúčelně.

Jedna verzovaná konfigurace nebo přehledně rozdělená datová sada má obsahovat:

- kotevní body výšky a funkci šířky;
- násobitele tierů a jejich odemčení;
- rychlost a rozestupy;
- limity skoku, letu, magnetu a záchran;
- skilly, jejich tagy, rarity a maximální úrovně;
- classy, předměty, ceny, recepty a setové bonusy;
- dílnu, výzkum a milníky;
- `balanceVersion`.

Změna ceny nebo účinku jedné úrovně nemá vyžadovat hledání magických čísel v několika QML souborech. UI pouze zobrazuje vypočtené efekty, hlavní rozhodování a peněžní stav drž na straně herní logiky.

## 19. Ověření a akceptační kritéria

Přidej smysluplné testy mechanik a regrese, ne testy, které jen zopakují implementační vzorec.

### Data a velikosti

- Křivka je monotónní, obslouží nulu, malé i velmi velké platné hodnoty a nikde neprodukuje NaN/Inf.
- Nad 10 000 BTC dále roste; 100 000 BTC nemá stejnou výšku jako poslední kotva.
- Ve stejném tieru/verzi má TX stejnou velikost pro začátečníka i veterána a po změně okna.
- Druh, easter egg a dekorativní RNG neobejdou velikostní křivku.
- Změna údajů ve frontě nezmění už zobrazený objekt.
- Živý režim nepoužívá falešná TXID a v běhu neopakuje spotřebované TX.
- Nová přijatá TX může vstoupit do aktuálního běhu až jako budoucí překážka.
- Výpadek a prázdná fronta nezvyšují skóre ani neudělují časové upgrady během čekání.

### Fyzika a schopnosti

- Při skutečné simulaci maximálních kombinací vybavení, classy, dílny a skillů obyčejný skok nepřesáhne 110 px a letecký pohyb 170 px v dohodnuté malé numerické toleranci.
- Opakované stisky, držení, dvojskok, kluzák a jetpack neumožní nekonečný vzestup ani let.
- Ve velikostní křivce existují objekty přesahující nejsilnější pohybovou sestavu; při překážce vyšší než její dosah hra bez záchrany správně skončí.
- Jedna kolize nespotřebuje dva náboje přes více snímků. Široký strom nevyvolá druhou kolizi po skončení efektu stejné záchrany.
- Za celý běh nelze udělit více než dvě záchrany ani jejich opakovaným doplňováním.
- Zkontroluj průchod kolem široké rostliny, skutečné trajektorie a rozumnou stabilitu při různých frekvencích snímků.

### Postup a ukládání

- Nový profil projde tvorbou postavy, táborem, výběrem skillu, během, prohrou a dalším během.
- Smrt smaže dočasné skilly, ale zachová trvalé věci. Reset po potvrzení smaže celý postup a vrátí tvorbu postavy; zrušený reset nic nesmaže.
- Trénink neposkytne žádnou trvalou herní odměnu nebo živý rekord.
- Běh a milník se vyplatí právě jednou i po návratu do tábora a načtení.
- Migrace starého save nepřipisuje mince opakovaně a nevrací je po resetu.
- Nákup s nedostatkem mincí nebo po dosažení maxima nezmění stav. Opakovaný klik a reload nekoupí jednu věc dvakrát neúmyslně.
- Výzkum po restartu správně pokračuje/dokončí se podle reálného času, neplatí se dvakrát a jeho efekt se nesčítá po každém loadu.
- Startovní a letící nabídky respektují odemčení, sloty, maxRank a vyřazený skill. Pauza neposouvá 30sekundový časovač.
- Diamond set skutečně přidá jednu záchranu pouze při vybavení obou součástí a jeho vizuál odpovídá výbavě.

Spusť `./bin/build` a `./bin/test` podle projektu. Ověř nativní QML obrazovky, fokus, ovládání klávesnicí i myší, menší okno a fullscreen. Vygeneruj a vizuálně zkontroluj náhledy alespoň tvorby postavy, tábora, běhu, dílny a výsledku. Při nedostupnosti display serveru využij existující offscreen/preview režim. Vypiš skutečně dokončené a nedokončené kontroly.

Síťové testy odděl od deterministických testů bez sítě. Nevydávej syntetickou fixture za ověření živého mempoolu. Pokud není živé ověření dostupné, aplikace a testy přesto musí fungovat v jasně označeném tréninku.

## 20. Postup implementace a požadovaný výsledek

Postupuj v tomto pořadí, aby se funkce vzájemně nerozbíjely:

1. Zkontroluj existující implementaci, stanov společnou konfiguraci a změň velikostní křivku a fyzikální limity.
2. Odstraň cyklický snapshot a zaveď skutečnou doplňovanou frontu s poctivým označením zdroje.
3. Přidej migraci save, tvorbu postavy, reset a oddělení běhu od trvalého postupu.
4. Implementuj classy, startovní skilly a 30sekundové letící upgrady.
5. Zapoj dílnu, vybavení, Diamond set a společný rozpočet záchran.
6. Přidej funkční tiery, milníky, první výzkumy a vyplácení odměn.
7. Sjednoť detailní pixelovou grafiku a všechna menu. Výtvarný základ průběžně ověřuj už při dřívějších krocích.
8. Spusť testy, analyzátor a vizuální kontroly. Aktualizuj README a projektovou dokumentaci podle skutečně fungujícího stavu.

Nezastavuj po samotném plánu, mockupu nebo vytvoření tříd bez zapojení do hry. Výsledek musí umožnit celý cyklus:

vytvoření postavy → tábor → výběr tieru a skillu → běh mezi skutečnými transakcemi → sbírání mincí a skillů → omezená záchrana → konečná kolize s konkrétní TX → odměny → nákup nebo výzkum → další běh.

Nejdůležitější věc při vyhodnocení: postava se zlepšuje a překonává větší část skutečných transakcí, ale největší transakce zůstávají nad jejím pohybovým dosahem. Hra nesmí jejich velikost přizpůsobit tak, aby šlo všechno přeskočit, ani nesmí tuto překážku obejít nekonečným letem nebo záchranami.

Na konci stručně uveď: co je skutečně funkční, kde je konfigurace balancu, jak hru spustit, jaké testy prošly, jaký zdroj mempoolu používáš, co bylo skutečně změřeno a které číselné hodnoty zůstávají návrhem k ověření. Přilož náhledy výsledného vzhledu a přesné známé nedostatky. Neměň plán na neověřené tvrzení, že je hra už vybalancovaná na měsíce.
