# Botanical camp, Agility and wearable animation · 0.3.3

The camp-props and botanical reference JPEGs from GitHub are preserved in
assets/art-source/2026-11-08. Their transparent production counterparts,
measured region bounds and exact imagegen prompts are in
[assets/runtime](../assets/runtime/README.md).

## Behavior

All 12 camp motifs are used: cottage, portal, dummy, target, herbal workbench,
forge, chest, wardrobe, garden bed, fire, gardening bench and lantern post.
They retain the existing camp interaction positions; drawing depth follows
object/player feet. The 12 botanical motifs supply transaction plants and
camp/forest decoration. The existing `rose` internal ID remains compatible
and is presented as the new blackberry shrub in results.

The existing special rule remains: a canonical decimal **satoshi amount**
starting with `420` selects `flora_cannabis`. It does not inspect TXID or the
BTC decimal display. TXIDs, exact amounts and the existing height/width curve
are unchanged. Neither source nor synthetic data is fabricated in production.
The visual testing fixtures exist only in test contexts.

Agility retains its stable ID, purchased levels and prices. Its new linear
effect is 0.04% slower expedition time per level, maximum 2% at level 50.
The complete active simulation timestep is multiplied once by 1 − the bonus.
Movement, jumps, gravity, obstacle spawning/motion, fuel, invulnerability,
upgrade windows, time and distance share this game clock. Camp, countdown,
research, menus and network polling retain normal time. Base input buffering
remains physics.buffer; there is no extra Agility buffer bonus. The numerical
cap is an initial conservative tuning choice, not long-term human balancing.
Balance version is wl-0.3-journey-3; save schema stays 5 and records/progress
are preserved.

Torso clothing no longer sits at a fixed run coordinate. The same pose's
shoulders, elbows, wrists, hips and feet drive garment deformation, sleeves,
boots, gloves and pouch. Long coat sleeves bend at elbows toward wrists.
Clothing-only layers are cached per item/pose and completed characters retain
the existing bounded cache. The full assembly mirrors as one character.
Idle breathing uses a slower cycle; running still uses six distinct poses.

Each atlas is decoded once on browser startup or loaded from Qt resources.
Draws use cached images with nearest-neighbour sampling, not per-frame pixel
extraction. Source bounds are cropped against the 640×360 world viewport before
blitting, including for a giant tree. Browser tests wait for scene readiness
after asynchronous atlas loading rather than interacting with unloaded HTML.

## Observed checks

- `npm test`: 26 checks pass, including Agility's cap and identical trajectories
  at equal game time, normal camp/countdown time, 420 mapping/identity, moving
  isolated clothing layers and a bounded single blit for a huge tree.
- `npm run test:environment`: actual Chromium passes transparent atlas loading,
  two startup atlas requests, the 420 cannabis obstacle, translated 2% Agility
  explanation and a rendered contact sheet of full/isolated clothing poses.
- `npm run test:inventory`, `test:browser`, `test:roles`, `test:results` and
  `test:input-feed` pass: saves/import/reset/languages/touch, original journeys,
  fixed roles, result controls and feed exhaustion/recovery remain covered.
- `./bin/test`: 28 Qt checks and 3 Python checks pass, including Agility's
  time scale/trajectory/camp parity and both existing native UI journeys.
- Final native build and camp/run PNG previews pass after the final sleeve
  and idle-art refinements. `npm run deploy:check` packages the new atlas files
  and modules successfully. Dry-run verification itself does not deploy.

## Captures

- [New browser camp](browser/botanical-camp-cs.png)
- [420 cannabis in a synthetic browser run](browser/cannabis-420-cs.png)
- [Agility at its 2% cap](browser/agility-slowdown-cs.png)
- [Two outfits across 12 poses, full and isolated clothing](browser/animated-clothing-layers.png)
- [Qt camp](characters/botanical-camp-cs.png) and [Qt run](characters/botanical-run-cs.png)

Screenshots use isolated synthetic characters and balances. Native previews use
temporary saves. These checks do not reset or access the user's saved character.

`./bin/install --noconfirm` upgraded the desktop package to
`wondersland-game 0.3.3-1`. Restart an already running old process to load it.
