# Diary edit shows the old version + manual grow timer

Two fixes in the diary client. No backend, no schema change, no 3D work.

## 1. Renamed diary still shows the old data

What is happening today, from the code:

- When a diary is edited, the app republishes the diary event. Older copies of the
  same diary stay on some relays, exactly like the deleted test diary that keeps
  coming back.
- The reader groups the copies by their raw identifier text and keeps the newest one.
  Two copies written slightly differently (for example an older Weedoshi-style
  identifier vs. the one we write) end up as two separate diaries, so the old name
  can still appear next to the new one.
- If two copies carry the same timestamp second, the reader keeps the first one it
  saw, which can be the old one.
- Editing keeps some old fields (species) untouched, so an old species line can
  survive a rename/plant change.
- The on-device cache is written after each read, so a stale copy can persist.

Fix:

- Group diary copies by the normalised diary id (ignore the identifier spelling), and
  keep the newest; on an equal timestamp prefer the copy with more entries, then the
  later-arriving one.
- When editing, rewrite the descriptive fields together (title, plant, species,
  cultivar, breeder, phase) so nothing stale is carried over.
- Bump the published timestamp to at least one second after the copy being replaced,
  so an edit always wins on every relay.
- Refresh the on-device cache and the open detail view right after an edit so the new
  name shows immediately everywhere (list, detail, dashboard, garden).

Note: relays that ignore replacement/deletion cannot be forced from the client. The
existing relay chips will keep showing which relay is serving an old copy.

## 2. Set the grow timer yourself

- Add a "Grow started" date/time field to the diary form (new diary and edit),
  defaulting to now. Optional "Finished on" field to stop the timer manually.
- The timer uses the chosen start instead of the creation moment; day counting,
  the running clock, and the finished label stay as they are.
- These two values ride along inside the existing diary content as extra optional
  keys, so the Weedoshi format and existing diaries keep working unchanged (older
  diaries simply fall back to their creation time).
- Validation: start cannot be in the future, finish cannot be before start.

## Technical notes

- `src/nostr/diaries.ts`: key `latest` by normalised id, tie-breakers on equal
  `created_at`; parse optional `startedAt` / `endedAt`.
- `src/nostr/writeDiaries.ts`: `applyInput` clears/sets `species` alongside `plant`,
  writes `startedAt` / `endedAt`, and `diaryEventTemplate` uses
  `max(now, previous created_at + 1)`.
- `src/nostr/types.ts`: `startedAt?`, `endedAt?` on `Diary`.
- `src/progression/timer.ts`: prefer `diary.startedAt ?? diary.createdAt` and
  `diary.endedAt ?? derived end`; extend `timer.test.ts`.
- `src/ui/DiaryFields.tsx` + `DiaryComposer.tsx`: date inputs, mobile-friendly.
- `src/state/useNostrStore.ts`: `upsertDiary` already refreshes cache/garden; ensure
  the detail view re-renders from the updated store copy.
