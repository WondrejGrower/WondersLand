import { useWorldStore } from "../state/useWorldStore";
import worldPreview from "../assets/world-preview.png";

const NAV = ["Explore", "Gardens", "How it works"];

const FEATURES = [
  {
    title: "Grow Diaries as Gardens",
    text: "Turn your grows into immersive 3D spaces. Track plants, notes, and progress — beautifully visualized.",
    tags: ["Journal", "Plants", "Progress", "Environment"],
  },
  {
    title: "Blossom Media Storage",
    text: "Store your photos, videos, and files on decentralized Blossom servers. Persistent, portable, and yours.",
    tags: ["Decentralized", "Persistent", "Portable"],
  },
  {
    title: "Nostr Identity",
    text: "One identity. Many gardens. Own your profile, connect freely, and keep your data yours.",
    tags: ["Self-Sovereign", "Portable", "Permissionless"],
  },
];

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M5 12h14m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingScreen() {
  const enter = useWorldStore((s) => s.enter);

  return (
    <div className="min-h-screen bg-forest-deep text-cream">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-forest-soft/60 bg-forest shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
          {/* Nav */}
          <header className="flex items-center justify-between gap-4 border-b border-forest-soft/50 px-4 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf/15 text-leaf ring-1 ring-leaf/40">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M20 4c0 9-5.5 14-12 14 0-8 5-13 12-14ZM4 20c1.5-4 4-7 8-9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                WondersLand<span className="text-leaf">.online</span>
              </span>
            </div>
            <nav className="hidden items-center gap-7 text-sm text-cream/75 md:flex">
              {NAV.map((item) => (
                <span key={item} className="cursor-default transition-colors hover:text-cream">
                  {item}
                </span>
              ))}
            </nav>
            <span className="rounded-full bg-leaf px-4 py-2.5 text-sm font-semibold text-forest-deep shadow-lg shadow-leaf/20 sm:px-5">
              ✦ <span className="hidden sm:inline">Sign in with Nostr</span>
              <span className="sm:hidden">Sign in</span>
            </span>
          </header>

          {/* Hero */}
          <section className="grid items-center gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:py-14">
            <div>
              <h1
                className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Step Into Your
                <br />
                <span className="text-leaf">Living</span> <span className="text-cream">Garden</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-cream/70">
                Your grow diaries become explorable 3D gardens. Connect, explore, and cultivate
                together in a decentralized social world.
              </p>
              <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-forest-soft/70 bg-forest-deep/60 px-4 py-2.5 text-xs text-cream/70 sm:text-sm">
                <span aria-hidden="true">🌱</span>
                <span>Lightweight scene loading</span>
                <span className="text-cream/25">·</span>
                <span>Load one world at a time</span>
              </div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-leaf/10 blur-3xl" />
              <img
                src={worldPreview}
                alt="Illustration of the WondersLand floating garden island with greenhouses, a central fountain plaza and three glowing portals"
                width={1280}
                height={1024}
                className="mx-auto w-full max-w-xl drop-shadow-2xl"
              />
            </div>
          </section>

          {/* Destinations */}
          <section className="grid gap-4 px-4 pb-8 sm:px-8 lg:grid-cols-3">
            <button
              type="button"
              onClick={enter}
              className="group flex items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-cream to-[color-mix(in_oklab,var(--leaf)_28%,var(--cream))] p-6 text-left text-forest-deep shadow-xl transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-forest"
            >
              <span>
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    1
                  </span>
                  <span className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                    My Garden
                  </span>
                </span>
                <span className="mt-3 block text-sm text-forest-deep/70">
                  Your personal grow diary world
                </span>
              </span>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-1">
                <Arrow />
              </span>
            </button>

            <ComingSoonCard
              index={2}
              title="Plaza"
              description="Discover growers, events, and featured gardens"
              accent="sand"
            />
            <ComingSoonCard
              index={3}
              title="Visit a Friend"
              description="Jump straight into another grower's space"
              accent="plum"
            />
          </section>

          {/* Features */}
          <section className="grid gap-4 px-4 pb-10 sm:px-8 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-3xl border border-forest-soft/60 bg-forest-deep/60 p-6 backdrop-blur"
              >
                <h2 className="text-lg font-semibold text-cream" style={{ fontFamily: "var(--font-display)" }}>
                  {f.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-cream/65">{f.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-forest-soft/70 bg-forest/70 px-3 py-1 text-xs text-cream/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <footer className="grid gap-4 border-t border-forest-soft/50 px-4 py-6 text-sm text-cream/60 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {[
              ["Decentralized & Open", "Community owned, censorship resistant"],
              ["Built for Growers", "By growers, for growers"],
              ["Your Data, Your World", "You own it. You control it."],
              ["Explore Together", "A world of gardens awaits"],
            ].map(([title, sub]) => (
              <div key={title}>
                <p className="font-medium text-cream/90">{title}</p>
                <p className="text-xs text-cream/55">{sub}</p>
              </div>
            ))}
          </footer>
        </div>
      </div>
    </div>
  );
}

function ComingSoonCard({
  index,
  title,
  description,
  accent,
}: {
  index: number;
  title: string;
  description: string;
  accent: "sand" | "plum";
}) {
  const ring = accent === "sand" ? "ring-sand/40" : "ring-plum/40";
  const dot = accent === "sand" ? "bg-sand" : "bg-plum";
  return (
    <div
      aria-disabled="true"
      className={`flex items-center justify-between gap-4 rounded-3xl border border-forest-soft/60 bg-forest-deep/50 p-6 ring-1 ${ring}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <span className={`grid h-8 w-8 place-items-center rounded-full ${dot} text-sm font-semibold text-forest-deep`}>
            {index}
          </span>
          <span className="text-2xl font-semibold text-cream/85" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </span>
        </div>
        <p className="mt-3 text-sm text-cream/55">{description}</p>
      </div>
      <span className="shrink-0 self-start rounded-full border border-forest-soft/70 bg-forest/70 px-3 py-1 text-xs text-cream/70">
        Coming soon
      </span>
    </div>
  );
}
