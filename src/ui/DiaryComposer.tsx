// Create-diary / add-entry composer. Pure DOM UI: it only calls the Nostr
// write path and hands the resulting diary back to the store.
import { useState } from "react";
import { getSigner } from "../nostr/signers";
import { addEntry, createDiary, updateDiary, type DiaryInput } from "../nostr/writeDiaries";
import { useNostrStore } from "../state/useNostrStore";
import type { Diary } from "../nostr/types";

type Mode = { kind: "create" } | { kind: "entry"; diary: Diary } | { kind: "edit"; diary: Diary };

const field =
  "w-full min-w-0 min-h-11 rounded-xl border border-forest-soft/60 bg-forest-deep/60 px-3 py-2.5 text-base text-cream placeholder:text-cream/40 outline-none focus:border-leaf/70 sm:text-sm";

const label = "text-[0.7rem] uppercase tracking-wide text-cream/55";

export function DiaryComposer({
  mode,
  onClose,
  onPublished,
}: {
  mode: Mode;
  onClose: () => void;
  /** Fired only after at least one relay accepted the event. */
  onPublished?: (diary: Diary, kind: Mode["kind"]) => void;
}) {
  const method = useNostrStore((s) => s.method);
  const upsertDiary = useNostrStore((s) => s.upsertDiary);
  const existing = mode.kind === "create" ? null : mode.diary;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [plant, setPlant] = useState(existing?.plant ?? "");
  const [cultivar, setCultivar] = useState(existing?.cultivar ?? "");
  const [breeder, setBreeder] = useState(existing?.breeder ?? "");
  const [phase, setPhase] = useState(existing?.phase ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEntry = mode.kind === "entry";
  const heading =
    mode.kind === "create" ? "New diary" : isEntry ? `Add entry — ${existing?.title}` : "Edit diary";

  async function submit() {
    const signer = getSigner(method);
    if (!signer) {
      setError("This session is read-only. Unlock publishing to sign this event.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input: DiaryInput = { title, plant, cultivar, breeder, phase };
      const result = isEntry && existing
        ? await addEntry(signer, existing, { text, phaseLabel: phase })
        : existing
          ? await updateDiary(signer, existing, input)
          : await createDiary(signer, input);
      upsertDiary(result.diary);
      // Draft state is intentionally left untouched on failure so a relay
      // problem never costs the user their text.
      onPublished?.(result.diary, mode.kind);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Publishing failed — your draft is still here, try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-forest-deep/80 p-3 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="max-h-[90dvh] w-full min-w-0 max-w-lg overflow-y-auto rounded-2xl border border-forest-soft/60 bg-forest p-4 text-cream shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm text-cream/60 hover:text-cream"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid min-w-0 gap-3.5">
          {isEntry ? (
            <>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="entry-text" className={label}>
                  Entry
                </label>
                <textarea
                  id="entry-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="What happened in the garden today?"
                  className={field}
                />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="entry-phase" className={label}>
                  Phase (optional)
                </label>
                <input
                  id="entry-phase"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  placeholder="seedling, veg, flower, harvest…"
                  className={field}
                />
              </div>
              <p className="text-[0.7rem] text-cream/55">Photos are coming soon.</p>
            </>
          ) : (
            <>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="diary-title" className={label}>
                  Title
                </label>
                <input
                  id="diary-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My first grow"
                  className={field}
                />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="diary-plant" className={label}>
                  Plant or species
                </label>
                <input
                  id="diary-plant"
                  value={plant}
                  onChange={(e) => setPlant(e.target.value)}
                  placeholder="Cannabis sativa L."
                  className={field}
                />
              </div>
              <div className="grid min-w-0 gap-3.5 sm:grid-cols-2">
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="diary-cultivar" className={label}>
                    Cultivar
                  </label>
                  <input
                    id="diary-cultivar"
                    value={cultivar}
                    onChange={(e) => setCultivar(e.target.value)}
                    placeholder="Optional"
                    className={field}
                  />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <label htmlFor="diary-breeder" className={label}>
                    Breeder
                  </label>
                  <input
                    id="diary-breeder"
                    value={breeder}
                    onChange={(e) => setBreeder(e.target.value)}
                    placeholder="Optional"
                    className={field}
                  />
                </div>
              </div>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="diary-phase" className={label}>
                  Phase
                </label>
                <input
                  id="diary-phase"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  placeholder="seedling, veg, flower…"
                  className={field}
                />
              </div>
            </>
          )}

          {error ? (
            <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5 text-xs text-amber-300">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 py-2.5 text-sm text-cream/70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || (isEntry ? !text.trim() : !title.trim())}
              className="min-h-11 rounded-xl bg-leaf px-5 py-2.5 text-sm font-semibold text-forest-deep disabled:opacity-50"
            >
              {busy ? "Publishing…" : isEntry ? "Publish entry" : existing ? "Save diary" : "Create diary"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Mode as ComposerMode };
