# Registered character layers

- `customization.png` is an unchanged copy of the approved customization v2
  source (16 hair silhouettes and 14 wearable pieces).
- `body-animation.png` is the transparent 12-pose bald/linen base generated
  with the built-in imagegen tool using the approved customization and roster
  as references. Six running poses, two idle poses, jump, fall, land and hit.
- `regions.json` records the inspected alpha bounds, not assumed equal cells.
- `../../web/sprites.mjs` is the compiled, registered 24×40 pixel data.
  `web/pixels.mjs` composites that data in the browser/PWA Canvas. Ordinary apparel
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

Normal web/PWA builds use the committed sprite data; they do not require
ImageMagick or an image API. Both source PNGs ship in dist/art.
The original reference images remain unchanged in art-source/2026-11-08.

The generation prompts are recorded in `body-generation-prompts.txt`. The PNG
was generated and background-extracted with built-in imagegen, not its CLI.

## Camp and flora · 0.3.3

`camp.png` and `flora.png` are transparent cutouts prepared from the two
approved reference JPEGs with built-in imagegen. The unchanged JPEGs remain
in art-source. Exact prompts: `environment-generation-prompts.txt`.
`environment-regions.json` and `web/environment-regions.mjs` contain measured
bounds for all 24 motifs; they do not assume a uniform atlas grid.

```sh
node tools/build-environment-atlases.mjs # Node >=22 and ImageMagick 7
```

Browser/PWA startup decodes each of the two atlas PNGs once.
`web/environment.mjs` draws
cached source regions with nearest-neighbour sampling and clips in world
coordinates before scaling, so even a huge transaction tree uses a bounded number of visible
modules. No frame performs an image download, pixel extraction or atlas rebuild.
The two atlases together transfer about 5 MB before HTTP transport compression.

Wearables now use pose-specific shoulder/elbow/wrist/hip/foot attachment points.
Sleeves follow the upper arm; coat sleeves bend at the elbow and continue to
the wrist. The body panel deforms with the shoulder/hip axis, the pouch follows
the hips, and boots/gloves rotate with their limbs. Completed wearable layers
are cached per item/pose. Camp idle breathing uses a slower two-frame cycle.
[Clothed and isolated wearable poses](../../docs/browser/animated-clothing-layers.png).

## Transaction morphology · graphics v1

`web/environment.mjs` now assembles crowns/shoots from the existing regions,
with stems and bark at whole logical pixels. `web/plant-visual.mjs` supplies stable
amount growth bands and FNV-1a TXID architectures, used by the same client/server simulation.
No PNG inputs or atlas coordinates changed; the atlas regeneration command above
remains authoritative. [Implementation, test results and synthetic gallery](../../docs/PLANT_MORPHOLOGY.md).
