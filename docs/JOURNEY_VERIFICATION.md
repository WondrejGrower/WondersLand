# Verification · continuous forest revision 0.3.1

2026-11-08 · native Qt 6.12 / GCC 16.2 · game/roguelite-0.3.

- `./bin/build`: successful, also built through Arch makepkg.
- `./bin/test`: QtTest 25 passed, 0 failed (includes init/cleanup);
  Python unittest 3 passed, including catalog/configuration coverage.
- Native QML keyboard journey: name text Q/P/E, creation, walking to the
  portal, one E opening skill selection, held/repeated E not selecting,
  S/Up selection, new E starting at 0 m, jump, pause/Continue, automatic
  crossing of 500 m, collision with a giant real-ID fixture, E retry and
  a fresh 0 m selection, Esc camp and F11 fullscreen toggle.
- Native menu controls: W/S and Left/Right navigation, disabled max-stat
  buttons skipped, E context action, Esc close, F10 settings and English /
  Czech changes. A live-language assertion checks the actual QML Settings
  label, in addition to translator state.
- Region backend check holds existing transaction ID, width and height
  across the boundary. New runs always reset distance and region. The
  amount curve remains monotonic and region-independent without a cap.
- Legacy migration checks coins, owned gear, stat levels, classes, research
  access, old unlocked boot recipe and `.pre-v4` backup. New progression
  accumulates short live runs; replay/training never unlock or pay. Reward
  UUID idempotence and corrupt-save protection remain covered.
- Language persistence/reset, Czech coin plural forms and exact large
  satoshi string formatting are covered. No desktop language file changed.
- Native QML resizing/clicking checked at 1280×720, 1366×768, 1920×1080 and
  640×520. Same native coordinate/menu test also passed with QT_SCALE_FACTOR=2.
- Live Qt network probe returned `{ "live": true, "transactions": 10 }`.
  This establishes endpoint connectivity, not whole-mempool coverage.
- Arch package 0.3.1-1 installed. User's saved application language set to cs;
  default on a fresh install remains en.

## Visual evidence

All images below were rendered by the actual native QML scene, with isolated
synthetic character/progress fixtures. Results use the previously recorded
public transaction dataset and are explicitly marked recorded / not live.
No screenshot contains the user's character or real saved balance.

| Screen | English | Čeština |
| --- | --- | --- |
| Camp | [image](journey-camp-en.png) | [image](journey-camp-cs.png) |
| Skill choice | [image](journey-skills-en.png) | [image](journey-skills-cs.png) |
| Training Grounds | [image](journey-training-en.png) | [image](journey-training-cs.png) |
| Results | [image](journey-results-en.png) | [image](journey-results-cs.png) |
| Settings | [image](journey-settings-en.png) | [image](journey-settings-cs.png) |

Additional camp renders: [1280×720](journey-camp-1280x720.png),
[1920×1080](journey-camp-1920x1080.png), [640×520](journey-camp-640x520.png),
[1366×768 logical at 2× DPI](journey-camp-dpi2.png).
All ten main English/Czech screens and the small/DPI variants were inspected.
Captures emitted no QML errors or warnings. Longer station contents scroll;
menus remain at window scale instead of magnifying with the world.

## Limits

Offscreen/software rendering and input tests do not replace testing every
GPU, compositor or monitor. Aspect-ratio bars remain (especially in tall
windows). Fractional nearest-neighbour zoom preserves hard pixel edges but
some displayed pixels occupy unequal widths. The native explorer URL is
built from the actual TXID; an external browser window was not opened in
this automated verification. Previous portal handoff caveat remains.

Progression thresholds and prices are initial tuning, not a completed human
balance study. The real dataset still has just 10 public recent transactions.
Cumulative historical metres before schema 4 cannot be reconstructed exactly;
migration stores a documented lower bound and keeps acquired content.
The game currently counts completed whole metres for cumulative progress.
Hard crashes may lose the last checkpoint interval. No browser build or
website deployment was performed; the primary browser target is recorded
in BROWSER_TARGET.md for the next implementation phase.
