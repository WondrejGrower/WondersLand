import { useEffect } from "react";
import { useWorldStore } from "../state/useWorldStore";

/** Short transient nudge, e.g. when an object is out of reach. */
export function WorldHint() {
  const hint = useWorldStore((s) => s.hint);

  useEffect(() => {
    if (!hint) return;
    const id = window.setTimeout(() => useWorldStore.getState().setHint(null), 2000);
    return () => window.clearTimeout(id);
  }, [hint]);

  if (!hint) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4">
      <p className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs text-card-foreground shadow backdrop-blur">
        {hint}
      </p>
    </div>
  );
}
