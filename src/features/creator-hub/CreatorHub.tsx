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
  ArrowLeft,
  ArrowRight,
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
import { CHAPTERS, chapterAt, clamp, interpolate, smoothstep } from "./scene/journey";
import type { SceneController, SceneFrame } from "./scene/PlantScene";
import { INTRO_DESCENT_MS, startEntryIntro, type IntroPhase } from "./intro";
import "./creator-hub.css";

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
  const [entry, setEntry] = useState<IntroPhase>("photo");
  const [introReady, setIntroReady] = useState(false);
  const introPhoto = useRef<HTMLImageElement>(null);
  const intro = useRef<ReturnType<typeof startEntryIntro> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const sceneHost = useRef<HTMLDivElement>(null);
  const scene = useRef<SceneController | null>(null);
  const leaf = useRef<HTMLAnchorElement>(null);
  const flower = useRef<HTMLAnchorElement>(null);
  const progressbar = useRef<HTMLDivElement>(null);
  const rawProgress = useRef(0);
  const activeChapter = useRef(0);
  const lastPercent = useRef(-1);
  const reduced = useRef(false);
  const sceneReady = useRef(false);
  const [chapter, setChapter] = useState(0);
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const photo = introPhoto.current;
    const controller = startEntryIntro({
      photoReady: photo?.decode() ?? Promise.resolve(),
      reducedMotion: media.matches,
      onPhase: setEntry,
    });
    intro.current = controller;
    setIntroReady(true);
    const preferenceChanged = () => {
      if (media.matches) controller.skip();
    };
    media.addEventListener("change", preferenceChanged);
    return () => {
      controller.dispose();
      intro.current = null;
      media.removeEventListener("change", preferenceChanged);
    };
  }, []);

  useEffect(() => {
    if (entry === "journey") viewport.current?.focus({ preventScroll: true });
  }, [entry]);

  function paint(p: number) {
    const el = root.current;
    if (!el) return;
    const daylight = smoothstep(0.38, 1, p);
    el.style.setProperty("--journey-day", daylight.toFixed(3));
    el.style.setProperty("--journey-dark", (1 - daylight).toFixed(3));
    const next = chapterAt(p);
    if (activeChapter.current !== next) {
      activeChapter.current = next;
      setChapter(next); // React changes only at chapter boundaries, never per animation frame.
    }
    if (progressbar.current) {
      const percent = Math.round(p * 100);
      if (percent !== lastPercent.current) {
        progressbar.current.setAttribute("aria-valuenow", String(percent));
        lastPercent.current = percent;
      }
      (progressbar.current.firstElementChild as HTMLElement).style.transform = `scaleY(${p})`;
    }
    if (!sceneReady.current) {
      el.style.setProperty(
        "--plant-target",
        interpolate(p, [
          [0, 85],
          [0.29, 67],
          [0.64, 36],
          [1, 13],
        ]) + "%",
      );
      el.style.setProperty(
        "--plant-zoom",
        String(
          interpolate(p, [
            [0, 1.55],
            [0.29, 1.22],
            [0.64, 1.08],
            [1, 1.05],
          ]),
        ),
      );
    }
  }
  function paintScene({ progress, width, leaf: leafPoint, flower: flowerPoint }: SceneFrame) {
    paint(progress);
    for (const [ref, point] of [
      [leaf, leafPoint],
      [flower, flowerPoint],
    ] as const) {
      if (!ref.current) continue;
      const half = (width < 600 ? 106 : 130) / 2 + 8;
      const x = clamp(point.x, half, Math.max(half, width - half));
      ref.current.style.transform = `translate3d(${x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      ref.current.style.visibility = point.visible ? "visible" : "hidden";
    }
  }
  useLayoutEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight - el.clientHeight;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const el = viewport.current!,
      host = sceneHost.current!;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function motionPreference() {
      reduced.current = media.matches;
      scene.current?.setReducedMotion(media.matches);
    }
    function scroll() {
      const max = el.scrollHeight - el.clientHeight;
      const p = clamp(max > 0 ? 1 - el.scrollTop / max : 0);
      rawProgress.current = p;
      scene.current?.setProgress(p);
      if (!sceneReady.current) paint(p);
    }
    motionPreference();
    media.addEventListener("change", motionPreference);
    el.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    scroll();
    void import("./scene/PlantScene")
      .then(({ mountPlantScene }) => {
        if (cancelled) return;
        scene.current = mountPlantScene({
          host,
          input: el,
          reducedMotion: reduced.current,
          progress: rawProgress.current,
          onFrame: paintScene,
          onStatus(ready) {
            if (cancelled) return;
            sceneReady.current = ready;
            setSceneState(ready ? "ready" : "fallback");
          },
        });
      })
      .catch((error: unknown) => {
        console.warn(
          "NoTillMan 3D is unavailable:",
          error instanceof Error ? error.message : "Unknown renderer error",
        );
        if (!cancelled) {
          sceneReady.current = false;
          setSceneState("fallback");
        }
      });
    return () => {
      cancelled = true;
      el.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      media.removeEventListener("change", motionPreference);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  function riseTo(at: number) {
    const el = viewport.current;
    el?.scrollTo({
      top: (1 - at) * (el.scrollHeight - el.clientHeight),
      behavior: reduced.current ? "instant" : "smooth",
    });
  }
  return (
    <div
      ref={root}
      className="creator-hub"
      data-chapter={entry === "journey" ? chapter : 0}
      data-scene-state={sceneState}
      data-entry={entry}
      style={{ "--intro-descent-duration": `${INTRO_DESCENT_MS}ms` } as CSSProperties}
    >
      {entry === "journey" && (
        <a className="hub-skip" href="#hub-quick-links">
          Skip to the links
        </a>
      )}
      {entry !== "journey" && (
        <section className="hub-intro" aria-label="NoTillMan introduction">
          <div className="hub-intro-visual" aria-hidden="true">
            <div className="hub-intro-world">
              <div className="hub-intro-surface">
                <img
                  ref={introPhoto}
                  className="hub-intro-photo"
                  src="/images/notillman-night-landing.webp"
                  alt=""
                  width="1170"
                  height="1487"
                  fetchPriority="high"
                />
              </div>
              <div className="hub-intro-earth" />
            </div>
          </div>
          <button
            className="hub-skip-intro"
            disabled={!introReady}
            onClick={() => intro.current?.skip()}
          >
            Skip intro <ArrowDown size={14} aria-hidden />
          </button>
        </section>
      )}
      <header className="hub-header" inert={entry !== "journey"}>
        <button className="hub-brand" onClick={() => riseTo(0)} aria-label="NoTillMan — home">
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
        inert={entry !== "journey"}
        aria-hidden={entry !== "journey"}
        className="hub-viewport"
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
            </div>
            <div ref={sceneHost} className="hub-scene" />
            {chapter === 3 && (
              <div className="hub-real-flower" aria-hidden="true">
                <img src="/images/notillman-real-bud.webp" alt="" width="1024" height="1365" />
              </div>
            )}
            {sceneState === "fallback" && (
              <div className="hub-plant-world" aria-hidden>
                <img
                  className="hub-plant"
                  src="/images/notillman-plant.webp"
                  alt=""
                  width="1024"
                  height="1536"
                  decoding="async"
                />
              </div>
            )}
            <a
              ref={leaf}
              href={partnerLink("higgsfield").href}
              target="_blank"
              rel={partnerLink("higgsfield").rel}
              className="hub-plant-hotspot hub-scene-hotspot hub-leaf-hotspot"
              hidden={chapter !== 2 || sceneState !== "ready"}
            >
              <span className="hub-hotspot-dot" />
              <span>Higgsfield</span>
              <ArrowUpRight size={14} aria-hidden />
            </a>
            <a
              ref={flower}
              href={partnerLink("fastbuds").href}
              target="_blank"
              rel={partnerLink("fastbuds").rel}
              className="hub-plant-hotspot hub-scene-hotspot hub-flower-hotspot hub-real-flower-link"
              hidden={chapter !== 3}
            >
              <span className="hub-hotspot-dot" />
              <span>FastBuds</span>
              <ArrowUpRight size={14} aria-hidden />
            </a>
            {sceneState === "ready" ? (
              <div className="hub-scene-controls" role="group" aria-label="Plant view">
                <button aria-label="Rotate plant left" onClick={() => scene.current?.rotate(-0.28)}>
                  <ArrowLeft size={14} />
                </button>
                <span>3D · DRAG TO EXPLORE</span>
                <button aria-label="Rotate plant right" onClick={() => scene.current?.rotate(0.28)}>
                  <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <p className="hub-scene-status" role="status">
                {sceneState === "loading"
                  ? "Opening the garden…"
                  : "Still view · explore the links"}
              </p>
            )}
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
                    "THE PERSON BEHIND NOTILLMAN",
                    "EVERYTHING IS CONNECTED",
                    "A LITTLE IMAGINATION",
                    "INTO THE LIGHT",
                  ][chapter]
                }
              </p>
              <h1 key={chapter}>
                {chapter === 0 ? (
                  <>
                    Hey, I’m
                    <br />
                    <em>Wondrej.</em>
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
                    "I’m the grower and creator behind NoTillMan. Here I share my plants, my experiments and the stories that grow around them.",
                    "Living soil is where I start. Follow the stem to the tools and ideas I use.",
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
              ref={progressbar}
              className="hub-progress"
              role="progressbar"
              aria-label="Journey into the light"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
            >
              <span />
            </div>
          </main>
        </div>
      </div>
      <footer className="hub-dock" id="hub-quick-links" inert={entry !== "journey"}>
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
          aria-label={chapter === 3 ? "Return to my bio" : "Rise to the next chapter"}
        >
          {chapter === 3 ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
        </button>
      </footer>
    </div>
  );
}
