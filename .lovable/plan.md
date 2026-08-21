# WondersLand — Nostr grow-diary client with a game-like 3D garden

Direction plan only. No code changes in this pass.

## 1. Product states

**Signed out** — the current marketing landing stays exactly as it is: same
hero, same copy, same SEO head, same visual identity. Only entry points are
"Enter the demo garden" (read-only walkthrough) and Nostr sign-in.

**Signed in** — `/` renders an app-style Home/Dashboard instead of marketing.
Same route, different tree, chosen by `useNostrStore().pubkey`. The 3D world
stops being "the app" and becomes one destination inside a client shell.

Write capability is a third axis: `nip07` / `nsec` sessions can publish, `npub`
sessions are read-only and every write affordance is hidden (not disabled-only).

## 2. Authenticated information architecture

Target routes (introduced gradually, see phases):

```text
/            signed-out marketing  |  signed-in Home dashboard
/garden      the 3D world (replaces the boolean `entered`)
/diaries     list + filter of the user's diaries
/diary/:id   single diary: entries timeline, add-entry action
/new         create diary (modal-capable route)
/explore     Growmies / other pubkeys           (later)
/profile     identity, relays, GardenConfig, session   (later)
```

Migration rule: `entered` keeps working until `/garden` exists; when it lands,
`enter()` becomes `navigate({to:'/garden'})` and the store flag is deleted in the
same commit. The 3D world stays lazy + client-only in every step.

## 3. Home dashboard hierarchy

1. **Hero action** — large `▶ Enter My Garden` card with the garden stage name
   and a thin growth bar (`Living Garden · 12 of 20 to Ecosystem`).
2. **Today in your Garden** — at most three calm, factual cards: "3 diaries not
   updated in 14 days", "Bloom started 2 days ago", "New badge available".
   No streaks, no countdowns, no red urgency, dismissible.
3. **Your diaries** — responsive grid of diary cards built purely from existing
   `Diary` fields: cover image, title, plant/cultivar, phase chip, entry count,
   relative last-update. Card → `/diary/:id`; secondary "Update" jumps straight
   to the add-entry composer.
4. **Quick actions** — New diary, Add entry, Discovery Book, Badges.
5. **Garden status** — zone occupancy (indoor / beds / orchard / open), relay
   sync state, GardenConfig save state (existing `SaveGarden` control folded in).

Empty state repeats the onboarding promise and offers "Create your first diary".

## 4. Diary write path (Weedoshi compatible)

Non-negotiable: WondersLand must not invent a format. Both apps keep reading the
same events.

- Diary = addressable kind `30078`, `d` = `diary-<id>`, tag `t: weedoshi-diary`,
  plus the existing optional `plant` / `species` / `cultivar` / `breeder` /
  `title` tags. Content = the JSON object `src/nostr/diaries.ts` already parses
  (`title`, `plant`, `plantSlug`, `phase`, `coverImage`, `createdAt`,
  `updatedAt`, `items[]`).
- Entry = kind `1` note published first; the diary event is then re-published
  with the note appended to `items[]` **and** as an `e` tag. The referenced-note
  model is preserved; entry text never moves inside the diary event.
- New module `src/nostr/writeDiaries.ts`: `createDiary`, `updateDiary`,
  `addEntry`. It builds unsigned events, delegates to the existing signer
  abstraction (`nip07` | in-memory `nsec`), publishes to all enabled relays and
  merges the optimistic result into `useNostrStore`.
- Compatibility guard: a round-trip test that feeds every event produced by the
  writer back through `parseDiary` and asserts field-for-field equality. Any tag
  or content key Weedoshi may read is written even when WondersLand ignores it.
- Conflict rule: read-modify-write on the latest known diary event using NIP-01
  addressable ordering (highest `created_at`, then lowest `id`) — same rule
  already used for GardenConfig.
- Media: entries accept image URLs pasted/typed now. A single
  `uploadMedia(file): Promise<string>` seam is declared and stubbed so Blossom
  can be dropped in later without touching the composer.
- NIP-46 remote signing is designed for (signer interface stays async and
  fallible) but not implemented.

## 5. Derived Garden Growth

`src/progression/**` — pure TypeScript, no React, no Three, no network:
`computeProgress(diaries: Diary[]): GardenProgress`. Deterministic, recomputed
on every diary load; nothing is stored in GardenConfig.

Stages: Seed → Sprout → Seedling → Young Garden → Living Garden → Ecosystem.

Signals (each individually capped so no single behaviour dominates):
- distinct species/plants documented,
- diary entries counted **per distinct calendar day per diary** (this is the
  main anti-spam rule — ten notes in one hour count once),
- completed/harvested grows (phase reaching harvest/cure),
- category diversity (indoor / vegetable / herb / fruit / other),
- diary longevity: days between first and last entry,
- milestones discovered.

Anti-spam principles: per-day dedupe, per-diary caps, ignore empty notes,
require a real time span for longevity credit, never reward raw event volume,
never punish inactivity (the score can plateau, it never decays).

## 6. Discovery Book, badges, unlocks

- **Discovery Book** — derived catalogue of every species the user documented,
  cross-referenced with `src/nostr/plants/catalog.ts`; undiscovered entries show
  as silhouettes. Educational text lives in static typed data, not in state.
- **Badges** — pure predicates over `Diary[]`: First Sprout, Indoor Gardener,
  First Harvest, Seed Saver, Six Species, Full Season. Rendered in 2D first; a
  physical garden board in the 3D world comes later.
- **Unlocks** — a stage or badge makes a decor asset *available*; whether and
  where it is placed is GardenConfig (physical layout). Availability is always
  derived, placement is always signed config. This boundary must never blur.

## 7. Diary data → 3D world

| Source | Zone | Visual reaction |
| --- | --- | --- |
| category `indoor` | cottage | already the Indoor Garden hub |
| `vegetable` / `herb` | raised beds | bed fills as diaries are added |
| `fruit` | orchard | tree per diary, canopy scales with entries |
| `other` outdoor | open garden | scattered plants |
| stage germination/seedling | greenhouse | overrides zone until it vegetates |

Per-plant visuals read the diary's growth stage: height, foliage density and
bloom accents step with phase; harvested diaries keep a small marker rather than
disappearing. The central **Garden Tree** is scaled directly from the derived
stage — one mesh, no new draw calls. All of this is prop-driven from data
already in the store; `src/world/**` still performs zero network work.

## 8. First-spawn onboarding

Canonical copy, verbatim:

```text
Welcome to your garden 🌱
Everything here grows from what you do.
Growing your own food is one of the first steps toward true sovereignty.
Let’s learn together!
```

Flow: welcome card → "walk to the cottage" hint → opening Indoor Garden
completes step two → one card naming the zones → "Explore freely". Four steps,
plain DOM overlay, no quest engine, skippable at any point. Completion stored
locally as `wl:onboarding:<pubkey>`; never published to Nostr. A "Replay
tutorial" item lives in Profile later.

## 9. Data ownership boundaries

- **Nostr (30078 diaries + kind 1 notes)** — the single source of truth for all
  diary content. Never duplicated into any other store.
- **GardenConfig (NIP-78, `d: wondersland:garden-config`)** — physical layout,
  placement and chosen decor only. No diary text, no progression numbers.
- **Derived (memory)** — progression, badges, Discovery Book, zone assignment.
  Recomputed, never persisted, never signed.
- **Local only (IndexedDB/localStorage)** — draft diaries and entries, cached
  relay reads, onboarding flags, UI preferences.
- **Blossom (later)** — binary media only, referenced by URL from notes.
- **No backend, no database.**

## 10. Migration phases

Each phase ships independently and leaves the live site working.

- **P1 — Signed-in Home shell.** `/` branches on session; dashboard with hero
  Play, diary cards, quick actions. `entered` untouched. Marketing unchanged.
- **P2 — Write path.** `writeDiaries.ts` + create-diary and add-entry composers,
  plus the Weedoshi round-trip test. Closes the real functional gap.
- **P3 — Routes.** `/garden`, `/diaries`, `/diary/:id`; retire `entered`.
- **P4 — Progression.** `src/progression/**`, growth bar, Garden Tree scaling.
- **P5 — Discovery Book + badges.**
- **P6 — Onboarding flow.**
- **P7 — Zone/visual reactions per phase; unlockable decor.**
- **Later** — Explore/Growmies, Visit Friend, Blossom, NIP-46.

## 11. Where to build what

Lovable next: **P1**, then **P2** — both are self-contained UI + one new nostr
module, exactly the shape this environment handles well.

Move to Codex/GitHub: P3 (route surgery touching every entry point), P4/P5
(pure logic with heavy unit-test needs), and any Weedoshi cross-repo schema
verification, which needs both repos side by side.

## 12. Risks and verification

- *Write-path incompatibility* — highest risk. Verified by the round-trip test
  plus one manual publish read back in Weedoshi before P2 is called done.
- *Relay write failure / partial publish* — surface per-relay results; treat one
  success as success, keep the local draft until at least one relay accepts.
- *Signer prompt spam* — batching: one note + one diary update per entry, never
  more.
- *Progression drift* — golden-fixture tests: fixed `Diary[]` → fixed stage.
- *Landing regression* — signed-out `/` must keep byte-identical head metadata
  and layout; snapshot before P1.
- *Performance* — the Garden Tree and zone visuals must not raise draw calls
  meaningfully; measure before/after on a mid-range profile.
- *Read-only accounts* — every write affordance hidden for `npub` sessions.
