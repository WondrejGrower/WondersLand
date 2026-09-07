// Inline grow-timer editor. Lets the grower set the start (and optional finish)
// of the clock directly from the diary reader. It republishes the same
// addressable diary event — no schema change, no new fields on the wire beyond
// the optional startedAt/endedAt already supported.
import { useState } from "react";
import { Timer, X } from "lucide-react";
import { getSigner } from "../nostr/signers";
import { updateDiary } from "../nostr/writeDiaries";
import { useNostrStore } from "../state/useNostrStore";
import type { Diary } from "../nostr/types";

function toLocalInput(seconds: number): string {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

const field =
  "min-h-11 w-full rounded-xl border border-forest-soft/60 bg-forest-deep/50 px-3 py-2 text-sm text-cream outline-none focus:border-leaf";
const label = "text-[0.7rem] uppercase tracking-wide text-cream/55";

export function TimerEditor({ diary }: { diary: Diary }) {
  const method = useNostrStore((s) => s.method);
  const upsertDiary = useNostrStore((s) => s.upsertDiary);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(toLocalInput(diary.startedAt ?? diary.createdAt));
  const [end, setEnd] = useState(diary.endedAt ? toLocalInput(diary.endedAt) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const signer = getSigner(method);
    if (!signer) {
      setError("This session is read-only. Unlock publishing to save the timer.");
      return;
    }
    const startedAt = fromLocalInput(start);
    const endedAt = fromLocalInput(end);
    if (!startedAt) {
      setError("Pick when the grow started.");
      return;
    }
    if (startedAt > Math.floor(Date.now() / 1000) + 60) {
      setError("The grow cannot start in the future.");
      return;
    }
    if (endedAt && endedAt < startedAt) {
      setError("The finish cannot be before the start.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await updateDiary(signer, diary, {
        title: diary.title,
        plant: diary.plant ?? "",
        cultivar: diary.cultivar ?? "",
        breeder: diary.breeder ?? "",
        phase: diary.phase ?? "",
        coverImage: diary.coverImage ?? "",
        startedAt,
        endedAt: endedAt ?? 0,
      });
      upsertDiary(result.diary);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving the timer failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-forest-soft/60 px-2.5 py-1 text-xs text-cream/75 hover:text-cream"
      >
        <Timer className="h-3.5 w-3.5" aria-hidden /> Adjust timer
      </button>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border border-forest-soft/50 bg-forest-deep/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-cream">Grow timer</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close timer editor"
          className="grid h-8 w-8 place-items-center rounded-full text-cream/60 hover:text-cream"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className={label}>Grow started</span>
          <input
            type="datetime-local"
            className={field}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className={label}>Finished on (optional)</span>
          <input
            type="datetime-local"
            className={field}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      {error ? <p className="text-xs text-clay">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-5 py-2.5 text-sm font-semibold text-forest-deep disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save timer"}
        </button>
        {diary.endedAt ? (
          <button
            type="button"
            onClick={() => setEnd("")}
            className="inline-flex min-h-11 items-center rounded-xl border border-forest-soft/60 px-4 py-2.5 text-sm text-cream/85"
          >
            Restart the clock
          </button>
        ) : null}
      </div>
    </div>
  );
}
