import { useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Leaf,
  Radio,
  Sparkles,
  Sprout,
  Star,
  Users,
  CheckCircle2,
  LayoutGrid,
} from "lucide-react";
import { useNostrStore } from "../state/useNostrStore";
import { useGardenStore } from "../state/useGardenStore";
import { useWorldStore } from "../state/useWorldStore";
import { useFeedStore } from "../state/useFeedStore";
import { profileLabel } from "../nostr/profile";
import { firstImage } from "../nostr/media";
import { ZONES, type ZoneId } from "../garden/zones";
import type { Diary } from "../nostr/types";
import { NostrSignIn } from "./NostrSignIn";
import { DiaryComposer, type ComposerMode } from "./DiaryComposer";
import { GrowFeed } from "./GrowFeed";
import { canPublish } from "../nostr/signers";
import { computeGrowth, nextStep } from "../progression/growth";
import heroArt from "../assets/garden-island.png";

const DAY = 86_400_000;
const STALE_DAYS = 14;

type Section = "garden" | "diaries" | "missions" | "community";

const NAV: { id: Section; label: string; Icon: typeof Leaf }[] = [
  { id: "garden", label: "Garden", Icon: Leaf },
  { id: "diaries", label: "Diaries", Icon: BookOpen },
  { id: "missions", label: "Missions", Icon: Sparkles },
  { id: "community", label: "Community", Icon: Users },
];

function relative(seconds: number): string {
  const days = Math.floor((Date.now() - seconds * 1000) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? "a month ago" : `${months} months ago`;
}

function subtitle(diary: Diary): string {
  return [diary.cultivar, diary.plant ?? diary.species].filter(Boolean).join(" · ");
}

function Ring({ value }: { value: number }) {
  const size = 108;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value}% grown`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--forest-soft)"
        strokeWidth={stroke}
        opacity={0.5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--leaf)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--cream)"
        style={{ fontFamily: "var(--font-display)", fontSize: 24 }}
      >
        {value}%
      </text>
    </svg>
  );
}

function Card({
  diary,
  onUpdate,
}: {
  diary: Diary;
  onUpdate: ((diary: Diary) => void) | null;
}) {
  const cover = diary.coverImage ?? diary.items.map(firstImage).find(Boolean);
  return (
    <article className="overflow-hidden rounded-2xl border border-forest-soft/50 bg-forest/70 text-left">
      <div className="aspect-[16/10] w-full bg-forest-deep/70">
        {cover ? (
          <img
            src={cover}
            alt={`Cover photo of ${diary.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-cream/40">No photo yet</div>
        )}
      </div>
      <div className="grid gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-cream">{diary.title}</h3>
          {diary.phase ? (
            <span className="shrink-0 rounded-full bg-leaf/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-leaf">
              {diary.phase}
            </span>
          ) : null}
        </div>
        {subtitle(diary) ? (
          <p className="truncate text-xs text-cream/60">{subtitle(diary)}</p>
        ) : null}
        <p className="text-xs text-cream/45">
          {diary.items.length} {diary.items.length === 1 ? "entry" : "entries"} · updated{" "}
          {relative(diary.updatedAt)}
        </p>
        {onUpdate ? (
          <button
            type="button"
            onClick={() => onUpdate(diary)}
            className="mt-2 justify-self-start rounded-full border border-leaf/40 px-3 py-1 text-xs font-medium text-leaf"
          >
            Update
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Panel({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof Leaf;
  children: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-3 rounded-2xl border border-forest-soft/50 bg-forest/60 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-cream">
        <Icon className="h-4 w-4 text-leaf" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Signed-in Home. Everything here is derived from Nostr data already in the
 * stores — diaries (kind 30078), the community feed (kind 1) and the signed
 * GardenConfig. No proprietary database, no invented progression truth.
 */
export function HomeDashboard() {
  const profile = useNostrStore((s) => s.profile);
  const pubkey = useNostrStore((s) => s.pubkey);
  const diaries = useNostrStore((s) => s.diaries);
  const status = useNostrStore((s) => s.status);
  const plants = useGardenStore((s) => s.plants);
  const gardenStatus = useGardenStore((s) => s.status);
  const gardenDirty = useGardenStore((s) => s.dirty);
  const gardenError = useGardenStore((s) => s.error);
  const feedStatus = useFeedStore((s) => s.status);
  const enter = useWorldStore((s) => s.enter);
  const method = useNostrStore((s) => s.method);
  const [composer, setComposer] = useState<ComposerMode | null>(null);
  const [section, setSection] = useState<Section>("garden");
  const [feedExpanded, setFeedExpanded] = useState(false);
  const writable = canPublish(method);

  const sorted = useMemo(() => [...diaries].sort((a, b) => b.updatedAt - a.updatedAt), [diaries]);
  const growth = useMemo(() => computeGrowth(diaries), [diaries]);
  const suggestion = useMemo(() => nextStep(diaries), [diaries]);

  const stale = useMemo(
    () => sorted.filter((d) => Date.now() - d.updatedAt * 1000 > STALE_DAYS * DAY),
    [sorted],
  );

  const zones = useMemo(() => {
    const counts = new Map<ZoneId, number>();
    for (const plant of plants) counts.set(plant.zone, (counts.get(plant.zone) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [plants]);

  const name = profileLabel(profile, pubkey);
  const latest = sorted[0];
  const latestCover = latest ? (latest.coverImage ?? latest.items.map(firstImage).find(Boolean)) : undefined;
  const showFeedFull = feedExpanded || section === "community";
  const growthPercent = Math.round(
    ((growth.level - 1 + growth.progress) / 6) * 100,
  );

  const header = (
    <header className="sticky top-0 z-20 border-b border-forest-soft/40 bg-forest-deep/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[110rem] items-center gap-4 px-4 py-3 sm:px-8">
        <span
          className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Leaf className="h-5 w-5 text-leaf" aria-hidden />
          WondersLand<span className="text-leaf">.online</span>
        </span>
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSection(id);
                if (id !== "community") setFeedExpanded(false);
              }}
              aria-current={section === id ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors ${
                section === id
                  ? "border border-leaf/25 bg-leaf/10 font-semibold text-cream"
                  : "text-cream/60 hover:text-cream"
              }`}
            >
              <Icon className={`h-4 w-4 ${section === id ? "text-leaf" : "text-cream/50"}`} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto md:ml-0">
          <NostrSignIn />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-3 md:hidden">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSection(id);
              if (id !== "community") setFeedExpanded(false);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs ${
              section === id ? "bg-leaf/10 font-semibold text-cream" : "text-cream/60"
            }`}
          >
            <Icon className="h-3.5 w-3.5 text-leaf" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </header>
  );

  if (showFeedFull) {
    return (
      <div className="flex min-h-screen flex-col bg-forest-deep text-cream">
        {header}
        <main className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-8">
          <h1 className="sr-only">Grow Feed</h1>
          <GrowFeed
            expanded
            onToggleExpand={() => {
              setFeedExpanded(false);
              setSection("garden");
            }}
          />
        </main>
      </div>
    );
  }

  const hero = (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-forest-soft/50 bg-forest shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]">
      <div className="grid items-center gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="relative z-10 p-6 sm:p-9">
          <p className="flex items-center gap-2 text-sm text-cream/70">
            <Sprout className="h-4 w-4 text-leaf" aria-hidden /> Welcome back, {name}
          </p>
          <h2
            className="mt-2 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {diaries.length > 0 ? (
              <>
                Your garden
                <br />
                is <span className="text-leaf">thriving</span>
              </>
            ) : (
              <>
                Your garden
                <br />
                is <span className="text-leaf">waiting</span>
              </>
            )}
          </h2>
          <p className="mt-4 max-w-sm text-sm text-cream/65">
            A cozy space for your grow-diaries, memories, and moments that grow.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enter}
              className="inline-flex items-center gap-2 rounded-xl bg-leaf px-6 py-3 text-sm font-semibold text-forest-deep shadow-lg shadow-leaf/20"
            >
              <Leaf className="h-4 w-4" aria-hidden /> Enter Garden
            </button>
            {writable ? (
              <button
                type="button"
                onClick={() => setComposer({ kind: "create" })}
                className="inline-flex items-center gap-2 rounded-xl border border-forest-soft/60 px-5 py-3 text-sm font-medium text-cream/85"
              >
                + New Diary
              </button>
            ) : (
              <span className="text-xs text-cream/45">
                Read-only session — sign in with an extension or nsec to publish.
              </span>
            )}
          </div>

          {growth.signals.activeDays > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-leaf/25 bg-leaf/10 px-3 py-1.5 text-cream/80">
                <Sprout className="h-3.5 w-3.5 text-leaf" aria-hidden />
                {growth.signals.activeDays} documented{" "}
                {growth.signals.activeDays === 1 ? "day" : "days"}
              </span>
              <span className="text-leaf/80">Keep growing!</span>
            </div>
          ) : null}
        </div>

        <div className="relative min-h-[15rem] lg:min-h-[22rem]">
          <img
            src={heroArt}
            alt="A cozy isometric garden island with a cottage, tree and pond"
            width={1024}
            height={912}
            className="h-full w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-forest via-transparent to-transparent" />
          <div className="absolute right-4 top-4 w-40 rounded-2xl border border-forest-soft/50 bg-forest-deep/85 px-4 py-3 backdrop-blur">
            <p className="flex items-center gap-1.5 text-[0.7rem] text-cream/60">
              <Leaf className="h-3 w-3 text-leaf" aria-hidden /> Gardener Level
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-cream" style={{ fontFamily: "var(--font-display)" }}>
                {growth.level}
              </span>
              <span className="text-xs text-leaf">{growth.stage}</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-forest-soft/50">
              <div
                className="h-full rounded-full bg-leaf"
                style={{ width: `${Math.round(growth.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] text-cream/45">
              {growth.nextStage ? `next: ${growth.nextStage}` : "ecosystem reached"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const cards = (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Garden growth" Icon={Sprout}>
        <div className="flex items-center gap-4">
          <Ring value={growthPercent} />
          <div className="grid gap-1">
            <p className="text-sm text-cream/80">
              {diaries.length > 0 ? "Your garden is thriving." : "Your garden is just starting."}
            </p>
            <p className="text-xs text-cream/55">
              {growth.nextStage
                ? `${growth.pointsToNext} growth points to ${growth.nextStage}.`
                : "Full ecosystem reached."}
            </p>
            <button
              type="button"
              onClick={() => setSection("missions")}
              className="mt-1 justify-self-start rounded-lg border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/80"
            >
              View growth
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Latest diary" Icon={BookOpen}>
        {latest ? (
          <>
            <div className="aspect-[16/7] w-full overflow-hidden rounded-xl bg-forest-deep/70">
              {latestCover ? (
                <img src={latestCover} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-cream/40">No photo yet</div>
              )}
            </div>
            <p className="truncate text-lg font-semibold text-cream" style={{ fontFamily: "var(--font-display)" }}>
              {latest.title}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs text-cream/50">
                {relative(latest.updatedAt)} · {latest.items.length}{" "}
                {latest.items.length === 1 ? "entry" : "entries"}
              </p>
              <button
                type="button"
                onClick={() =>
                  writable ? setComposer({ kind: "entry", diary: latest }) : setSection("diaries")
                }
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/85"
              >
                Open diary <ExternalLink className="h-3 w-3" aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-cream/55">No diaries on your relays yet.</p>
        )}
      </Panel>

      <Panel title="Mission" Icon={Star}>
        <p className="text-sm font-semibold text-cream">{suggestion.title}</p>
        <p className="text-xs text-cream/60">{suggestion.body}</p>
        {stale.length > 0 ? (
          <p className="text-xs text-cream/40">
            {stale.length} {stale.length === 1 ? "diary has" : "diaries have"} been quiet for{" "}
            {STALE_DAYS}+ days. No rush.
          </p>
        ) : null}
        <p className="inline-flex items-center gap-1.5 text-xs text-leaf">
          <Sprout className="h-3.5 w-3.5" aria-hidden /> Real documentation is the only progress here.
        </p>
      </Panel>
    </div>
  );

  const statusItems: { label: string; value: string; Icon: typeof Leaf }[] = [
    {
      label: "Open gardens",
      value: zones.length === 0 ? "0" : zones.map(([z, n]) => `${ZONES[z]?.label ?? z}: ${n}`).join(" · "),
      Icon: Sprout,
    },
    { label: "Relays", value: `diaries ${status} · feed ${feedStatus}`, Icon: Radio },
    { label: "Garden layout", value: gardenStatus, Icon: LayoutGrid },
    {
      label: "Sync health",
      value: gardenError ? gardenError : gardenDirty ? "Unsaved changes" : "In sync",
      Icon: CheckCircle2,
    },
  ];

  const gardenStatusCard = (
    <section className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-cream">
        <Sprout className="h-4 w-4 text-leaf" aria-hidden /> Garden status
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-center">
        {statusItems.map(({ label, value, Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf/10">
              <Icon className="h-4 w-4 text-leaf" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-cream/50">{label}</span>
              <span className="block truncate text-sm text-cream/85">{value}</span>
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={enter}
          className="justify-self-start rounded-xl border border-forest-soft/60 px-4 py-2.5 text-sm text-cream/85 lg:justify-self-end"
        >
          Manage garden
        </button>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-forest-deep text-cream">
      {header}

      <main className="mx-auto w-full max-w-[110rem] px-4 pb-16 pt-6 sm:px-8">
        <h1 className="sr-only">Your WondersLand garden</h1>

        <div className="grid gap-6 lg:grid-cols-[30fr_70fr] lg:items-start">
          {/* Left — compact grow feed (order flips on mobile: garden first) */}
          <div className="order-2 lg:order-1 lg:sticky lg:top-24">
            <GrowFeed expanded={false} onToggleExpand={() => setFeedExpanded(true)} />
          </div>

          {/* Right — the user's own garden dashboard */}
          <div className="order-1 grid gap-6 lg:order-2">
            {section === "diaries" ? (
              <section className="grid gap-3">
                <h2 className="text-sm font-semibold text-cream/80">Your diaries</h2>
                {sorted.length === 0 ? (
                  <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-6 text-sm text-cream/65">
                    {status === "loading"
                      ? "Reading your diaries from the relays…"
                      : "No diaries found on your relays yet."}
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sorted.map((diary) => (
                      <Card
                        key={diary.id}
                        diary={diary}
                        onUpdate={writable ? (d) => setComposer({ kind: "entry", diary: d }) : null}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : section === "missions" ? (
              <>
                {cards}
                <Panel title="Missions" Icon={Sparkles}>
                  <p className="text-sm text-cream/65">
                    Missions grow out of real documentation: new species, entries on real days and
                    completed grows. Nothing here expires and nothing punishes you for being away.
                  </p>
                  <p className="text-xs text-cream/45">
                    {growth.signals.species} species · {growth.signals.activeDays} active days ·{" "}
                    {growth.signals.completed} completed grows
                  </p>
                </Panel>
              </>
            ) : (
              <>
                {hero}
                {cards}
                {gardenStatusCard}
              </>
            )}
          </div>
        </div>
      </main>

      {composer ? <DiaryComposer mode={composer} onClose={() => setComposer(null)} /> : null}
    </div>
  );
}
