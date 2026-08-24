// Create-diary / add-entry composer. Pure DOM UI: it only calls the Nostr
// write path and hands the resulting diary back to the store.
import { useMemo, useState } from "react";
import { getSigner } from "../nostr/signers";
import { addEntry, createDiary, updateDiary, type DiaryInput } from "../nostr/writeDiaries";
import { useNostrStore } from "../state/useNostrStore";
import { PhaseChips, PlantPicker, SuggestInput, fieldClass, labelClass } from "./DiaryFields";
import type { Diary } from "../nostr/types";

type Mode = { kind: "create" } | { kind: "entry"; diary: Diary } | { kind: "edit"; diary: Diary };

/** Distinct values the user already typed in their own diaries, newest first. */
function recentValues(diaries: Diary[], pick: (d: Diary) => string | undefined): string[] {
  const seen: string[] = [];
  for (const diary of [...diaries].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const value = pick(diary)?.trim();
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen;
}

function Group({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 gap-2.5 rounded-2xl border border-forest-soft/40 bg-forest-deep/30 p-3">
      <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-cream">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf/20 text-[0.65rem] text-leaf">
          {step}
        </span>
        <span className="truncate">{title}</span>
      </h3>
      {children}
    </section>
  );
}

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
  const diaries = useNostrStore((s) => s.diaries);
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

  const cultivars = useMemo(() => recentValues(diaries, (d) => d.cultivar), [diaries]);
  const breeders = useMemo(() => recentValues(diaries, (d) => d.breeder), [diaries]);

  const isEntry = mode.kind === "entry";
  const heading =
    mode.kind === "create" ? "New diary" : isEntry ? `Add entry — ${existing?.title}` : "Edit diary";
  const titleHint = !title.trim() && cultivar.trim() ? cultivar.trim() : null;

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
      <div className="flex max-h-[90dvh] w-full min-w-0 max-w-lg flex-col rounded-2xl border border-forest-soft/60 bg-forest text-cream shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-forest-soft/40 p-4">
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

        <div className="grid min-w-0 flex-1 gap-3 overflow-y-auto p-4">
          {isEntry ? (
            <>
              <div className="grid min-w-0 gap-1.5">
                <label htmlFor="entry-text" className={labelClass}>
                  Entry
                </label>
                <textarea
                  id="entry-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="What changed in the garden today?"
                  className={fieldClass}
                />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <span className={labelClass}>Current phase (optional)</span>
                <PhaseChips value={phase} onChange={setPhase} />
              </div>
            </>
          ) : (
            <>
              <Group step={1} title="What are you growing?">
                <PlantPicker value={plant} onChange={setPlant} />
              </Group>

              <Group step={2} title="Variety details">
                <div className="grid min-w-0 gap-3">
                  <div className="grid min-w-0 gap-1.5">
                    <label htmlFor="diary-cultivar" className={labelClass}>
                      Cultivar
                    </label>
                    <SuggestInput
                      id="diary-cultivar"
                      value={cultivar}
                      onChange={setCultivar}
                      placeholder="Optional"
                      suggestions={cultivars}
                    />
                  </div>
                  <div className="grid min-w-0 gap-1.5">
                    <label htmlFor="diary-breeder" className={labelClass}>
                      Breeder
                    </label>
                    <SuggestInput
                      id="diary-breeder"
                      value={breeder}
                      onChange={setBreeder}
                      placeholder="Optional"
                      suggestions={breeders}
                    />
                  </div>
                </div>
              </Group>

              <Group step={3} title="Current phase">
                <PhaseChips value={phase} onChange={setPhase} />
              </Group>

              <Group step={4} title="Diary name">
                <input
                  id="diary-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My first grow"
                  className={fieldClass}
                />
                {titleHint ? (
                  <button
                    type="button"
                    onClick={() => setTitle(titleHint)}
                    className="justify-self-start rounded-full border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/75"
                  >
                    Use “{titleHint}”
                  </button>
                ) : null}
              </Group>
            </>
          )}

          {error ? (
            <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5 text-xs text-amber-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-forest-soft/40 bg-forest p-3">
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
  );
}

export type { Mode as ComposerMode };
