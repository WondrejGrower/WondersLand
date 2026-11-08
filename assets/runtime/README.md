# Registered character layers

- `customization.png` is an unchanged copy of the approved customization v2
  source (16 hair silhouettes and 14 wearable pieces).
- `body-animation.png` is the transparent 12-pose bald/linen base generated
  with the built-in imagegen tool using the approved customization and roster
  as references. Six running poses, two idle poses, jump, fall, land and hit.
- `regions.json` records the inspected alpha bounds, not assumed equal cells.
- `../../src/CharacterSprites.js` is the compiled, registered 24×40 pixel data.
  `PixelArt.js` composites that same data in Canvas and Qt. Ordinary apparel
  uses independent inventory slots; legacy Diamond flags never paint clothing.

The renderer samples individual regions, registers their pivots, splits paired
boots/gloves between moving limb attachments and colors trousers along the
pose-specific leg silhouette. Hair is shaded with the chosen hair color, skin
is recolored separately. It caches completed character poses (at most 256),
uses a single pixel grid and mirrors the assembled character for leftward camp
movement. There are no external art requests or runtime image processing.

After changing PNG inputs, regenerate with Node >=22 and ImageMagick 7:

```sh
node tools/build-character-sprites.mjs
npm run build
```

Normal web/native builds use the committed sprite data; they do not require
ImageMagick or an image API. Both source PNGs ship in dist/art and Qt resources.
The original reference images remain unchanged in art-source/2026-11-08.

The generation prompts are recorded in `body-generation-prompts.txt`. The PNG
was generated and background-extracted with built-in imagegen, not its CLI.
