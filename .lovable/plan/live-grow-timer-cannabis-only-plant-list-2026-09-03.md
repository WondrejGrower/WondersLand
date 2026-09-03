# Live grow timer + cannabis-only plant list

Two small, connected passes. No backend, no schema change, no new packages, no change to the Weedoshi/Nostr diary format.

## 1. Live grow timer

Every diary already stores `createdAt` (seconds) and a `phase`, and each entry stores an optional `phaseLabel`. That is enough to derive a timer without storing anything new.

Rules:
- The timer starts at the diary's `createdAt` — the moment the diary was founded.
- It keeps running while the grow is alive.
- It stops when the grow is finished: the diary `phase` (or the newest entry `phaseLabel`) is a harvest/cure/finished phase. The stop time is that entry's timestamp, or `updatedAt` when only the diary phase says so. A stopped timer shows the final duration, labelled as final, not a frozen ticking clock.
- Format: `Day 14 · 06:23:41` for live grows (day count + hh:mm:ss), and `42 days` for finished ones.
- Ticks once per second in DOM UI only. Nothing per-frame, nothing in the 3D render loop.

Where it shows:
- Diary detail header, next to created/updated.
- Diary cards and the "Latest diary" card on the dashboard (compact form: `Day 14`).
- In the 3D world: the plant's interaction prompt gains the day count, e.g. `Northern Lights · Day 14 · Press E to read`. This uses the existing DOM prompt overlay, so no 3D text, no extra draw calls, no change to plant geometry.

Technical shape:
- New pure module `src/progression/timer.ts`: `growTimer(diary)` returning `{ startedAt, endedAt | null, running, days, hms, label }`. Pure, testable, no React.
- New small hook `useNow(1000)` (only mounted where a live timer is displayed) so a single interval drives re-render.
- SSR-safe: first render uses the server-neutral day count, seconds fill in after hydration to avoid a hydration mismatch.

## 2. Cannabis-only plant list (temporary)

Keep the picker UI exactly as it is — the same searchable list of options, same behaviour. Only the content shrinks.

- The category chips row collapses to a single Cannabis state (no All/Vegetables/Herbs/Fruit/Indoor/Other while this restriction is on).
- The list offers:
  - Cannabis ruderalis
  - Cannabis indica dominant
  - Cannabis sativa dominant
  - Cannabis hybrid
  - Cannabis sativa L.
  - Cannabis indica
  - Cannabis sativa
- The free-text field stays, so any plant can still be typed manually and existing non-cannabis diaries keep displaying their stored plant correctly.
- This is a display-side filter in `src/ui/DiaryFields.tsx` plus a small list module, gated by one constant so re-opening the full catalog later is a one-line change. The catalog data itself, the slug encoding and `categorizePlant` stay untouched.

## Verification
- Typecheck, build, existing tests.
- Unit-check the timer helper against: fresh diary, multi-day diary, harvested diary.
- Manual check that a diary card, the reader, and the in-world prompt all show the same day number.
- Docs: `PROJECT_STATE.md`, `CHANGELOG.md`, `ROADMAP.md` entry for this pass.
