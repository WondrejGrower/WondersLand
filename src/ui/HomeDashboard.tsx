import { useMemo, useState } from "react";
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
import heroArt from "../assets/world-preview.png";

const DAY = 86_400_000;
const STALE_DAYS = 14;

type Section = "garden" | "diaries" | "missions" | "community";

const NAV: { id: Section; label: string }[] = [
  { id: "garden", label: "Garden" },
  { id: "diaries", label: "Diaries" },
  { id: "missions", label: "Missions" },
  { id: "community", label: "Community" },
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-2 rounded-2xl border border-forest-soft/50 bg-forest/60 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/50">{title}</h3>
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
  const showFeedFull = feedExpanded || section === "community";

  const header = (
    <header className="sticky top-0 z-20 border-b border-forest-soft/40 bg-forest-deep/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[110rem] items-center gap-4 px-4 py-3 sm:px-8">
        <span
          className="text-base font-semibold tracking-tight sm:text-lg"
          style={{ fontFamily: "var(--font-display)" }}
        >
          WondersLand<span className="text-leaf">.online</span>
        </span>
        <nav className="mx-auto hidden items-center gap-1 rounded-full border border-forest-soft/40 bg-forest/50 p-1 md:flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                if (item.id !== "community") setFeedExpanded(false);
              }}
              aria-current={section === item.id ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                section === item.id
                  ? "bg-leaf/15 font-semibold text-leaf"
                  : "text-cream/60 hover:text-cream"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto md:ml-0">
          <NostrSignIn />
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-3 md:hidden">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSection(item.id);
              if (item.id !== "community") setFeedExpanded(false);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
              section === item.id ? "bg-leaf/15 font-semibold text-leaf" : "text-cream/60"
            }`}
          >
            {item.label}
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
    <section className="overflow-hidden rounded-[1.75rem] border border-forest-soft/50 bg-forest shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 sm:p-8">
          <p className="text-sm text-cream/60">Welcome back, {name}</p>
          <h2
            className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {diaries.length > 0 ? "Your garden is thriving" : "Your garden is waiting"}
          </h2>
          <p className="mt-3 max-w-md text-sm text-cream/65">
            A cozy space for your grow-diaries, memories, and moments that grow.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enter}
              className="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-forest-deep shadow-lg shadow-leaf/20"
            >
              <span aria-hidden>▶</span> Enter Garden
            </button>
            {writable ? (
              <button
                type="button"
                onClick={() => setComposer({ kind: "create" })}
                className="inline-flex items-center gap-2 rounded-full border border-forest-soft/60 px-5 py-3 text-sm font-medium text-cream/80"
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
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest-soft/30 px-3 py-1 text-xs text-cream/65">
              <span aria-hidden>🌿</span>
              {growth.signals.activeDays} documented{" "}
              {growth.signals.activeDays === 1 ? "day" : "days"} · {growth.signals.species}{" "}
              {growth.signals.species === 1 ? "species" : "species"}
            </p>
          ) : null}
        </div>

        <div className="relative min-h-[13rem]">
          <img
            src={heroArt}
            alt="A cozy isometric view of the WondersLand garden"
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-forest via-forest/25 to-transparent" />
          <div className="absolute right-4 top-4 rounded-2xl border border-forest-soft/50 bg-forest-deep/80 px-4 py-3 text-right backdrop-blur">
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-cream/50">Gardener</p>
            <p className="text-sm font-semibold text-leaf">
              Lv {growth.level} · {growth.stage}
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const cards = (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Garden growth">
        <p className="text-lg font-semibold text-cream">{growth.stage}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-forest-deep/70">
          <div
            className="h-full rounded-full bg-leaf"
            style={{ width: `${Math.round(growth.progress * 100)}%` }}
          />
        </div>
        <p className="text-xs text-cream/55">
          {growth.nextStage
            ? `${growth.pointsToNext} growth points to ${growth.nextStage}`
            : "Full ecosystem — your garden is complete."}
        </p>
        <p className="text-xs text-cream/40">
          Derived from {growth.signals.diaries} diaries · {growth.signals.entries} entries ·{" "}
          {growth.signals.completed} completed
        </p>
      </Panel>

      <Panel title="Latest diary">
        {latest ? (
          <>
            <p className="truncate text-lg font-semibold text-cream">{latest.title}</p>
            <p className="text-xs text-cream/55">
              {subtitle(latest) || "No plant set"}
              {latest.phase ? ` · ${latest.phase}` : ""} · {relative(latest.updatedAt)}
            </p>
            {writable ? (
              <button
                type="button"
                onClick={() => setComposer({ kind: "entry", diary: latest })}
                className="mt-1 justify-self-start rounded-full border border-leaf/40 px-3 py-1 text-xs font-medium text-leaf"
              >
                Add entry
              </button>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-cream/55">No diaries on your relays yet.</p>
        )}
      </Panel>

      <Panel title="Next step">
        <p className="text-lg font-semibold text-cream">{suggestion.title}</p>
        <p className="text-xs text-cream/60">{suggestion.body}</p>
        {stale.length > 0 ? (
          <p className="text-xs text-cream/40">
            {stale.length} {stale.length === 1 ? "diary has" : "diaries have"} been quiet for{" "}
            {STALE_DAYS}+ days. No rush.
          </p>
        ) : null}
      </Panel>
    </div>
  );

  const gardenStatusCard = (
    <section className="grid gap-4 rounded-2xl border border-forest-soft/50 bg-forest/60 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="grid content-start gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/50">
          Open gardens
        </h3>
        {zones.length === 0 ? (
          <span className="text-sm text-cream/50">No plants placed yet.</span>
        ) : (
          zones.map(([zone, count]) => (
            <span key={zone} className="text-sm text-cream/70">
              {ZONES[zone]?.label ?? zone}: {count}
            </span>
          ))
        )}
      </div>
      <div className="grid content-start gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/50">Relays</h3>
        <span className="text-sm text-cream/70">Diaries: {status}</span>
        <span className="text-sm text-cream/70">Feed: {feedStatus}</span>
      </div>
      <div className="grid content-start gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/50">
          Garden layout
        </h3>
        <span className="text-sm text-cream/70">{gardenStatus}</span>
        <span className="text-sm text-cream/50">
          {gardenError ? gardenError : gardenDirty ? "Unsaved changes" : "In sync"}
        </span>
      </div>
      <div className="grid content-start gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/50">Manage</h3>
        <button
          type="button"
          onClick={enter}
          className="justify-self-start rounded-full border border-leaf/40 px-4 py-1.5 text-xs font-medium text-leaf"
        >
          Manage Garden
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
                <Panel title="Missions">
                  <p className="text-sm text-cream/65">
                    Missions grow out of real documentation: new species, entries on real days and
                    completed grows. Nothing here expires and nothing punishes you for being away.
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
