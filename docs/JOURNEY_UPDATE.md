> Architecture update (2026-11-09): desktop and mobile use the same web/PWA game.
> Qt, QML and native build notes below are historical. See BROWSER_TARGET.md and
> WEB_PWA_TIMING.md. Current balance is journey-7; saves and migrations remain.

# Continuous forest and accessible menus · 0.3.1

Verified server mode, preserved local progression and protected admin test:
[SECURITY_HARDENING.md](SECURITY_HARDENING.md).

Current balance reference: [BALANCE.md](BALANCE.md), rules `wl-0.3-journey-7`.
Later explicit playtest decisions there supersede historical tuning below.

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
cumulative metres; Runic Workshop at best single live run 1000 m OR level 10 in any one
Training Grounds attribute; Wardrobe on reaching the second region (best 500 m); garden at 1000; Diamond
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

## Agility time scale · 0.3.3

The explicit 8 November follow-up replaces Agility's extra input buffer with
very slight time dilation: 0.04% per purchased level, capped at 2% at level 50.
Existing levels, prices and purchases are retained. Base input buffering stays
at the shared physics.buffer value. Only active expedition simulation dt is
scaled, exactly once: jumps, scrolling, obstacle motion, coins, fuel, skill
windows, distance and run time share that scale. Camp movement, countdown,
pause, source polling and wall-clock research retain normal time. At equal
game time jump trajectories and collision geometry are identical.

Balance version is wl-0.3-journey-3. The 2% cap is a conservative initial choice,
not a claim of completed long-term player balancing.

## Practice models

Training Grounds retains permanent stat purchases and now offers a catalogue
of every expedition obstacle model, with previews, single-model repetition
and an all-model sequence. `trainingModels` in balance.json defines canonical
sample amounts; dimensions use the same curve and collision physics as live
expeditions. Practice starts directly with current role, attributes and equipment,
without random starting skills or flying upgrades. Retry repeats the selected
model. Practice never saves rewards, records, checkpoints or progression.

## Strength progression · balance wl-0.3-journey-4

The 8 November playtest follow-up replaces the generous ~71 px initial jump
and +20% maximum Strength with a ~23 px initial peak and quadratic permanent
Strength growth up to the 320 px ordinary ceiling. Level IDs, purchased levels,
prices, coins, unlocked systems and profiles are retained. This is a mechanical
rebalance, so records from the new balance use a new balanceVersion key.

Small practice cannabis now uses exactly 420000 satoshi (20 px), the last
baseline practice model reachable with a held jump and tight timing in all
three roles. Taller 420-prefix transactions retain their true curve dimensions
and may require upgrades. No transaction size/species curve was changed.

Double jumps/emergency jumps/jetpack use an aerial energy ceiling equal to
1.5 times the permanent ordinary peak, capped at 450 px. Run-only leap skills
cannot inflate that permanent ceiling. The existing one-use Explorer emergency
jump remains a role-specific exception, not a repeatable baseline ability.
High jumps scroll the camera vertically after 180 px; this does not scale any
obstacle or change world-space collision geometry.

[Detailed tuning, ideal launch tests and limits](JUMP_PROGRESSION.md).

## Playability and starting skills · balance wl-0.3-journey-5

User playtesting found journey-4's 19–38 ms cannabis launch window too harsh.
Journey-5 keeps small-plant height but lengthens airborne crossing time and
makes ordinary quick clicks retain the full baseline hop. Releasing an upgraded
jump limits the remaining impulse to its basic/skill/role value, so high Strength
still allows controlled low hops. Baseline shrubs remain a progression barrier.

The initial menu now offers Basic Jump +15%, Time Slow 15%, or a Double Jump
recharging every ten active game seconds. Starts have fixed rank-one effects;
economy skills move to subsequent offers. Existing exclusions still apply.
Double Jump recharge freezes with game simulation; landing cannot reset it.
[Current mechanics and real keyboard/mouse/touch regression](JUMP_PROGRESSION.md).

## Full viewport and monthly community board · journey-6

The user chose to make common shrubs/ferns approachable at baseline, retaining
upgrade-based taller trees. Basic impulse 90, Strength coefficient 9, existing
130/170 gravity; amount curves, skills, bought levels and prices stay intact.
The mempool rule is paramount: even the first live transaction may be an
impossible sequoia. There is no amount/profile-based transaction filtering.

The browser now fills its available viewport with a uniform responsive camera,
with explicit Fullscreen/F11 and an immersive fallback. Shared art clips to the
visible world bounds without altering transaction geometry. Online monthly
community records store best distance, total distance and completed live attempt
count in a persistent SQLite Durable Object; training/recorded runs are excluded.
Month assignment uses server UTC. This is not the future paid ranked mode.
[Implementation, screenshots and actual verification](FULLSCREEN_MONTHLY.md).

## Higher baseline hop and continuous flight animation · journey-7

9 November playtest: Wondrej found the new character’s ordinary jump too small
and its animation awkward. Launch/tap impulse is now 140, ascent gravity 210
and descent gravity 280: about 46.67 px ideal peak, up from 31.15 px, with a
slightly shorter complete hop. Strength’s quadratic coefficient is 5.7 to keep
level-50 height close to the previous value. The shared sprite extends its legs
smoothly before contact and uses a shallow 0.16 s landing compression. Existing
progress, prices and obstacle amounts/dimensions remain intact. This revision is
prepared locally; verification and deployment status: [JUMP_FEEL.md](JUMP_FEEL.md).
