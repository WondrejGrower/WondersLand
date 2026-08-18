import { useEffect, useState } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { useGardenStore } from "../state/useGardenStore";

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

/** One prompt for every interaction target, desktop and touch. */
export function InteractionPrompt() {
  const target = useWorldStore((s) => s.target);
  const journalOpen = useWorldStore((s) => s.journalOpen);
  const indoorOpen = useWorldStore((s) => s.indoorOpen);
  const openJournal = useWorldStore((s) => s.openJournal);
  const openIndoor = useWorldStore((s) => s.openIndoor);
  const plants = useGardenStore((s) => s.plants);
  const coarse = useCoarsePointer();

  // Cottage: E opens the indoor garden. Plants keep their own handler.
  useEffect(() => {
    if (indoorOpen || journalOpen || target?.kind !== "cottage") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      e.preventDefault();
      openIndoor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, indoorOpen, journalOpen, openIndoor]);

  if (journalOpen || indoorOpen || !target) return null;

  const isCottage = target.kind === "cottage";
  const plant = isCottage ? null : plants.find((p) => p.id === target.id);
  if (!isCottage && !plant) return null;

  const label = isCottage
    ? coarse
      ? "Open Indoor Plants"
      : "Press E · Indoor Plants"
    : coarse
      ? `${plant?.label ?? "Plant"} · Tap to read`
      : `${plant?.label ?? "Plant"} · Press E to read`;

  const onActivate = () => (isCottage ? openIndoor() : openJournal());

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-4 sm:bottom-10">
      <button
        type="button"
        onClick={onActivate}
        className="pointer-events-auto rounded-full border border-border bg-card/85 px-4 py-2 text-sm font-medium text-card-foreground shadow-lg backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </button>
    </div>
  );
}
