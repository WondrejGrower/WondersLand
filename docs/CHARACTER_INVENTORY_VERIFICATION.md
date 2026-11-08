# Character inventory · 0.3.2

The character/inventory brief is implemented in the browser and Qt clients.
The original art-source directory is preserved. Production registration data,
PNG layers, generation prompts and rebuild instructions are in
[assets/runtime](../assets/runtime/README.md).

## Behavior

- All 16 approved hairstyles (12 short and four long) and 14 basic wearable
  pieces have separate, stable IDs. Head, torso, legs, feet, hands and belt
  are independent slots. Hair/skin remain appearance properties.
- Creation saves exactly the chosen initial outfit once, already equipped.
  Defaults are a tunic, trousers, leather boots, gloves and pouch, with no hat.
  Other basic variants can be explicitly collected for free in Inventory.
  Taking an item does not equip it or duplicate existing ownership.
- Inventory is available immediately from the camp header, before Wardrobe
  unlocks. Its preview, slots and actual owned pieces reflect saved data.
  Each item identifies its slot and has an equip/unequip action. Keyboard,
  mouse and touch work; the creator name still accepts normal text.
- Both runtimes use schema 5, retaining old character name/role, appearance,
  coins, records, unlocks and purchases. Schema-4 migration supplies a basic
  cosmetic outfit once, preserving legacy Diamond flags/abilities independently.
  The old native file is backed up as .pre-v5, browser data as
  wl-progress-pre-v5. Normal reload does not grant clothes again.
- Ordinary clothing grants no strength, magnet, rescues or other gameplay
  bonuses. Legacy Diamond switches still control the old mechanics; the new
  renderer never uses them to paint turquoise boots/gloves. Future Diamond
  cosmetics are not included among starter clothes.
- The shared 24×40 renderer composites registered pixel layers, with 12 base
  poses (six run, two idle, jump, fall, land, hit), separate limb attachments,
  trousers on the animated leg silhouette and whole-character mirroring for
  leftward camp movement. Sprites are cached (maximum 256 poses). Existing
  transaction collision dimensions and all physics parameters are unchanged.
- Each of the five Training Grounds stats has a translated explanation of its
  actual effect, alongside the current/next numeric bonus and purchase price.

## Verification

`npm ci` and all 22 core/feed/Worker/inventory checks pass. Actual Chromium
checks pass via `npm run test:inventory`, `test:browser`, `test:roles`,
`test:results` and `test:input-feed`. These cover 16 distinct rendered hair
silhouettes, initial outfit choice, swapping/removing gear, ownership,
persistence, schema-4 import/migration, reset, languages, touch/narrow viewport,
all five stat descriptions, normal journeys, fixed roles, results input and
transaction depletion/recovery. `npm run deploy:check` includes sprite data
and both PNG source assets successfully; that check does not deploy.

The native application builds with `./bin/build`. The inventory/migration Qt
check passes, including preserving existing Diamond ownership and abilities.
The complete `./bin/test` run passes: 27 Qt checks and 3 Python checks.
`./bin/install --noconfirm` installed package `wondersland-game 0.3.2-1`.
Preview commands used temporary saves; the user's native progress was not reset.

## Visual checks

- [All hairstyles and animation poses](browser/character-poses.png)
- [Character creation](browser/inventory-creation-cs.png)
- [Inventory, Czech](browser/inventory-cs.png), [English](browser/inventory-en.png),
  [narrow touch viewport](browser/inventory-mobile.png)
- [All five stats, Czech](browser/training-info-cs.png),
  [English](browser/training-info-en.png)
- [Qt inventory](characters/native-inventory-cs.png),
  [Qt Training Grounds](characters/native-training-cs.png)

Screenshots use synthetic characters and balances, not the user's save.
The sprites remain a small 24×40 pixel world; the detailed source illustrations
are intentionally sampled to a common grid rather than drawn at full source
resolution. Inventory is local to a client, using the existing explicit
export/import workflow; there is no automatic browser/native save sync.
