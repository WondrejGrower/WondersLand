import { useEffect } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { CANNABIS } from "../content/plants";

export function InteractPrompt() {
  const focusedPlantId = useWorldStore((s) => s.focusedPlantId);
  const journalOpen = useWorldStore((s) => s.journalOpen);
  const openJournal = useWorldStore((s) => s.openJournal);

  useEffect(() => {
    if (!focusedPlantId || journalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") {
        e.preventDefault();
        openJournal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedPlantId, journalOpen, openJournal]);

  if (!focusedPlantId || journalOpen) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4 sm:bottom-16">
      <button
        type="button"
        onClick={openJournal}
        aria-label={`Open the journal entry for ${CANNABIS.name}`}
        className="pointer-events-auto rounded-full border border-border bg-card/90 px-5 py-2.5 text-sm text-card-foreground shadow-lg backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium">{CANNABIS.name}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">Press E to read</span>
      </button>
    </div>
  );
}
