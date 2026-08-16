import { useEffect, useMemo, useRef } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { useNostrStore } from "../state/useNostrStore";
import { CANNABIS } from "../content/plants";
import { firstImage } from "../nostr/media";

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Journal() {
  const open = useWorldStore((s) => s.journalOpen);
  const close = useWorldStore((s) => s.closeJournal);
  const focusedId = useWorldStore((s) => s.focusedPlantId);
  const plants = useNostrStore((s) => s.plants);
  const closeRef = useRef<HTMLButtonElement>(null);

  const plant = useMemo(() => plants.find((p) => p.id === focusedId) ?? null, [plants, focusedId]);

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

  const title = plant ? plant.diary.title : CANNABIS.name;
  const subtitle = plant ? (plant.label ?? plant.species ?? "") : CANNABIS.species;

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
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm italic text-muted-foreground">{subtitle}</p> : null}
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

        {plant ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {plant.category}
              </span>
              {plant.diary.phase ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {plant.diary.phase}
                </span>
              ) : null}
              {plant.diary.breeder ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {plant.diary.breeder}
                </span>
              ) : null}
              {!plant.model.dedicated ? (
                <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                  Stand-in model
                </span>
              ) : null}
            </div>

            <h3 className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Grow log · {plant.diary.items.length} entries
            </h3>
            {plant.diary.items.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                This diary has no entries on the connected relays yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-4 text-sm leading-relaxed">
                {[...plant.diary.items].reverse().map((item) => {
                  const image = firstImage(item);
                  return (
                    <li key={item.eventId} className="border-l-2 border-primary/40 pl-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {formatDate(item.createdAt)}
                        {item.phaseLabel ? ` · ${item.phaseLabel}` : ""}
                      </p>
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          loading="lazy"
                          className="mt-2 max-h-48 w-full rounded-lg object-cover"
                        />
                      ) : null}
                      {item.contentPreview ? <p className="mt-2">{item.contentPreview}</p> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
