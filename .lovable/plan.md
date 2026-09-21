# Stabilizace kamery v Edit mode

## Cíl
Udělat strategickou kameru editoru stabilní a předvídatelnou na mobilu i desktopu, bez zásahu do běžné chůze, click-to-move nebo herní kamery.

## Potvrzený problém
- Posun mapy dnes opakovaně přepočítává průsečík dotyku se zemí přes kameru, která se současně dopočítává do nové pozice. Vzniká zpětná vazba mezi gestem a pohybující se kamerou, což vysvětluje třesení a náhlé změny směru.
- Dvoudotykové gesto zpracovává každý pohyb prstu zvlášť a při přechodu mezi jedním a dvěma prsty nemá stabilní reset výchozích hodnot. To může skokově změnit rotaci nebo přiblížení.

## Úpravy
1. **Stabilní posun mapy**
   - Nahradit posun přes opakovaný raycast posunem podle rozdílu obrazovkových souřadnic.
   - Převést tento rozdíl do směru aktuálního natočení kamery a škálovat jej podle vzdálenosti kamery.
   - Aktualizovat výchozí bod po každém pohybu, aby nevznikala kumulativní zpětná vazba.

2. **Jednoznačná mobilní gesta**
   - Jeden prst v režimu Kamera: posun mapy.
   - Dva prsty: pinch zoom a řízené natočení bez současného posunu objektů.
   - Při přidání nebo odebrání prstu vždy znovu nastavit gesture baseline, aby kamera neposkočila.
   - Korektně ukončit gesto při `pointercancel`, ztrátě capture nebo focusu.

3. **Oddělení editace objektů**
   - Režim Úpravy zachová přesný výběr a tažení objektů.
   - Manipulace s objektem nebude současně posouvat ani otáčet kameru.
   - Přepnutí režimu okamžitě zruší rozpracované gesto.

4. **Plynulá kamera bez boje ovladačů**
   - Zachovat bird’s-eye pohled, limity přiblížení a náklonu.
   - Kameru řídit jen z editorového ovladače po dobu otevřeného editoru.
   - Upravit vyhlazení tak, aby nevracelo vstup zpět a nezpůsobovalo vibrace.

## Ověření
- Desktop: pan, orbit, kolečko/zoom tlačítka, výběr a přesun modelu, reset pohledu.
- Mobil 390×710 a 390×844: jednoprstý pan, dvouprstý zoom/otočení, přechody 1↔2 prsty, panel bez úniku dotyků do světa.
- Ověřit, že po zavření editoru se vrátí původní hráčská kamera a chůze.
- Spustit typecheck, testy a build; aktualizovat stavovou dokumentaci pouze skutečně ověřeným výsledkem.
