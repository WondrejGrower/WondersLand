import { useEffect, useState } from "react";
import { useWorldStore, worldFrozen } from "../state/useWorldStore";
import { useWorldSettingsStore } from "../state/useWorldSettingsStore";
import { useGardenStore } from "../state/useGardenStore";
import { getInteractable } from "../world/interactables";
import { growTimer } from "../progression/timer";

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

/** Coarse 30s tick: the in-world prompt only needs the day number. */
function useSlowNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** One contextual prompt for every interaction target, desktop and touch. */
export function InteractionPrompt() {
  const store = useWorldStore();
  const target = store.target;
  const plants = useGardenStore((s) => s.plants);
  const showPrompts = useWorldSettingsStore((s) => s.interface.prompts);
  const tutorialHints = useWorldSettingsStore((s) => s.interface.tutorialHints);
  const coarse = useCoarsePointer();
  const now = useSlowNow();

  const blocked = worldFrozen(store) || !showPrompts;

  const world = target?.kind === "world" ? getInteractable(target.id) : undefined;
  const plant = target?.kind === "plant" ? plants.find((p) => p.id === target.id) : undefined;

  // One key binding for every target: E activates whatever is in range.
  useEffect(() => {
    if (blocked || !target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      e.preventDefault();
      activate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, target, world?.id, plant?.id]);

  function activate() {
    const store = useWorldStore.getState();
    if (world) {
      if (world.action === "about") store.openAbout();
      else if (world.action === "indoor") store.openIndoor();
      else if (world.action === "tasks") store.openTasks();
      else if (world.comingSoon) store.openComingSoon(world.comingSoon);
      return;
    }
    if (plant) store.openJournal();
  }

  if (blocked || !target || (!world && !plant)) return null;

  const base = world ? world.label : (plant?.label ?? "Plant");
  const clock = plant ? growTimer(plant.diary, now || Date.now()).short : null;
  const name = clock ? `${base} · ${clock}` : base;
  const verb = world ? world.verb : "read";
  const label = !tutorialHints
    ? name
    : coarse
      ? `${name} · Tap to ${verb}`
      : `${name} · Press E to ${verb}`;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center px-4 sm:bottom-10">
      <button
        type="button"
        onClick={activate}
        className="pointer-events-auto rounded-full border border-border bg-card/85 px-4 py-2 text-sm font-medium text-card-foreground shadow-lg backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </button>
    </div>
  );
}
