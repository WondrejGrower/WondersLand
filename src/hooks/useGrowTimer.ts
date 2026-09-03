import { useEffect, useState } from "react";
import { growTimer, type GrowTimer } from "../progression/timer";
import type { Diary } from "../nostr/types";

/** One shared 1s tick, mounted only where a live timer is on screen. */
function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/**
 * Live grow timer for one diary. Before hydration (and for finished grows) the
 * seconds are omitted so server and client render identical markup.
 */
export function useGrowTimer(diary: Diary): GrowTimer & { hydrated: boolean } {
  const base = growTimer(diary, 0);
  const now = useNow(base.running);
  const timer = growTimer(diary, now ?? diary.createdAt * 1000);
  const hydrated = now !== null;
  if (!hydrated && base.running) {
    // Deterministic placeholder until the first client tick.
    return { ...base, hms: "", label: base.short, hydrated };
  }
  return { ...timer, hydrated };
}
