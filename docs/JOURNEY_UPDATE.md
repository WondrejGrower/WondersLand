# Continuous forest and accessible menus · 0.3.1

This revision supersedes the tier selection, onboarding, language and viewport
sections of BRIEF_0_3.md and IMPLEMENTATION_0_3.md. Native Qt/QML implementation
on game/roguelite-0.3. The primary delivery target is now the browser game on wondersland.online:
see BROWSER_TARGET.md and CLOUDFLARE_DEPLOYMENT.md.

## Current flow and controls

Create a name, appearance and role (Gardener, Explorer or Collector). All three
roles are available immediately; the chosen role is permanent until character
reset. Existing characters retain their role and progress. Walk to the gate,
press E, select one of three skills, press E again. Each expedition starts at
0 m, in Forest edge. Empty data shows a connecting screen with a camp exit.
No manual difficulty/tier selection remains. The transaction queue still
replenishes, deduplicates, drains and pauses honestly when empty.

Every menu shares WASD and arrow navigation, E activation and Esc back.
Visible focus, disabled-item skipping, scrolling and mouse controls share the
same buttons. E shortcuts do not auto-repeat, so holding the gate key cannot
also choose a skill. In the name field letters remain text; Enter or Esc
leaves editing, Tab also works. Opening a menu clears held camp movement.
F10 opens settings, F11 toggles fullscreen, ? opens help. Run controls are
Space/W/Up/click (hold for height), F for an acquired jetpack, P/Esc for pause,
B for camp. Results show next run, camp and the real explorer link, without
Copy TXID.

## Regions, progression and saves

`src/balance.json` is the single configuration for region boundaries and
progression requirements. Regions: 0, 500, 1500, 3000 and 6000 m. Palette,
soil, distant scenery and decorations change without stopping simulation.
Colors interpolate over 2.2 seconds. A transaction's collision dimensions
use the shared amount curve only; region, player strength and zoom never
multiply size. Existing obstacles retain their dimensions. Ordinary/aerial
limits, finite fuel, double jumps and two-rescue budget remain.

Progression gates use completed live runs, cumulative live metres and best
single live run separately. Training/replay contribute none. Training and
Strength open after one live run; other stats and flying upgrades at 150/250
cumulative metres; workshop/wardrobe at 500; garden at 1000; Diamond
and jetpack at total 3000 AND best 1500. Additional research slots at total
3000 and total 6000/best 3000. These are initial tuning values, not calibrated
human playtime targets. Roles are selected at character creation and cannot change in camp. Research
completion still controls advanced skill availability; jetpack also requires
the Diamond progression gate. Unlock notices queue individually until camp.

Permanent stat IDs remain strength/agility/magnet/luck/yield and now appear
at Training Grounds. Crafting is in Runic Workshop, equipment/appearance in
Wardrobe, research/exclusion in Spell Garden. Boots require best:1500;
research slots use progression features. Distance milestones pay once at
300, 600, 1200, 1800, 3000 and 4800 m in one live run.

Schema 4 migrates schema 3 with a `.pre-v4` backup. Coins, equipment, level
IDs, classes and research survive. Previously accessible systems remain
unlocked. Old time milestones map conservatively to distance-equivalent
achievements without awarding duplicate coins. Historical cumulative distance
was never stored: migration initializes a documented lower bound from known
best live records/time achievements, rather than inventing a precise total.
Already unlocked old boot recipes are also preserved explicitly. Old tier metadata is retained for historical records and recovery only; its
argument in compatibility APIs no longer affects size, coins or starting point.

## Language and rendering

English is the source and default on new installs. Settings offers English
and Čeština, applies live, and stores `settings.json` separately from
`progress.json` in the application data directory. Reset does not touch it.
The explicit app choice takes precedence over Omarchy; no desktop language
file is modified. CLI `wondersland-game language cs` sets this user's choice.
Dynamic configuration/C++ labels use the same dictionary as QML and Canvas.
Coins/seeds use Czech plural forms; satoshi grouping and BTC decimal formatting
work directly on decimal strings, preserving every digit.

The world camera uniformly fits the available area, using nearest-neighbour
texture sampling and no smoothing. It allows fractional zoom between integer
levels, avoiding the previous floor-to-1× island. Integer source pixels remain
sharp, with occasional unequal displayed pixel widths at fractional zoom.
World physics stays at 640×360. Menus are outside that camera, sized in window
logical pixels, scroll and wrap. Camp mouse coordinates use the inverse of
the same transform. Header/footer have compact margins. Narrow aspect bars
are expected; there is no independent X/Y stretching.

Verification results and screenshots: JOURNEY_VERIFICATION.md.

Browser results keyboard clarification: Space remains a jump key and cannot activate
result buttons, including when held across a collision. Select Try again or
Return to Base Camp using WASD/arrows and confirm with a fresh E (or click).
