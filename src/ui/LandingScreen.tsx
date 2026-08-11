import { useWorldStore } from "../state/useWorldStore";

export function LandingScreen() {
  const enter = useWorldStore((s) => s.enter);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
          A quiet place to grow curious
        </p>
        <h1
          className="mt-4 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          WondersLand
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Wander a small botanical garden, walk up to a plant, and read what it has
          to tell you.
        </p>
        <button
          type="button"
          onClick={enter}
          className="mt-9 rounded-full bg-primary px-8 py-3 text-sm font-medium tracking-wide text-primary-foreground transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Enter WondersLand
        </button>
        <p className="mt-6 text-xs text-muted-foreground">
          Move with WASD or the arrow keys, drag to look around. On a phone, use the
          joystick and drag the world.
        </p>
      </div>
    </main>
  );
}
