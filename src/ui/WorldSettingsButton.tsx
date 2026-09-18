import { Settings } from "lucide-react";
import { useWorldStore, worldFrozen } from "../state/useWorldStore";

/**
 * Gear button, directly under the "← Nostr" pill. Same visual language, a size
 * smaller, but still a 44x44 touch target. Only its own area takes pointer
 * events, so the world underneath keeps receiving clicks and drags.
 */
export function WorldSettingsButton() {
  const store = useWorldStore();
  if (worldFrozen(store)) return null;

  return (
    <button
      type="button"
      aria-label="World settings"
      onClick={() => useWorldStore.getState().openSettings()}
      className="absolute right-4 top-[4.25rem] z-10 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/85 text-card-foreground shadow-lg backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Settings className="h-4 w-4" aria-hidden />
    </button>
  );
}
