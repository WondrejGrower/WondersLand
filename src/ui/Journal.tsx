import { useEffect, useRef } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { CANNABIS } from "../content/plants";

export function Journal() {
  const open = useWorldStore((s) => s.journalOpen);
  const close = useWorldStore((s) => s.closeJournal);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-7 text-card-foreground shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="journal-title"
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {CANNABIS.name}
            </h2>
            <p className="mt-1 text-sm italic text-muted-foreground">{CANNABIS.species}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close journal"
            className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Esc
          </button>
        </div>

        <p className="mt-5 text-sm leading-relaxed">{CANNABIS.description}</p>

        <h3 className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Field notes
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {CANNABIS.notes.map((note) => (
            <li key={note} className="border-l-2 border-primary/40 pl-3">
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
