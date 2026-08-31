// 2D diary reader. Pure DOM UI inside the authenticated shell: it reads a diary
// (kind 30078) plus its referenced kind:1 entries and renders them chronologically.
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, EyeOff, ImageOff, KeyRound, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";


import { fetchDiaryEntries, type DiaryEntry } from "../nostr/diaryEntries";
import { firstImage } from "../nostr/media";
import type { Diary } from "../nostr/types";

function dateLabel(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.7rem] uppercase tracking-wide text-cream/55">{label}</p>
      <p className="truncate text-sm text-cream/90">{value}</p>
    </div>
  );
}

export function DiaryDetail({
  diary,
  writable,
  hidden,
  onBack,
  onAddEntry,
  onEdit,
  onHide,
  onUnhide,
  onUnlock,
  onDelete,
}: {
  diary: Diary;
  writable: boolean;
  hidden: boolean;
  onBack: () => void;
  onAddEntry: (diary: Diary) => void;
  onEdit: (diary: Diary) => void;
  onHide: (diary: Diary) => void;
  onUnhide: (diary: Diary) => void;
  onUnlock: (diary: Diary) => void;
  onDelete: (diary: Diary) => Promise<void>;
}) {

  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmHide, setConfirmHide] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);



  useEffect(() => {
    let alive = true;
    setEntries(null);
    setError(null);
    setConfirmHide(false);
    setConfirmDelete(false);
    setDeleteError(null);


    if (diary.items.length === 0) {
      setEntries([]);
      return () => {
        alive = false;
      };
    }
    fetchDiaryEntries(diary)
      .then((result) => {
        if (alive) setEntries(result);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setEntries([]);
        setError(err instanceof Error ? err.message : "Could not read the entries");
      });
    return () => {
      alive = false;
    };
  }, [diary]);

  const cover = diary.coverImage ?? diary.items.map(firstImage).find(Boolean);
  const meta: { label: string; value: string }[] = [];
  if (diary.plant ?? diary.species) meta.push({ label: "Plant", value: (diary.plant ?? diary.species)! });
  if (diary.cultivar) meta.push({ label: "Cultivar", value: diary.cultivar });
  if (diary.breeder) meta.push({ label: "Breeder", value: diary.breeder });
  if (diary.phase) meta.push({ label: "Phase", value: diary.phase });

  return (
    <section className="mx-auto grid w-full min-w-0 max-w-3xl gap-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-forest-soft/60 px-4 py-2 text-sm text-cream/85"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to diaries
      </button>

      <article className="min-w-0 overflow-hidden rounded-2xl border border-forest-soft/50 bg-forest/60">
        <div className="aspect-[16/9] w-full bg-forest-deep/70">
          {cover ? (
            <img
              src={cover}
              alt={`Cover photo of ${diary.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center gap-2 text-xs text-cream/55">
              <ImageOff className="h-5 w-5" aria-hidden />
              No photo in this diary yet
            </div>
          )}
        </div>

        <div className="grid min-w-0 gap-4 p-4 sm:p-6">
          <div className="grid gap-1">
            <h2
              className="text-2xl font-semibold leading-tight text-cream sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {diary.title}
            </h2>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cream/60">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              created {dateLabel(diary.createdAt)} · updated {dateLabel(diary.updatedAt)} ·{" "}
              {diary.items.length} {diary.items.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          {meta.length > 0 ? (
            <div className="grid min-w-0 grid-cols-2 gap-3 rounded-xl border border-forest-soft/40 bg-forest-deep/40 p-3 sm:grid-cols-4">
              {meta.map((item) => (
                <Meta key={item.label} {...item} />
              ))}
            </div>
          ) : null}

          {writable ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAddEntry(diary)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-5 py-2.5 text-sm font-semibold text-forest-deep"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add entry
              </button>
              <button
                type="button"
                onClick={() => onEdit(diary)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-soft/60 px-4 py-2.5 text-sm text-cream/85"
              >
                <Pencil className="h-4 w-4" aria-hidden /> Edit diary
              </button>
            </div>
          ) : (
            <div className="grid min-w-0 gap-2 rounded-xl border border-leaf/25 bg-leaf/5 p-3">
              <p className="text-xs text-cream/80">
                This session is read-only. Unlock publishing to add an entry — your key stays in
                this tab only.
              </p>
              <button
                type="button"
                onClick={() => onUnlock(diary)}
                className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-leaf/50 px-4 py-2.5 text-sm font-semibold text-leaf"
              >
                <KeyRound className="h-4 w-4" aria-hidden /> Unlock publishing
              </button>
            </div>
          )}


          <div className="min-w-0 border-t border-forest-soft/40 pt-4">
            {hidden ? (
              <div className="grid min-w-0 gap-2">
                <p className="text-xs text-cream/70">
                  This diary is hidden in WondersLand on this device. It is still on your relays.
                </p>
                <button
                  type="button"
                  onClick={() => onUnhide(diary)}
                  className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-leaf/40 px-4 py-2.5 text-sm font-medium text-leaf"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden /> Restore diary
                </button>
              </div>
            ) : confirmHide ? (
              <div className="grid min-w-0 gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
                <p className="text-xs leading-relaxed text-cream/85">
                  Hide “{diary.title}”? It is only hidden in WondersLand on this device and browser.
                  Nothing is deleted from Nostr — the diary and its entries stay on your relays and
                  you can restore it any time from Hidden diaries.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onHide(diary)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/50 px-4 py-2.5 text-sm font-medium text-amber-300"
                  >
                    <EyeOff className="h-4 w-4" aria-hidden /> Yes, hide it
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmHide(false)}
                    className="inline-flex min-h-11 items-center rounded-xl border border-forest-soft/60 px-4 py-2.5 text-sm text-cream/85"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmHide(true)}
                className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-cream/65 hover:text-cream"
              >
                <EyeOff className="h-4 w-4" aria-hidden /> Hide diary
              </button>
            )}
          </div>

          {writable ? (
            <div className="min-w-0 border-t border-forest-soft/40 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
                className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-red-300/75 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Delete diary
              </button>
              {deleteError ? <p className="mt-2 text-xs text-amber-300">{deleteError}</p> : null}
            </div>
          ) : null}

        </div>
      </article>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-forest-deep/80 p-4 backdrop-blur-sm sm:place-items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-diary-title"
            className="w-full max-w-md rounded-2xl border border-red-400/30 bg-forest p-5 shadow-2xl"
          >
            <h3
              id="delete-diary-title"
              className="text-lg font-semibold text-cream"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Delete “{diary.title}” permanently?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-cream/80">
              This permanently removes the diary and its {diary.items.length}{" "}
              {diary.items.length === 1 ? "entry" : "entries"} from WondersLand and asks your relays
              to delete them for good. This cannot be undone. If you only want it out of sight, use
              Hide diary instead.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleting(true);
                  setDeleteError(null);
                  void onDelete(diary)
                    .catch((err: unknown) => {
                      setDeleteError(err instanceof Error ? err.message : "Could not delete the diary");
                      setConfirmDelete(false);
                    })
                    .finally(() => setDeleting(false));
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-forest-soft/60 px-5 py-2.5 text-sm text-cream/85"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}


      <div className="grid min-w-0 gap-3">
        <h3 className="text-sm font-semibold text-cream/80">Timeline</h3>

        {entries === null ? (
          <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-5 text-sm text-cream/75">
            Reading entries from the relays…
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-5 text-sm text-cream/75">
            This diary has no entries yet. {writable
              ? "Add the first one whenever you like — a single line is enough."
              : "Nothing has been published to it so far."}
          </p>
        ) : (
          <ol className="grid min-w-0 gap-3">
            {entries.map((entry) => (
              <li
                key={entry.eventId}
                className="min-w-0 overflow-hidden rounded-2xl border border-forest-soft/50 bg-forest/60 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-cream/65">{dateLabel(entry.createdAt)}</p>
                  {entry.phaseLabel ? (
                    <span className="rounded-full bg-leaf/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-leaf">
                      {entry.phaseLabel}
                    </span>
                  ) : null}
                </div>
                {entry.text ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-cream/90">
                    {entry.text}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-cream/55">
                    {entry.missing ? "This note could not be read from the relays." : "No text in this entry."}
                  </p>
                )}
                {entry.images.length > 0 ? (
                  <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                    {entry.images.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt=""
                        loading="lazy"
                        className="h-44 w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        {error ? <p className="text-xs text-amber-300">{error}</p> : null}
      </div>
    </section>
  );
}
