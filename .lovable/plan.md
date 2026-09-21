# Uspořádání 3D zahrady a dům jako centrum historie

## Cíl

Přestavět současnou zahradu z jednotlivých rozházených objektů na jeden srozumitelný celek, aniž se změní ovládání, kamera, Garden Board, Nostr přihlášení nebo synchronizace.

Návštěvník projde přirozenou trasou:

```text
vstupní brána → uvítací cedule → hlavní pěšina → venkovní záhony
                                              ├→ Garden Board
                                              └→ dům / osobní historie
```

## 1. Nové uspořádání světa

- Zachovat existující bránu jako jasný vstup a spawn umístit bezpečně za ni.
- Navázat uvítací ceduli a jednoduchou hliněnou pěšinu tak, aby vedly do hlavní zahradní části.
- Venkovní záhony s rostlinami poskládat jako jeden čitelný pěstitelský celek vedle cesty, ne do průchozí osy.
- Dům otočit a umístit tak, aby jeho vstup směřoval k pěšině a byl snadno dosažitelný.
- Garden Board postavit vedle vstupu do domu s dostatečným odstupem, aby se jeho klikací plocha, kolize a přístupový bod nepřekrývaly s domem.
- Skleník ponechat jako vzdálené pozadí zahrady, mimo hlavní trasu a bez nové funkce.
- Stromy a lehkou vegetaci přeskládat kolem obvodu a funkčních zón; cesta, spawn, záhony, tabule i dveře zůstanou volné.
- Odstranit oba nefunkční portály Plaza a Visit a Friend včetně jejich renderování, interakcí, textů, zvýraznění a kolizí.

## 2. Jednotné prostorové údaje

- Souřadnice domu, tabule, záhonů, brány, cedule, skleníku a spawnu sjednotit v jednom sdíleném layoutu.
- Renderované objekty, kolize, interakční body, navigace kliknutím a rozptyl dekorací budou číst stejné údaje, aby se při dalším přesunu nerozešly.
- Po změně přepočítat statické kolize a ověřit, že přímé click-to-move trasy nekončí uvnitř objektu.
- Neměnit současný CharacterController, režimy WASD/tap/hybrid ani plánování cesty nad rámec nových souřadnic.

## 3. Dům jako osobní archiv

Interakce s domem otevře přepracovaný překryv se třemi samostatnými záložkami:

### Plants
- Přesune sem současnou funkci Indoor Garden.
- Zobrazí indoor rostliny a jejich stávající detail bez změny dat nebo zápisu.

### Diary history
- Zobrazí chronologickou historii záznamů ze všech uživatelových grow diaries, indoor i outdoor.
- Položky použijí existující datum, název rostliny, fázi, textový náhled a obrázek, pokud existuje.
- Výběr položky otevře čitelný detail v rámci domu; nic se nebude duplikovat ani znovu stahovat.

### Activity history
- Zobrazí chronologicky dokončené úkoly, návyky a časovače a také resety Journey z existujících šifrovaných activity logů Garden Boardu.
- Nezobrazí události typu start/cancel jako „dokončené“; lze je ponechat jako neutrální stavové události pouze tam, kde pomáhají vysvětlit časovou osu.
- Nové logy dostanou soukromý snapshot názvu položky a u časovače i délky do již existujícího volitelného `metadata`, aby historie zůstala srozumitelná i po pozdějším smazání presetů či úkolů.
- Starší logy bez metadata zůstanou podporované a zobrazí bezpečný obecný název typu „Removed task“; minulá chybějící data se nebudou domýšlet.
- Zachovat local-first IndexedDB a NIP-44 self-encrypted kind 30078 + kind 78 synchronizaci. Žádná nová databáze ani veřejná data.

## 4. Mobilní a přístupné chování

- Záložky domu budou dotykové, bez vodorovného přetékání na šířce 390 px.
- Zavření zůstane `Esc` na počítači a `X` na mobilu; fokus se po otevření přesune do dialogu.
- Otevřený dům dál zastaví pohyb a zabrání průniku kliknutí/ťuknutí do 3D světa.
- Prázdné stavy jasně odliší „žádné indoor rostliny“, „žádné záznamy deníku“ a „žádná dokončená aktivita“.

## 5. Výkon a hranice zásahu

- Reuse stávajících GLB modelů a instancované vegetace; nepřidávat nové modely, balíčky, fyziku ani post-processing.
- Historické seznamy odvozovat při otevření/změně dat, ne každý snímek; 3D smyčka nezíská React stav ani nové alokace za snímek.
- Garden Board zůstane samostatnou funkcí pro aktivní Tasks/Habits/Timers/Journey; dům bude jejich archiv pouze číst.
- Nezasahovat do diaries publish/edit/delete, Blossom, Grow Feed, Nostr autentizace, šifrování ani click-to-move architektury.

## 6. Dokumentace a ověření

- Zapsat tento autorizovaný zásah do ROADMAP.md a aktualizovat PROJECT_STATE.md, AI_HANDOFF.md a CHANGELOG.md podle skutečného výsledku a omezení starších logů.
- Ověřit v běžícím světě desktop i mobil:
  - spawn a cesta jsou průchozí,
  - modely a jejich interakční oblasti se nepřekrývají,
  - oba portály i jejich kolize jsou pryč,
  - Garden Board stále funguje,
  - dům se otevře chůzí, kliknutím i klávesou E,
  - všechny tři záložky čtou správná existující data,
  - overlay blokuje svět a nemá horizontální overflow,
  - WASD, tap/click pohyb a animace chůze zůstaly funkční.
- Spustit typovou kontrolu, všechny testy a sestavení; doplnit cílené testy pro sloučení a řazení historie, fallback starých logů a zachování šifrovaného publikování.

## Záměrně mimo tento zásah

- Vstup do fyzického interiéru domu a samostatná vnitřní 3D scéna.
- Nové portálové destinace, návštěvy cizích zahrad nebo Plaza.
- Nové ukládání, backend, gamifikace, achievementy nebo questy.
- Zpětné dopočítávání názvů či délek, které staré activity logy nikdy neuložily.
