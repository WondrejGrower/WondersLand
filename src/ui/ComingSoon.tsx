import { useEffect } from "react";
import { useWorldStore } from "../state/useWorldStore";

/** Placeholder reader for portals whose destination is not built yet. */
export function ComingSoon() {
  const info = useWorldStore((s) => s.comingSoon);
  const close = useWorldStore((s) => s.closeComingSoon);

  useEffect(() => {
    if (!info) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [info, close]);

  if (!info) return null;

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={info.title}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-lg font-semibold text-card-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {info.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{info.body}</p>
        <button
          type="button"
          onClick={close}
          className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to the garden
        </button>
      </div>
    </div>
  );
}
