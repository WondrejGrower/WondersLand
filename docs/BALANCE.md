# How WondersLand balance works

Current rules: **`wl-0.3-journey-6`**, application 0.3.3, checked on 2026-11-08
against commit `dbfe59e`. This is the current reference for players and coding
agents; historical briefs and earlier playtest requests may describe older rules.
The executable source of values is [src/balance.json](../src/balance.json).
This document describes the implementation, not a promise of calibrated playtime.

## Pro české hráče

- Les vzniká ze skutečných nedávných transakcí. **I úplně první překážka může
  být nepřekonatelná sekvoje.** Hra nezajišťuje bezpečnou cestu a nevybírá
  menší transakce podle síly postavy.
- Základní skok nyní zvládá běžné keře a kapradiny. Větší stromy vyžadují
  postupné vylepšování; druh sám nezaručuje konkrétní velikost. Malé konopí
  lze přeskočit, velké konopí může být nepřekonatelné.
- Při startu volíš Basic Jump (+15 % základní výšky), Time Slow nebo Double
  Jump (další skok jednou za 10 sekund aktivní hry). S vyšší Silou skok
  **podrž**, abys využil její přínos; krátké klepnutí jej zkracuje.
- Částka je součet výstupů transakce, ne poplatek ani čistá platba. Prefix
  `420` v částce mění vzhled na konopí, nikdy mechanickou velikost.
- Trénink používá označené modely a tvé vybavení/staty; nedává trvalé odměny
  a nepatří do žebříčku. Žebříček je komunitní, výsledky nejsou serverově
  ověřeným ranked režimem. Vstupné 1000 sats zatím neexistuje.

The detailed rules below are in English so players and coding agents can share
one precise reference.

## Mempool determines the obstacles

The source is `mempool.space/api/mempool/recent`: a sample of recently seen
transactions, **not the complete mempool**. The queue shuffles the available
sample using the run seed; it does not claim blockchain order or uniform sampling
of the entire mempool. It never filters or reorders by amount, jump ability,
viewport, equipment or region to give a safe start. A first sequoia is valid.

New transactions can join the future part of an active run. TXIDs are deduplicated
within that run. Existing obstacles retain their amount, dimensions and visual
descriptor. With no data left, gameplay waits honestly; it does not replay the
sample. Time, metres, fuel and ability cooldowns freeze, then the existing
three-second countdown resumes the run when data arrives. There is a 10,000-TX
per-run safety bound; reaching it also requires a new run rather than replay.
Web and Qt have separate RNG implementations; equal seeds are not a promise of
identical transaction order between the two runtimes.

## Amount, species and size

`V` is the **sum of transaction outputs** in exact integer satoshi. It is not
net money sent between people and not the fee. The web stores canonical decimal
strings. BTC text is display only. Species intervals include the left boundary
and exclude the right boundary:

| Species | Satoshi interval |
| --- | --- |
| flower | 0 ≤ V < 100,000 |
| tulip | 100,000 ≤ V < 350,000 |
| rose (Blackberry shrub in the UI) | 350,000 ≤ V < 800,000 |
| fern | 800,000 ≤ V < 1,000,000 |
| birch | 1,000,000 ≤ V < 100,000,000 |
| pine | 100,000,000 ≤ V < 1,000,000,000 |
| oak | 1,000,000,000 ≤ V < 100,000,000,000 |
| sequoia | V ≥ 100,000,000,000 |

A canonical amount beginning with `420` uses **cannabis**, overriding species
only. A TXID containing 420 does not activate it. For example, 420,000 sats is
20 px tall; 420,000,000 sats produces a much taller cannabis plant using the
same size curve as every other transaction.

| Satoshi | Height (logical pixels) |
| ---: | ---: |
| 0 | 4 |
| 100,000 | 12 |
| 1,000,000 | 28 |
| 10,000,000 | 48 |
| 100,000,000 | 72 |
| 1,000,000,000 | 108 |
| 10,000,000,000 | 162 |
| 100,000,000,000 | 243 |
| 1,000,000,000,000 | 365 |

Below the first anchor, `H = round(4 + 8 × sqrt(V / 100000))`.
Between anchors `(A, HA)` and `(B, HB)`, interpolate in logarithmic value **and
height**: `t = log(V/A) / log(B/A)`, then
`H = round(exp(log(HA) + t × log(HB/HA)))`.
Above the last anchor, `H = round(365 × 1.5^log10(V / 1000000000000))`;
growth continues. Width is `clamp(round(12 + 0.18 × H), 14, 96)`.

These dimensions are independent of role, progression, region, metres travelled,
DPI and camera. Species boundaries never shrink an obstacle. Four or more
structural silhouettes per species vary with growth and deterministic FNV-1a
TXID hashing; graphics version is separate from balance version. Artwork cannot
increase the hitbox. See [plant morphology](PLANT_MORPHOLOGY.md).

## Jumping and the starting choice

The unmodified Gardener launch is 90 px/s; ascent gravity is 130 px/s², descent
gravity 170 px/s². Its continuous ideal peak is about **31.15 px**. Explorer and
Collector have a −5% height bonus (about 29.60 px). Clearing a plant needs enough
height **through its full collision width**, not just an apex above its top.
Simulation steps, speed and launch timing matter.

Each live run starts with a rank-one choice, subject to an explicitly excluded
skill:

| Choice | Effect |
| --- | --- |
| Basic Jump (`leap`) | +15%, +30%, +45% height bonus at ranks 1–3 |
| Time Slow (`timeslow`) | Whole-expedition slowdown 15%, 20%, 25% at ranks 1–3 |
| Double Jump (`double`) | One aerial jump per takeoff, recharging every 10 active game seconds; impulse fractions 0.65, 0.8, 1 at ranks 1–3 |

Basic Jump bonuses are **additive to the height bonus**, not to velocity and not
multipliers of an already upgraded Strength height. For example, a fresh
Gardener with the rank-one skill has an ideal peak of about 35.83 px.
Time Slow slows jumps and obstacles together; it improves real-time reaction
room without making plants smaller or awarding metres while paused.

Holding jump preserves the Strength-enhanced launch. Releasing caps upward
velocity to `90 × sqrt(max(0, 1 + role + leap + boots))`, deliberately excluding
Strength. An instant tap retains the baseline jump; later upgrades need holding.
The input buffer is fixed at 0.1 s; Agility does not enlarge it.

The ordinary jump limit is 320 px. The aerial limit is
`min(450, 1.5 × permanent jump height)`, excluding the temporary Basic Jump skill
but including role, Strength and Diamond Boots. A rank-one Double Jump does not
instantly grant a 450 px jump. Landing resets the once-per-takeoff flag, **not**
its ten-second cooldown. Pausing/waiting/countdown consume no cooldown.
Explorer also has one emergency aerial jump per run when the skill is unavailable.
Jetpack, once unlocked and acquired, has only 3 seconds of fuel for the whole
run and respects the aerial limit. At most two rescues can be granted per run;
one broad tree cannot consume repeatedly granted rescues.

## Permanent development and practice

Strength level `L` (0–50) adds `9 × (L/50)²` to the height bonus. All five stat
branches cost `ceil(50 × 1.12^L)` for the next level and stop at 50.
Agility slows expedition simulation by `0.02 × L/50` (maximum 2%); its time
factor multiplies Time Slow's factor. Magnetism adds up to 50% collection range,
Luck shifts offer rarity weights, and Yield adds up to 25% coin bonus. None
changes transaction amounts. Research uses real time, independently of run time.

Synthetic timing references, Gardener, no equipment/run skills, initial speed:

| Practice fixture | Satoshi | Height × width | First Strength level found |
| --- | ---: | ---: | ---: |
| Flower | 50,000 | 10 × 14 | 0 |
| Tulip | 250,000 | 17 × 15 | 0 |
| Blackberry shrub | 600,000 | 23 × 16 | 0 |
| Fern | 900,000 | 27 × 17 | 0 |
| Small cannabis | 420,000 | 20 × 16 | 0 |
| Birch | 10,000,000 | 48 × 21 | 12 |
| Pine | 100,000,000 | 72 × 25 | 19 |
| Oak | 1,000,000,000 | 108 × 31 | 27 |
| Sequoia | 100,000,000,000 | 243 × 56 | 44 |

These are finite ideal timing-search results, **not species unlock levels** or
human success guarantees. A birch near 1,000,000 sats is only 28 px; a larger
sequoia can remain impossible even after upgrades. All models repeat without
real TXIDs, random skill pickups or permanent rewards; current attributes and
equipment apply. See [timing data](jump-progression.json) and
[playability verification](FULLSCREEN_MONTHLY.md).

All roles are available at character creation, then remain permanent until reset.
Training/Strength open after one completed live run, including a zero-metre
attempt. Other stats and features use the `progression` entries' completed runs,
total metres and best single run separately. Unlocks already earned remain.
Flying upgrades become available at 250 cumulative live metres and appear every
30 active game seconds, with up to six skill types per run. Ordinary clothes
are cosmetic; Diamond Hands/Boots and their set are separate gameplay equipment.
Collected coins are game currency, not bitcoin. Training and recorded runs do
not increase permanent coins, seeds, progression or live records.

## Monthly records and future ranked runs

The shared web board lists monthly **best run, total metres and attempt count**.
A confirmed starting skill starts an attempt; cancelling the selection does not.
Finishing at zero metres counts. The server assigns the UTC completion month.
Data is tied to a private browser-installation key, not a verified person or a
unique display name. Another device is a separate identity. Keep that key private.

The monthly board combines builds and roles; it does not normalize Strength,
equipment, different mempool samples or balance changes within that month.

This is a **client-reported community board**, not authoritative anti-cheat.
Server duration limits and duplicate protection do not prove that a run followed
the mempool, collisions or legal upgrades. There is no paid entry, bitcoin
custody or reward payout. The proposed **1000-sat ranked entry is future work**
and needs an independently reviewed server-verification and payment design.

## Rules for LLMs and maintainers

1. Read [AGENTS.md](../AGENTS.md), this document, `JOURNEY_UPDATE.md` and
   `BROWSER_TARGET.md` before changing balance. Current source wins over old
   screenshots, 0.2 descriptions and historical balance proposals.
2. Preserve the first-transaction sequoia possibility. Never implement safe-start
   filtering, amount-based deferral, silent replay or viewport-scaled difficulty.
3. Preserve exact satoshi strings, the 420 **amount** prefix, continuous size
   curves, immutable spawned descriptors and shared Qt/web behavior. Visual RNG
   must not consume transaction/skill RNG. Do not reintroduce manual size tiers.
4. Treat ability changes as mechanics: update both runtimes, relevant tests,
   this reference and `balanceVersion` when mechanical rules change. Cosmetic,
   documentation and responsive-camera changes do not require a balance bump.
5. Preserve save schema 5, owned upgrades/IDs and migrations. Do not reset players
   to make a rebalance easier. Do not rename/delete persistent leaderboard IDs.
6. Do not claim a client-provided score or local save is evidence suitable for
   paid ranked entry. Do not add payments as part of routine balancing.
7. Verify `npm test`, browser/input/mobile/environment/monthly suites as relevant,
   deploy dry-run, and `./bin/build` plus `./bin/test` for shared mechanical changes.
   Label synthetic previews and finite timing results honestly. Report checks
   actually run and environment blockers; do not promise human difficulty from
   geometry alone.

This note makes no gameplay changes. Historical requests that small cannabis
should be the last baseline obstacle were superseded by Wondrej's subsequent
explicit approval of baseline shrubs and ferns. The mempool-first rule was
reaffirmed after that change and remains the highest-priority balance constraint.
