import { useState } from "react";
import { useWorldStore } from "../state/useWorldStore";
import worldPreview from "../assets/world-preview.png";
import cardGarden from "../assets/card-garden.png";
import cardPlaza from "../assets/card-plaza.png";
import cardFriend from "../assets/card-friend.png";

const NAV = ["Explore", "Gardens", "How it works"];

const FEATURES = [
  {
    title: "Grow Diaries as Gardens",
    text: "Turn your grows into immersive 3D spaces. Track plants, notes, and progress — beautifully visualized.",
    tags: ["Journal", "Plants", "Progress", "Environment"],
    icon: "📓",
  },
  {
    title: "Blossom Media Storage",
    text: "Store your photos, videos, and files on decentralized Blossom servers. Persistent, portable, and yours.",
    tags: ["Decentralized", "Private", "Persistent"],
    icon: "🖼️",
  },
  {
    title: "Nostr Identity",
    text: "One identity. Many gardens. Own your profile, connect freely, and keep your data yours.",
    tags: ["Self-Sovereign", "Portable", "Permissionless"],
    icon: "🔑",
  },
];

function Arrow({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
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

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-cream/40" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LandingScreen() {
  const enter = useWorldStore((s) => s.enter);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-forest-deep text-cream">
      {/* Nav */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf ring-1 ring-leaf/40 sm:h-9 sm:w-9">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" aria-hidden="true">
              <path
                d="M20 4c0 9-5.5 14-12 14 0-8 5-13 12-14ZM4 20c1.5-4 4-7 8-9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span
            className="text-sm font-semibold tracking-tight sm:text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            WondersLand<span className="text-leaf">.online</span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <nav className="mr-4 hidden items-center gap-7 text-sm text-cream/75 lg:flex">
            {NAV.map((item) => (
              <span key={item} className="cursor-default transition-colors hover:text-cream">
                {item}
              </span>
            ))}
          </nav>
          <span className="rounded-full bg-leaf px-3 py-2 text-xs font-semibold text-forest-deep shadow-lg shadow-leaf/20 sm:px-4 sm:py-2.5 sm:text-sm">
            ✦ <span className="hidden min-[420px]:inline">Sign in with Nostr</span><span className="min-[420px]:hidden">Sign in</span>
          </span>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-forest-soft/70 bg-forest/60 text-cream lg:hidden sm:h-11 sm:w-11"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="mx-4 mb-2 grid gap-1 rounded-2xl border border-forest-soft/60 bg-forest/80 p-2 text-sm lg:hidden">
          {NAV.map((item) => (
            <span key={item} className="rounded-xl px-4 py-3 text-cream/80">
              {item}
            </span>
          ))}
        </nav>
      )}

      <main className="mx-auto w-full max-w-7xl px-3 pb-8 sm:px-6 lg:px-10">
        <div className="overflow-hidden rounded-[2rem] border border-forest-soft/50 bg-forest shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]">
          {/* Hero */}
          <section className="relative grid gap-4 px-4 pt-5 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-6 lg:pt-10">
            <div className="relative z-10">
              <h1
                className="text-[2.1rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Step Into Your
                <br />
                <span className="text-leaf">Living</span> <span className="text-cream">Garden</span>
              </h1>
              <p className="mt-2.5 max-w-[16rem] text-sm leading-snug text-cream/70 sm:mt-4 sm:max-w-sm sm:text-base sm:leading-relaxed">
                Your grow diaries become explorable 3D gardens. Connect, explore, and cultivate
                together in a decentralized social world.
              </p>
            </div>

            <div className="relative -mx-2 -mt-1 sm:mx-0 sm:mt-0 lg:mx-0 lg:mt-0">
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-leaf/10 blur-3xl" />
              <img
                src={worldPreview}
                alt="Illustration of the WondersLand floating garden island with greenhouses, a central fountain plaza and glowing portals"
                width={1280}
                height={1024}
                className="mx-auto w-[108%] max-w-xl -translate-x-[4%] scale-105 drop-shadow-2xl sm:w-full sm:translate-x-0 sm:scale-100"
              />
              <span className="pointer-events-none absolute left-[6%] top-[38%] rounded-lg border border-leaf/50 bg-forest-deep/85 px-2.5 py-1 text-xs font-medium text-cream shadow-lg">
                My Garden
              </span>
              <span className="pointer-events-none absolute left-1/2 top-[10%] -translate-x-1/2 rounded-lg border border-sand/50 bg-forest-deep/85 px-2.5 py-1 text-xs font-medium text-cream shadow-lg">
                Plaza
              </span>
              <span className="pointer-events-none absolute right-[4%] top-[16%] rounded-lg border border-plum/60 bg-forest-deep/85 px-2.5 py-1 text-xs font-medium text-cream shadow-lg">
                Visit a Friend
              </span>
            </div>
          </section>

          {/* Destinations */}
          <section className="grid gap-3 px-3 pt-3 sm:px-8 sm:pt-5 lg:grid-cols-3 lg:gap-4">
            <button
              type="button"
              onClick={enter}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-3xl bg-gradient-to-r from-[color-mix(in_oklab,var(--leaf)_22%,var(--cream))] to-cream p-2.5 text-left text-forest-deep shadow-xl transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-forest sm:gap-3 sm:p-4 lg:grid-cols-1 lg:items-start lg:gap-2"
            >
              <img
                src={cardGarden}
                alt=""
                width={512}
                height={512}
                loading="lazy"
                className="h-16 w-16 shrink-0 object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:h-7 sm:w-7">
                    1
                  </span>
                  <span className="text-lg font-semibold sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                    My Garden
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-forest-deep/70">
                  Your personal grow diary world
                </span>
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-1 sm:h-12 sm:w-12 lg:justify-self-end">
                <Arrow />
              </span>
            </button>

            <ComingSoonCard
              index={2}
              title="Plaza"
              description="Discover growers, events, and featured gardens"
              image={cardPlaza}
              accent="sand"
            />
            <ComingSoonCard
              index={3}
              title="Visit a Friend"
              description="Jump straight into another grower's space"
              image={cardFriend}
              accent="plum"
            />
          </section>

          {/* Features */}
          <section className="grid gap-2.5 px-3 pt-2 pb-5 sm:px-8 sm:pt-4 lg:grid-cols-3 lg:pt-8">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-forest-soft/60 bg-forest-deep/60 p-3 sm:rounded-3xl sm:p-4 lg:grid-cols-1 lg:items-start lg:p-6"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest/80 text-2xl sm:h-14 sm:w-14" aria-hidden="true">
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-cream sm:text-lg" style={{ fontFamily: "var(--font-display)" }}>
                    {f.title}
                  </h2>
                  <p className="mt-0.5 text-sm leading-snug text-cream/65 sm:mt-1 sm:leading-relaxed">{f.text}</p>
                  <div className="mt-2 hidden flex-wrap gap-2 sm:mt-3 lg:flex">
                    {f.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-forest-soft/70 bg-forest/70 px-3 py-1 text-xs text-cream/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="lg:hidden">
                  <Chevron />
                </span>
              </article>
            ))}
          </section>

          <footer className="grid gap-3 border-t border-forest-soft/50 px-4 py-4 text-sm text-cream/60 sm:grid-cols-2 sm:gap-4 sm:px-8 sm:py-6 lg:grid-cols-4">
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
      </main>
    </div>
  );
}

function ComingSoonCard({
  index,
  title,
  description,
  image,
  accent,
}: {
  index: number;
  title: string;
  description: string;
  image: string;
  accent: "sand" | "plum";
}) {
  const surface =
    accent === "sand"
      ? "bg-gradient-to-r from-[color-mix(in_oklab,var(--sand)_28%,var(--cream))] to-cream"
      : "bg-gradient-to-r from-[color-mix(in_oklab,var(--plum)_22%,var(--cream))] to-cream";
  const dot = accent === "sand" ? "bg-bark" : "bg-plum";
  const badge =
    accent === "sand"
      ? "bg-[color-mix(in_oklab,var(--sand)_35%,var(--cream))] text-bark"
      : "bg-[color-mix(in_oklab,var(--plum)_25%,var(--cream))] text-plum";

  return (
    <div
      aria-disabled="true"
      className={`relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-3xl p-3 pt-10 text-forest-deep shadow-lg sm:p-4 sm:pt-12 lg:grid-cols-1 lg:items-start lg:gap-2 lg:pt-4 ${surface}`}
    >
      <img
        src={image}
        alt=""
        width={512}
        height={512}
        loading="lazy"
        className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-cream ${dot}`}>
            {index}
          </span>
          <span className="text-xl font-semibold sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
            {title}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-forest-deep/70">{description}</p>
      </div>
      <span
        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-medium sm:right-4 sm:top-4 lg:static lg:justify-self-end ${badge}`}
      >
        Coming soon
      </span>

    </div>
  );
}
