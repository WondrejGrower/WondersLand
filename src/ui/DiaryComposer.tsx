// Create-diary / add-entry composer. Pure DOM UI: it only calls the Nostr
// write path and hands the resulting diary back to the store.
import { useState } from "react";
import { getSigner } from "../nostr/signers";
import { addEntry, createDiary, updateDiary, type DiaryInput } from "../nostr/writeDiaries";
import { useNostrStore } from "../state/useNostrStore";
import type { Diary } from "../nostr/types";

type Mode = { kind: "create" } | { kind: "entry"; diary: Diary } | { kind: "edit"; diary: Diary };

const field =
  "w-full rounded-xl border border-forest-soft/60 bg-forest-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream/35 outline-none focus:border-leaf/70";

export function DiaryComposer({ mode, onClose }: { mode: Mode; onClose: () => void }) {
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
      setError("This session is read-only. Sign in with an extension or nsec to publish.");
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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-forest-deep/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-forest-soft/60 bg-forest p-5 text-cream shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="rounded-full px-2 py-1 text-sm text-cream/60 hover:text-cream"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {isEntry ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="What happened in the garden? Paste image URLs to attach photos."
                className={field}
              />
              <input
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
                placeholder="Phase (seedling, veg, flower, harvest…)"
                className={field}
              />
            </>
          ) : (
            <>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Diary title" className={field} />
              <input value={plant} onChange={(e) => setPlant(e.target.value)} placeholder="Plant or species" className={field} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={cultivar} onChange={(e) => setCultivar(e.target.value)} placeholder="Cultivar" className={field} />
                <input value={breeder} onChange={(e) => setBreeder(e.target.value)} placeholder="Breeder" className={field} />
              </div>
              <input value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="Phase" className={field} />
            </>
          )}

          {error ? <p className="text-xs text-amber-300">{error}</p> : null}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-cream/70">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || (isEntry ? !text.trim() : !title.trim())}
              className="rounded-full bg-leaf px-5 py-2 text-sm font-semibold text-forest-deep disabled:opacity-50"
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
