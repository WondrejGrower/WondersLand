# Diary editing (rename, change plant, metadata)

## Ano, na Nostru to jde — a částečně to už máme

Diáře jsou adresovatelné (replaceable) události kind 30078 s `d: diary-<id>`.
Editace není nová událost vedle staré: podepíšeme stejný `d` tag znovu s novým
obsahem a relaye starší verzi nahradí — vyhrává novější `created_at`. Žádné
mazání, žádná změna formátu, Weedoshi to čte dál stejně.

Co už v kódu existuje: `updateDiary()` ve `writeDiaries.ts` a režim
`{ kind: "edit" }` v `DiaryComposer`. Dnes je ale dostupný jen z jednoho místa
(tlačítko „Edit diary" v detailu deníku) a formulář je stavěný pro zakládání,
ne pro úpravu.

## Co se udělá

1. **Dostupná editace** — „Edit diary" i z karet deníku v seznamu (přes stávající
   overflow/settings místo, ne jako primární tlačítko) a z Latest diary na dashboardu.
2. **Skutečný edit režim v composeru** — jeden krok „Upravit deník" s předvyplněnými
   poli (název, rostlina/druh, kultivar, breeder, fáze), bez pole pro text zápisu
   a bez uploadu obrázku. Tlačítko „Save changes", ne „Publish".
3. **Změna rostliny funguje správně** — při změně názvu rostliny se přepočítá
   `plantSlug` (katalogový slug, nebo `custom:` forma); při vymazání pole se
   slug i `plant` skutečně vyčistí, ne zůstane starý. `species`, `items`,
   `createdAt` a všechny zápisy zůstávají beze změny.
4. **Cover image** — volba obálky z obrázků, které už v deníku jsou (nebo „bez obálky").
   Žádný nový upload v tomto průchodu.
5. **Okamžitá odezva** — po uložení se aktualizuje store i lokální cache, karty a
   detail se překreslí hned a 3D zahrada převezme nový druh rostliny na stejném
   slotu (model se řídí kategorií rostliny, slot se nemění).
6. **Feedback z relayů** — stejný pattern jako u mazání: kolik relayů edit přijalo;
   při odmítnutí všemi zůstane rozpracovaná úprava ve formuláři.

## Omezení, která řekneme uživateli

Relay, který novou verzi nepřijme (nebo ji nemá), může dál vracet starou —
proto se u deníku dál zobrazují relay chips a jde uložení zopakovat.

## Technicky

- `src/nostr/writeDiaries.ts` — `applyInput()` upravit tak, aby vymazání rostliny
  vyčistilo `plant` i `plantSlug` a aby šla nastavit/zrušit `coverImage`.
- `src/ui/DiaryComposer.tsx` — samostatná edit větev (jeden krok, jiný nadpis a CTA),
  bez entry/upload částí.
- `src/ui/DiaryDetail.tsx`, `src/ui/HomeDashboard.tsx` — vstupní body pro edit.
- Store/cache: `upsertDiary` už použitý, jen doplnit zápis do cache deníků.
- Bez backendu, bez změny schématu, bez zásahu do 3D světa mimo automatické
  překreslení rostliny.

## Ověření

Typecheck + build, editace reálného deníku z mobilního rozlišení, kontrola že se
změněný název i druh projeví v seznamu, v detailu i ve 3D zahradě, a že počet
zápisů zůstal stejný.
