import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useWorldStore } from "../state/useWorldStore";

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return coarse;
}

/**
 * Quick exit from the 3D world back to the Nostr client:
 * the C key on desktop, a floating touch button on mobile.
 * Rendered only inside the 3D branch — entering the world stays on
 * "Enter Garden" in the dashboard.
 */
export function ExitWorldSwitch() {
  const journalOpen = useWorldStore((s) => s.journalOpen);
  const indoorOpen = useWorldStore((s) => s.indoorOpen);
  const aboutOpen = useWorldStore((s) => s.aboutOpen);
  const comingSoon = useWorldStore((s) => s.comingSoon);
  const coarse = useCoarsePointer();

  const blocked = journalOpen || indoorOpen || aboutOpen || comingSoon !== null;

  useEffect(() => {
    if (blocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyC" || e.repeat) return;
      e.preventDefault();
      useWorldStore.getState().exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocked]);

  if (!coarse || blocked) return null;

  return (
    <button
      type="button"
      aria-label="Přepnout na Nostr klienta"
      onClick={() => useWorldStore.getState().exit()}
      className="absolute right-4 top-4 z-10 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 py-2 text-xs font-medium text-card-foreground shadow-lg backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Nostr
    </button>
  );
}
