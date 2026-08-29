import { useEffect, useState } from "react";
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

const SECTIONS = [
  {
    title: "What is WondersLand?",
    text: "A cozy 3D botanical world in your browser. Your grow diaries become living gardens you can walk through — no downloads, no accounts needed to look around.",
  },
  {
    title: "Explore the garden",
    text: "Walk with WASD or the touch joystick, drag to look around. Read the plaques by the plants and step into the cottage to see your indoor plants.",
  },
  {
    title: "Your diaries, your identity",
    text: "Sign in with Nostr — one self-sovereign identity for all your gardens. Entries are yours: portable, permissionless, and stored on open relays.",
  },
  {
    title: "Grow together",
    text: "Track phases from seedling to harvest, follow other growers in the feed, and visit their gardens. The Plaza and visiting are coming soon.",
  },
];

/** "What is WondersLand" reader opened from the wooden sign near spawn. */
export function AboutSign() {
  const open = useWorldStore((s) => s.aboutOpen);
  const closeAbout = useWorldStore((s) => s.closeAbout);
  const coarse = useCoarsePointer();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        closeAbout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeAbout]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-20 grid place-items-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={closeAbout}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="What is WondersLand"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            className="text-xl font-semibold text-card-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome to WondersLand
          </h2>
          <button
            type="button"
            onClick={closeAbout}
            aria-label={coarse ? "Close" : "Close (Esc)"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h3 className="text-sm font-semibold text-card-foreground">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={closeAbout}
          className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {coarse ? "Start exploring" : "Start exploring · Esc"}
        </button>
      </div>
    </div>
  );
}
