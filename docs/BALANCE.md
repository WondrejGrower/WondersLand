# How WondersLand balance works

Current rules: **`wl-0.3-journey-12`**, application 0.3.3. Journey-8 strengthens Double Jump
and shortens its cooldown, as introduced in Journey-8. Journey-9 adds the personal Block Mine. Historical briefs and earlier playtest requests may
describe older rules.
The executable source of values is [src/balance.json](../src/balance.json).
This document describes the implementation, not a promise of calibrated playtime.
Security update: verified server progression and historical community records
are now separate; see the monthly-record section below.

## Pro české hráče

- Les vzniká ze skutečných nedávných transakcí. **I úplně první překážka může
  být nepřekonatelná sekvoje.** Hra nezajišťuje bezpečnou cestu a nevybírá
  menší transakce podle síly postavy.
- Základní skok je proti journey-6 přibližně o 50 % vyšší a pohodlněji zvládá
  běžné keře a kapradiny. Větší stromy vyžadují
  postupné vylepšování a na sekvoje je potřeba vzdušná schopnost. Druh sám nezaručuje konkrétní velikost. Malé konopí
  lze přeskočit, velké konopí může být nepřekonatelné.
- Při startu volíš Basic Jump (+15 % základní výšky), Time Slow nebo Double
  Jump (další skok jednou za 4 sekundy aktivní hry). S vyšší Silou skok
  **podrž**, abys využil její přínos; krátké klepnutí jej zkracuje.
- Částka je součet výstupů transakce, ne poplatek ani čistá platba. Prefix
  `420` v částce mění vzhled na konopí, nikdy mechanickou velikost.
- Trénink používá označené modely a tvé vybavení/staty; nedává trvalé odměny
  a nepatří do žebříčku. Nové ověřené běhy mají oddělený serverový postup od nuly; původní
  komunitní výsledky zůstávají jako neověřená historie. Vstupné 1000 sats neexistuje.

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
Browser, installed PWA and verified server use the same JavaScript simulation.
Separate runs can receive different real transaction samples.

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

The unmodified Gardener launch is 140 px/s; ascent gravity is 210 px/s², descent
gravity 280 px/s². Its continuous ideal peak is about **46.67 px**. Explorer and
Collector have a −5% height bonus (about 44.33 px). Clearing a plant needs enough
height **through its full collision width**, not just an apex above its top.
Simulation steps, speed and launch timing matter.

Journey-7 raises baseline height by about 50% while slightly shortening the
ideal complete hop (about 1.24 s instead of 1.30 s). The higher launch and firmer
descent avoid adding float time. Short taps retain the full baseline impulse.
The browser/PWA sprite progressively extends its legs through descent, and
landing has a shallow, foot-anchored 0.16 s compression rather than an abrupt
whole-body crouch. Visual deformation never moves the collision body.
See [playtest change and verification](JUMP_FEEL.md).

Each live run starts with a rank-one choice, subject to an explicitly excluded
skill:

| Choice | Effect |
| --- | --- |
| Basic Jump (`leap`) | +15%, +30%, +45% height bonus at ranks 1–3 |
| Time Slow (`timeslow`) | Whole-expedition slowdown 15%, 20%, 25% at ranks 1–3 |
| Double Jump (`double`) | One aerial jump per takeoff, recharging every 4 active game seconds; impulse fractions 0.90, 0.95, 1 at ranks 1–3 |

Basic Jump bonuses are **additive to the height bonus**, not to velocity and not
multipliers of an already upgraded Strength height. For example, a fresh
Gardener with the rank-one skill has an ideal peak of about 53.67 px.
Time Slow slows jumps and obstacles together; it improves real-time reaction
room without making plants smaller or awarding metres while paused.

Holding jump preserves the Strength-enhanced launch. Releasing caps upward
velocity to `140 × sqrt(max(0, 1 + role + leap + boots))`, deliberately excluding
Strength. An instant tap retains the baseline jump; later upgrades need holding.
The input buffer is fixed at 0.1 s; Agility does not enlarge it.

The ordinary jump limit is 195 px. The run sprite is 20 world pixels high,
and the camp sprite is 24. Both share the original feet anchor used for
obstacle clearance. The smallest sequoia is 243 px tall.

Double Jump still scales with permanent jump height. Ranks I–III have
ceilings of 220, 235 and 290 px respectively. Rank III gains up to 0.18
on top of the 1.5× aerial factor as Strength rises, so a strong build can
clear the 243 px practice sequoia with a well-timed second jump. Landing
resets the once-per-takeoff flag. The four-second cooldown runs only in
active game time. Explorer has one emergency aerial jump per run.

Jetpack has its own ceiling of the lesser of 425 px and 2.5× permanent
jump height. Its three seconds of fuel are shared across the whole run.
A well-timed flight can clear a 365 px sequoia. At most two rescues can be
granted per run. One broad tree cannot consume repeatedly granted rescues.

## Permanent development and practice

Through level 20, Strength adds `5.7 × (L/50)²` to the height bonus. Beyond
that, a quadratic taper continues from the same value and slope, reaching a
bonus of 2.65 at level 50. A level-50 Gardener's ideal ordinary peak with no
equipment or temporary skill is about 170.33 px. All five stat branches cost
`ceil(50 × 1.12^L)` for the next level and stop at level 50. Purchased levels
are carried forward. Agility slows expedition simulation by up to 2%, while
Magnetism adds up to 50% collection range. Luck shifts offer rarity weights
and Yield adds up to 25% coin bonus. Research runs in real time.

Synthetic timing references, Gardener, no equipment/run skills, initial speed:

| Practice fixture | Satoshi | Height × width | First Strength level found |
| --- | ---: | ---: | ---: |
| Flower | 50,000 | 10 × 14 | 0 |
| Tulip | 250,000 | 17 × 15 | 0 |
| Blackberry shrub | 600,000 | 23 × 16 | 0 |
| Fern | 900,000 | 27 × 17 | 0 |
| Small cannabis | 420,000 | 20 × 16 | 0 |
| Birch | 10,000,000 | 48 × 21 | 2 |
| Pine | 100,000,000 | 72 × 25 | 16 |
| Oak | 1,000,000,000 | 108 × 31 | 25 |
| Sequoia | 100,000,000,000 | 243 × 56 | Aerial skill required |

These are finite ideal timing-search results, **not species unlock levels** or
human success guarantees. A birch near 1,000,000 sats is only 28 px; a larger
sequoia can remain impossible even after upgrades. All models repeat without
real TXIDs, random skill pickups or permanent rewards; current attributes and
equipment apply. See [timing data](jump-progression.json) and
[playability verification](FULLSCREEN_MONTHLY.md).

All roles are available at character creation and stay fixed until reset.
Each completed live run unlocks at most one eligible feature in configuration
order. The first live run opens the Training Grounds and makes Strength,
Agility, Magnetism, Luck and Yield available to buy at once. The camp shows one
discovery notice. Further eligible features follow on subsequent live runs.
Existing characters with Training Grounds gain access to all five attributes
when loaded. Purchased levels, previously unlocked features and clothing remain
available.

Every 1,000 metres in a live expedition, game time pauses for a choice of up to
three skills. After Flying upgrades unlock, Luck gives a chance every 30 active
seconds to find a spinning Bitcoin Spark. The chance is 0–10% based on Luck.
Collecting it adds 30 percentage points to the value of picked-up coins for the
current expedition, within the normal economy cap. The Skill Book at Hearth &
home lists skills collected in completed live runs and describes each rank.

New characters start in base linen with an empty clothing inventory. A live run
rolls for one clothing reward at 30 m, then every 150 m until it finds one.
The chance is 45% before owning something for all six slots and 4% afterward.
Among successful rolls the rare tier is 0.1% and the legendary tier 0.01%.
Each roll only draws from unowned items of its rolled tier. Clothing is
cosmetic. Diamond equipment keeps its separate gameplay effects.
Training and recorded runs do not grant persistent coins, clothes or discoveries.

Registered ranked characters may opt into the character directory. Visitors
see the published character's clothing inventory, equipped pieces and unlocked
camp stations. A visit is a read-only camp preview and never awards progress.

## Block Mine

A personal camp station offers ten sequentially purchased miners. The first
costs 100 coins and is activated on purchase. Later purchases add an owned
miner; select which one works. Only one produces coins, at the active tier's
hourly rate, including while the application is closed. The chest holds eight
hours of that tier's output. Switching to a lower tier preserves coins already
earned. Collecting transfers whole coins to the personal wallet and preserves
fractional progress. The mine is unavailable in recorded and verified play.
Prices and hourly rates are defined in [balance.json](../src/balance.json).

## Monthly records and future ranked runs

The browser has two explicitly separate histories. **Verified runs** use a new
server profile starting at zero coins/upgrades. Server purchases and research
use the same balance values. Your personal local character and upgrades remain
unchanged and cannot be imported into server progression. Normal personal,
training, recorded and admin-test runs do not publish verified scores.

The server owns the mempool sample, seed, legal profile, input simulation,
collisions and resulting metres/rewards. The client sends bounded sequenced
controls, never a score. First-transaction sequoias, deduplication, replenishment,
waits and frozen obstacle dimensions remain. Both personal and verified browser/PWA runs use 120 fixed simulation steps
per second. Settings chooses a 60/144 FPS rendering cap; visual interpolation
does not alter simulation, collisions, cooldowns, rewards or transaction sizes.

The shared board lists monthly **best run, total metres and attempts**, segmented
by balance version for verified records. The server assigns UTC completion month.
A selected starting skill starts an attempt, including a zero-metre completion.
Interrupted runs settle from their last confirmed state rather than replaying
an unconfirmed tail. Historical community results are retained separately,
clearly unverified, and their raw-score submission endpoints are closed.

Public IDs distinguish pseudonymous server profiles and old browser installations.
Names do not establish a verified human identity. Ownership uses the private
browser key; profile export does not export that credential. Clearing/isolating
browser storage may therefore create a different identity.

**Server-verified means simulated inputs**, not proof of a human, bot protection
or paid-ranked readiness. Builds/roles can still differ within the current
ruleset and each run sees its own real mempool sample. There is no paid entry,
bitcoin custody or payout. The proposed **1000-sat entry remains future work**.
See [security fixes and protocol boundaries](SECURITY_HARDENING.md).

## Rules for LLMs and maintainers

1. Read [AGENTS.md](../AGENTS.md), this document, `JOURNEY_UPDATE.md` and
   `BROWSER_TARGET.md` before changing balance. Current source wins over old
   screenshots, 0.2 descriptions and historical balance proposals.
2. Preserve the first-transaction sequoia possibility. Never implement safe-start
   filtering, amount-based deferral, silent replay or viewport-scaled difficulty.
3. Preserve exact satoshi strings, the 420 **amount** prefix, continuous size
   curves, immutable spawned descriptors and one client/server simulation. Visual RNG
   must not consume transaction/skill RNG. Do not reintroduce manual size tiers.
4. Treat ability changes as mechanics: update the shared simulation, relevant tests,
   this reference and `balanceVersion` when mechanical rules change. Cosmetic,
   documentation and responsive-camera changes do not require a balance bump.
5. Preserve save schema 5, owned upgrades/IDs and migrations. Do not reset players
   to make a rebalance easier. Do not rename/delete persistent leaderboard IDs.
6. Do not claim a client-provided score or local save is evidence suitable for
   paid ranked entry. Do not add payments as part of routine balancing.
7. Verify `npm test`, browser/input/mobile/environment/monthly suites as relevant,
   timing/PWA suites and deploy dry-run for changes affecting mechanics or delivery.
   Label synthetic previews and finite timing results honestly. Report checks
   actually run and environment blockers; do not promise human difficulty from
   geometry alone.

This note makes no gameplay changes. Historical requests that small cannabis
should be the last baseline obstacle were superseded by Wondrej's subsequent
explicit approval of baseline shrubs and ferns. The mempool-first rule was
reaffirmed after that change and remains the highest-priority balance constraint.
