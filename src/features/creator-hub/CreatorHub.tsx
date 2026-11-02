import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronUp,
  Instagram,
  Menu,
  Radio,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { partnerLink, SOCIAL, type Partner } from "./links";
import "./creator-hub.css";

const CHAPTERS = [
  { label: "Soil", at: 0, number: "01" },
  { label: "Roots", at: 0.29, number: "02" },
  { label: "Leaf", at: 0.64, number: "03" },
  { label: "Flower", at: 1, number: "04" },
];
const SPECKS = Array.from({ length: 16 }, (_, i) => ({
  left: ((i * 37 + 13) % 100) + "%",
  top: ((i * 23 + 7) % 100) + "%",
  animationDelay: -i * 1.3 + "s",
  animationDuration: 9 + (i % 7) + "s",
}));
function interpolate(p: number, points: [number, number][]): number {
  for (let i = 1; i < points.length; i++) {
    const [to, b] = points[i]!,
      [from, a] = points[i - 1]!;
    if (p <= to) return a + (b - a) * Math.max(0, (p - from) / (to - from));
  }
  return points[points.length - 1]![1];
}
function color(p: number, stops: [number, [number, number, number]][]) {
  return (
    "rgb(" +
    [0, 1, 2]
      .map((channel) =>
        Math.round(
          interpolate(
            p,
            stops.map(([at, rgb]) => [at, rgb[channel]!]),
          ),
        ),
      )
      .join(" ") +
    ")"
  );
}
function PartnerAnchor({
  id,
  className,
  children,
}: {
  id: Partner;
  className?: string;
  children: ReactNode;
}) {
  const link = partnerLink(id);
  return (
    <a href={link.href} target="_blank" rel={link.rel} className={className}>
      {children}
      <ArrowUpRight size={16} aria-hidden />
    </a>
  );
}
function SeedMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 17C5 17 6 5 6 5s11-1 11 10M16 14C16 4 27 4 27 4s0 12-11 13v11M16 23l-5 4m5-7 5 5m-5 2-3 4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function LinkDirectory() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="hub-menu" aria-label="About NoTillMan and all links">
        <Menu size={18} aria-hidden />
        <span>About & links</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="hub-modal-overlay" />
        <Dialog.Content className="hub-modal">
          <Dialog.Close className="hub-modal-close" aria-label="Close about and links">
            <X size={22} />
          </Dialog.Close>
          <div className="hub-modal-mark">
            <SeedMark size={42} />
          </div>
          <p className="hub-small-label">THE PERSON BEHIND THE PLANT</p>
          <Dialog.Title>Hey, I’m Wondrej.</Dialog.Title>
          <Dialog.Description>
            I’m a grower and creator exploring living soil, curious ideas and new ways to tell
            stories. NoTillMan is where they meet.
          </Dialog.Description>
          <div className="hub-directory-links">
            <PartnerAnchor id="fastbuds" className="hub-directory-partner">
              <span>
                <b>FastBuds</b>
                <small>Genetics for the next thing you grow</small>
              </span>
            </PartnerAnchor>
            <PartnerAnchor id="higgsfield" className="hub-directory-partner">
              <span>
                <b>Higgsfield</b>
                <small>A place for ideas to become images & video</small>
              </span>
            </PartnerAnchor>
          </div>
          <div className="hub-directory-socials">
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={18} />
              Instagram <ArrowUpRight size={14} />
            </a>
            <a href={SOCIAL.nostr} target="_blank" rel="noopener noreferrer">
              <Radio size={18} />
              Nostr <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="hub-directory-note">
            For a conversation or collaboration, find me on Instagram.
          </p>
          {(partnerLink("fastbuds").isAffiliate || partnerLink("higgsfield").isAffiliate) && (
            <p className="hub-affiliate-note">
              Some links are affiliate links and may support my work.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CreatorHub() {
  const viewport = useRef<HTMLDivElement>(null),
    frame = useRef<number | null>(null);
  const [progress, setProgress] = useState(0),
    [reducedMotion, setReducedMotion] = useState(false);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight - el.clientHeight;
  }, []);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  function readScroll() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const el = viewport.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(Math.max(0, Math.min(1, max > 0 ? 1 - el.scrollTop / max : 0)));
    });
  }
  function riseTo(at: number) {
    const el = viewport.current;
    if (el)
      el.scrollTo({
        top: (1 - at) * (el.scrollHeight - el.clientHeight),
        behavior: reducedMotion ? "instant" : "smooth",
      });
  }
  const chapter = progress < 0.15 ? 0 : progress < 0.46 ? 1 : progress < 0.82 ? 2 : 3;
  const daylight = Math.max(0, (progress - 0.54) / 0.46);
  const target = interpolate(progress, [
    [0, 0.85],
    [0.29, 0.67],
    [0.64, 0.36],
    [1, 0.13],
  ]);
  const style = {
    "--journey-bg": color(progress, [
      [0, [5, 8, 12]],
      [0.3, [10, 24, 24]],
      [0.6, [25, 53, 41]],
      [1, [224, 232, 194]],
    ]),
    "--journey-ink": color(progress, [
      [0, [243, 235, 216]],
      [0.66, [243, 235, 216]],
      [1, [28, 54, 35]],
    ]),
    "--journey-accent": color(progress, [
      [0, [208, 178, 125]],
      [0.6, [193, 209, 154]],
      [1, [59, 91, 43]],
    ]),
    "--journey-day": daylight,
    "--journey-dark": 1 - daylight,
    "--plant-light": 0.23 + 0.77 * progress,
    "--plant-saturation": 0.56 + progress * 0.44,
    "--plant-target": target * 100 + "%",
    "--plant-zoom": interpolate(progress, [
      [0, 1.55],
      [0.29, 1.22],
      [0.64, 1.08],
      [1, 1.05],
    ]),
    "--plant-pan":
      interpolate(progress, [
        [0, 0],
        [0.64, -5],
        [1, 0],
      ]) + "vw",
  } as CSSProperties;
  return (
    <div className="creator-hub" style={style}>
      <a className="hub-skip" href="#hub-quick-links">
        Skip to the links
      </a>
      <header className="hub-header">
        <button
          className="hub-brand"
          onClick={() => riseTo(0)}
          aria-label="NoTillMan — back to the soil"
        >
          <SeedMark />
          <span>
            NoTillMan<small>ROOTED IN CURIOSITY</small>
          </span>
        </button>
        <div className="hub-header-right">
          <a
            className="hub-social-icon"
            href={SOCIAL.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="NoTillMan on Instagram"
          >
            <Instagram size={19} />
          </a>
          <LinkDirectory />
        </div>
      </header>
      <div
        ref={viewport}
        className="hub-viewport"
        onScroll={readScroll}
        tabIndex={0}
        role="region"
        aria-label="A journey from the soil to the flower. Scroll upward, or use the chapter buttons."
      >
        <div className="hub-track">
          <main className="hub-stage">
            <div className="hub-atmosphere" aria-hidden>
              <div className="hub-moon-glow" />
              <div className="hub-day-glow" />
              <div className="hub-light-rays" />
              <div className="hub-horizon" />
              <div className="hub-grain" />
              {SPECKS.map((s, i) => (
                <i key={i} className="hub-speck" style={s} />
              ))}
            </div>
            <div className="hub-plant-world">
              <img
                className="hub-plant"
                src="/images/notillman-plant.webp"
                alt="A single cannabis plant with a flowering top, green fan leaves and an exposed branching root system"
                width="1024"
                height="1536"
                fetchPriority="high"
                decoding="async"
              />
              {chapter === 2 && (
                <PartnerAnchor id="higgsfield" className="hub-plant-hotspot hub-leaf-hotspot">
                  <span className="hub-hotspot-dot" />
                  <span>Higgsfield</span>
                </PartnerAnchor>
              )}
              {chapter === 3 && (
                <PartnerAnchor id="fastbuds" className="hub-plant-hotspot hub-flower-hotspot">
                  <span className="hub-hotspot-dot" />
                  <span>FastBuds</span>
                </PartnerAnchor>
              )}
            </div>
            <nav className="hub-chapter-rail" aria-label="Journey chapters">
              {CHAPTERS.slice()
                .reverse()
                .map((c, reverseIndex) => {
                  const index = 3 - reverseIndex;
                  return (
                    <button
                      key={c.label}
                      aria-label={c.label}
                      className={chapter === index ? "is-current" : ""}
                      aria-current={chapter === index ? "step" : undefined}
                      onClick={() => riseTo(c.at)}
                    >
                      <span className="hub-rail-dot" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
            </nav>
            <section
              className={"hub-story hub-story-" + chapter}
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="hub-eyebrow">
                <span>{CHAPTERS[chapter]!.number}</span>
                {
                  [
                    "BELOW THE SURFACE",
                    "EVERYTHING IS CONNECTED",
                    "A LITTLE IMAGINATION",
                    "INTO THE LIGHT",
                  ][chapter]
                }
              </p>
              <h1 key={chapter}>
                {chapter === 0 ? (
                  <>
                    Life starts
                    <br />
                    <em>in the dark.</em>
                  </>
                ) : chapter === 1 ? (
                  <>
                    Good things
                    <br />
                    <em>take root.</em>
                  </>
                ) : chapter === 2 ? (
                  <>
                    Let ideas
                    <br />
                    <em>come alive.</em>
                  </>
                ) : (
                  <>
                    Find your
                    <br />
                    <em>next grow.</em>
                  </>
                )}
              </h1>
              <p className="hub-story-description">
                {
                  [
                    "A little soil. A little curiosity. A whole world waiting to grow.",
                    "I’m Wondrej. I grow living soil, follow curious ideas, and share what I learn.",
                    "From the first spark to a story worth sharing. This is where I explore the creative side.",
                    "The genetics behind a new beginning. Explore what could grow next.",
                  ][chapter]
                }
              </p>
              {chapter < 2 ? (
                <button className="hub-rise" onClick={() => riseTo(CHAPTERS[chapter + 1]!.at)}>
                  <span className="hub-rise-arrow">
                    <ArrowUp size={19} />
                  </span>
                  <span>
                    {chapter === 0 ? "Begin the ascent" : "Follow the stem"}
                    <small>
                      {chapter === 0 ? "Scroll up · or tap to rise" : "Keep growing upward"}
                    </small>
                  </span>
                </button>
              ) : (
                <div
                  className={
                    "hub-partner-card " +
                    (chapter === 2 ? "hub-higgsfield-card" : "hub-fastbuds-card")
                  }
                >
                  <span className="hub-partner-symbol" aria-hidden>
                    {chapter === 2 ? <Sparkles size={20} /> : "42"}
                  </span>
                  <div>
                    <p className="hub-partner-category">
                      {chapter === 2 ? "ON THE LEAF · CREATIVE TOOLS" : "ON THE FLOWER · GENETICS"}
                    </p>
                    <h2>{chapter === 2 ? "Higgsfield" : "FastBuds"}</h2>
                  </div>
                  <PartnerAnchor
                    id={chapter === 2 ? "higgsfield" : "fastbuds"}
                    className="hub-partner-cta"
                  >
                    {chapter === 2 ? "Create with Higgsfield" : "Explore FastBuds"}
                  </PartnerAnchor>
                  <p className="hub-partner-note">
                    {partnerLink(chapter === 2 ? "higgsfield" : "fastbuds").isAffiliate
                      ? "Affiliate link · supports my work"
                      : chapter === 2
                        ? "AI images & video"
                        : "For the next thing you grow"}
                  </p>
                </div>
              )}
            </section>
            <div className="hub-bottom-cue" aria-hidden>
              {chapter === 3 ? (
                <>
                  <Check size={14} />
                  <span>Rooted in curiosity. Growing in the light.</span>
                </>
              ) : (
                <>
                  <ChevronUp size={16} />
                  <span>THE ONLY WAY IS UP</span>
                </>
              )}
            </div>
            <div
              className="hub-progress"
              role="progressbar"
              aria-label="Journey into the light"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span style={{ height: progress * 100 + "%" }} />
            </div>
          </main>
        </div>
      </div>
      <footer className="hub-dock" id="hub-quick-links">
        <div className="hub-dock-person">
          <span className="hub-live-dot" />
          <span>
            Wondrej<small>GROWER & CREATOR</small>
          </span>
        </div>
        <div className="hub-quick-links" aria-label="Direct links">
          <PartnerAnchor id="fastbuds" className="hub-quick-link">
            <Sprout size={16} />
            <span>FastBuds</span>
          </PartnerAnchor>
          <span className="hub-link-divider" />
          <PartnerAnchor id="higgsfield" className="hub-quick-link">
            <Sparkles size={16} />
            <span>Higgsfield</span>
          </PartnerAnchor>
        </div>
        <button
          className="hub-next-chapter"
          onClick={() => riseTo(chapter === 3 ? 0 : CHAPTERS[chapter + 1]!.at)}
          aria-label={chapter === 3 ? "Return to the soil" : "Rise to the next chapter"}
        >
          {chapter === 3 ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
        </button>
      </footer>
    </div>
  );
}
