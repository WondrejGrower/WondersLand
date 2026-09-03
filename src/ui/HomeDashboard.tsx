import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
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
  EyeOff,
  RotateCcw,
  Plus,
  Pencil,

} from "lucide-react";

import { useNostrStore } from "../state/useNostrStore";
import { useGardenStore } from "../state/useGardenStore";
import { useWorldStore } from "../state/useWorldStore";
import { useFeedStore } from "../state/useFeedStore";
import { profileLabel } from "../nostr/profile";
import { firstImage } from "../nostr/media";
import { ZONES, type ZoneId } from "../garden/zones";
import { GrowClock } from "./GrowClock";
import type { Diary } from "../nostr/types";
import { NostrSignIn } from "./NostrSignIn";
import { DiaryComposer, type ComposerMode } from "./DiaryComposer";
import { GrowFeed } from "./GrowFeed";
import { DiaryDetail } from "./DiaryDetail";
import { useHiddenDiaries } from "../state/useHiddenDiaries";
import { PublishUnlock } from "./PublishUnlock";

import { canPublish, getSigner } from "../nostr/signers";
import { deleteDiary } from "../nostr/writeDiaries";
import { relayHost } from "../nostr/hosts";
import type { PublishResult } from "../nostr/pool";

import { computeGrowth, nextStep } from "../progression/growth";
import heroArt from "../assets/garden-island.png";

/** "accepted by 3 of 4 relays" — never claim more than the relays confirmed. */
function deletionSummary(results: PublishResult[]): string {
  const ok = results.filter((r) => r.ok).length;
  if (results.length === 0) return "no relay was reachable";
  return `deletion accepted by ${ok} of ${results.length} relays`;
}

function deletionReport(results: PublishResult[]): string {
  if (results.length === 0) return "No relay was reachable.";
  const lines = results.map(
    (r) => `${r.ok ? "✓" : "✕"} ${relayHost(r.relay)}${r.ok ? " accepted" : ` — ${r.error ?? "refused"}`}`,
  );
  const refused = results.filter((r) => !r.ok);
  const tail = refused.length
    ? "\nRelays that refuse a deletion keep serving the event. That is how Nostr works — WondersLand cannot force them."
    : "\nEvery relay accepted the request.";
  return lines.join("\n") + tail;
}



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
  onOpen,
  onAddEntry,
  onEdit,
}: {
  diary: Diary;
  onOpen: (diary: Diary) => void;
  onAddEntry: ((diary: Diary) => void) | null;
  onEdit?: ((diary: Diary) => void) | null;
}) {

  const cover = diary.coverImage ?? diary.items.map(firstImage).find(Boolean);
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-forest-soft/50 bg-forest/70 text-left transition-colors hover:border-leaf/40">
      <button
        type="button"
        onClick={() => onOpen(diary)}
        className="block w-full min-w-0 text-left"
        aria-label={`Open diary ${diary.title}`}
      >
        <div className="aspect-[16/10] w-full bg-forest-deep/70">
          {cover ? (
            <img
              src={cover}
              alt={`Cover photo of ${diary.title}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-cream/55">No photo yet</div>
          )}
        </div>
        <div className="grid min-w-0 gap-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-cream">{diary.title}</h3>
            {diary.phase ? (
              <span className="shrink-0 rounded-full bg-leaf/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-leaf">
                {diary.phase}
              </span>
            ) : null}
          </div>
          {subtitle(diary) ? (
            <p className="truncate text-xs text-cream/75">{subtitle(diary)}</p>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cream/60">
            <GrowClock diary={diary} compact />
            <span>
              {diary.items.length} {diary.items.length === 1 ? "entry" : "entries"} · updated{" "}
              {relative(diary.updatedAt)}
            </span>
          </p>
        </div>
      </button>
      {onAddEntry || onEdit ? (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
          {onAddEntry ? (
            <button
              type="button"
              onClick={() => onAddEntry(diary)}
              className="inline-flex min-h-9 items-center rounded-full border border-leaf/40 px-3 py-1 text-xs font-medium text-leaf"
            >
              Add entry
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(diary)}
              aria-label={`Edit diary ${diary.title}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-forest-soft/60 px-3 py-1 text-xs text-cream/75"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </button>
          ) : null}
        </div>
      ) : null}

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
    <section className="grid min-w-0 content-start gap-3 rounded-2xl border border-forest-soft/50 bg-forest/60 p-4 sm:p-5">
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
  const feedStatus = useFeedStore((s) => s[s.mode].status);
  const enter = useWorldStore((s) => s.enter);
  const method = useNostrStore((s) => s.method);
  const hiddenIds = useHiddenDiaries((s) => s.ids);
  const loadHidden = useHiddenDiaries((s) => s.load);
  const hideDiary = useHiddenDiaries((s) => s.hide);
  const unhideDiary = useHiddenDiaries((s) => s.unhide);
  const removeDiary = useNostrStore((s) => s.removeDiary);
  const [composer, setComposer] = useState<ComposerMode | null>(null);

  const [pendingIntent, setPendingIntent] = useState<ComposerMode | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [missionAdvanced, setMissionAdvanced] = useState(false);

  const [section, setSection] = useState<Section>("garden");
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [openDiaryId, setOpenDiaryId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const writable = canPublish(method);

  useEffect(() => {
    if (pubkey) void loadHidden(pubkey);
  }, [pubkey, loadHidden]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!missionAdvanced) return;
    const id = window.setTimeout(() => setMissionAdvanced(false), 10000);
    return () => window.clearTimeout(id);
  }, [missionAdvanced]);


  const openDiary = (diary: Diary) => {
    setSection("diaries");
    setFeedExpanded(false);
    setOpenDiaryId(diary.id);
  };

  /** Publishing intents funnel through here so read-only never dead-ends. */
  const requestComposer = (mode: ComposerMode) => {
    if (writable) {
      setComposer(mode);
      return;
    }
    setPendingIntent(mode);
    setUnlockOpen(true);
  };

  const handlePublished = (
    diary: Diary,
    kind: ComposerMode["kind"],
    acceptedRelays: number,
  ) => {
    setSection("diaries");
    setFeedExpanded(false);
    setShowHidden(false);
    setOpenDiaryId(diary.id);
    // `sorted` still holds the pre-publish list in this closure, so an empty
    // one means this publish is what completed the first-diary mission.
    const firstDiary = kind === "create" && sorted.length === 0;
    if (firstDiary) setMissionAdvanced(true);
    const relays = acceptedRelays === 1 ? "1 relay" : `${acceptedRelays} relays`;
    setToast(
      firstDiary
        ? "✓ First diary created — next: add your first entry"
        : kind === "entry"
          ? `Entry published · ${relays}`
          : kind === "edit"
            ? `Diary updated · ${relays}`
            : `Published to Nostr · ${relays}`,
    );
  };


  /** Permanent removal: NIP-09 deletion request + local state/cache cleanup. */
  const handleDelete = async (diary: Diary) => {
    const signer = getSigner(method);
    if (!signer) throw new Error("Unlock publishing first");
    const results = await deleteDiary(signer, diary);
    await removeDiary(diary.id);
    await unhideDiary(diary.id);
    setOpenDiaryId(null);
    setShowHidden(false);
    setToast(`Diary deleted — ${deletionSummary(results)}`);
  };

  /**
   * Relays may ignore a deletion request. This asks them again without touching
   * local state, and reports what each relay answered.
   */
  const handleResendDelete = async (diary: Diary) => {
    const signer = getSigner(method);
    if (!signer) throw new Error("Unlock publishing first");
    const results = await deleteDiary(signer, diary);
    return deletionReport(results);
  };








  const all = useMemo(() => [...diaries].sort((a, b) => b.updatedAt - a.updatedAt), [diaries]);
  const sorted = useMemo(() => all.filter((d) => !hiddenIds.includes(d.id)), [all, hiddenIds]);
  const hiddenList = useMemo(() => all.filter((d) => hiddenIds.includes(d.id)), [all, hiddenIds]);
  const growth = useMemo(() => computeGrowth(sorted), [sorted]);
  const suggestion = useMemo(() => nextStep(sorted), [sorted]);

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
  const opened = openDiaryId ? all.find((d) => d.id === openDiaryId) : undefined;
  const latestCover = latest ? (latest.coverImage ?? latest.items.map(firstImage).find(Boolean)) : undefined;

  const showFeedFull = feedExpanded || section === "community";
  const growthPercent = Math.round(
    ((growth.level - 1 + growth.progress) / 6) * 100,
  );

  const header = (
    <header className="sticky top-0 z-20 border-b border-forest-soft/40 bg-forest-deep/85 backdrop-blur">
      <div className="mx-auto flex w-full min-w-0 max-w-[110rem] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-8">
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
                setOpenDiaryId(null);
                if (id !== "community") setFeedExpanded(false);
              }}
              aria-current={section === id ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors ${
                section === id
                  ? "border border-leaf/25 bg-leaf/10 font-semibold text-cream"
                  : "text-cream/75 hover:text-cream"
              }`}
            >
              <Icon className={`h-4 w-4 ${section === id ? "text-leaf" : "text-cream/65"}`} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto md:ml-0">
          <NostrSignIn />
        </div>
      </div>
      <nav className="grid grid-cols-4 gap-1 px-3 pb-3 md:hidden">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSection(id);
              setOpenDiaryId(null);
              if (id !== "community") setFeedExpanded(false);
            }}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[0.7rem] ${
              section === id
                ? "border border-leaf/25 bg-leaf/10 font-semibold text-cream"
                : "text-cream/75"
            }`}
          >
            <Icon className="h-4 w-4 text-leaf" aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );

  if (showFeedFull) {
    return (
      <div className="flex min-h-screen flex-col bg-forest-deep text-cream">
        {header}
        <main className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-8">
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
      <div className="grid min-w-0 items-center gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="relative z-10 min-w-0 p-5 sm:p-9">
          <p className="flex items-center gap-2 text-sm text-cream/70">
            <Sprout className="h-4 w-4 text-leaf" aria-hidden /> Welcome back, {name}
          </p>
          <h2
            className="mt-2 text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {sorted.length > 0 ? (
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
          <p className="mt-4 max-w-sm text-sm text-cream/80">
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
            <button
              type="button"
              onClick={() => requestComposer({ kind: "create" })}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-forest-soft/60 px-5 py-3 text-sm font-medium text-cream/85"
            >
              + New Diary
            </button>

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

        <div className="relative min-w-0 min-h-[13rem] sm:min-h-[15rem] lg:min-h-[22rem]">
          <img
            src={heroArt}
            alt="A cozy isometric garden island with a cottage, tree and pond"
            width={1024}
            height={912}
            className="h-full w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-forest via-transparent to-transparent" />
          <div className="absolute right-3 top-3 w-[8.5rem] rounded-2xl border border-forest-soft/50 bg-forest-deep/85 px-3 py-2.5 backdrop-blur sm:right-4 sm:top-4 sm:w-40 sm:px-4 sm:py-3">
            <p className="flex items-center gap-1.5 text-[0.7rem] text-cream/75">
              <Leaf className="h-3 w-3 text-leaf" aria-hidden /> Gardener Level
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-cream sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
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
            <p className="mt-1.5 text-[0.65rem] text-cream/60">
              {growth.nextStage ? `next: ${growth.nextStage}` : "ecosystem reached"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const cards = (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <Panel title="Garden growth" Icon={Sprout}>
        <div className="flex items-center gap-4">
          <Ring value={growthPercent} />
          <div className="grid gap-1">
            <p className="text-sm text-cream/80">
              {sorted.length > 0 ? "Your garden is thriving." : "Your garden is just starting."}
            </p>
            <p className="text-xs text-cream/70">
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
                <div className="grid h-full place-items-center text-xs text-cream/55">No photo yet</div>
              )}
            </div>
            <p className="truncate text-lg font-semibold text-cream" style={{ fontFamily: "var(--font-display)" }}>
              {latest.title}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cream/65">
                <GrowClock diary={latest} />
                <span className="truncate">
                  {relative(latest.updatedAt)} · {latest.items.length}{" "}
                  {latest.items.length === 1 ? "entry" : "entries"}
                </span>
              </p>
              <span className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => requestComposer({ kind: "edit", diary: latest })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/85"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => openDiary(latest)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/85"
                >
                  Open diary <ExternalLink className="h-3 w-3" aria-hidden />
                </button>
              </span>

            </div>
          </>
        ) : (
          <p className="text-sm text-cream/70">No diaries on your relays yet.</p>
        )}
      </Panel>

      <Panel title="Mission" Icon={Star}>
        {missionAdvanced ? (
          <p className="rounded-xl border border-leaf/40 bg-leaf/10 px-2.5 py-2 text-xs font-semibold text-leaf">
            ✓ First diary created — mission complete
          </p>
        ) : null}
        <p className="text-sm font-semibold text-cream">
          {missionAdvanced ? `Next: ${suggestion.title}` : suggestion.title}
        </p>
        <p className="text-xs text-cream/75">{suggestion.body}</p>

        {stale.length > 0 ? (
          <p className="text-xs text-cream/55">
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
    <section className="min-w-0 rounded-2xl border border-forest-soft/50 bg-forest/60 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-cream">
        <Sprout className="h-4 w-4 text-leaf" aria-hidden /> Garden status
      </h3>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-center">
        {statusItems.map(({ label, value, Icon }) => (
          <div key={label} className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf/10">
              <Icon className="h-4 w-4 text-leaf" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-cream/65">{label}</span>
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

      <main className="mx-auto w-full min-w-0 max-w-[110rem] px-4 pb-16 pt-6 sm:px-8">
        <h1 className="sr-only">Your WondersLand garden</h1>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[30fr_70fr] lg:items-start">
          {/* Left — compact grow feed (order flips on mobile: garden first) */}
          <div className="order-2 min-w-0 lg:order-1 lg:sticky lg:top-24">
            <GrowFeed expanded={false} onToggleExpand={() => setFeedExpanded(true)} />
          </div>

          {/* Right — the user's own garden dashboard */}
          <div className="order-1 grid min-w-0 gap-6 lg:order-2">
            {section === "diaries" && opened ? (
              <DiaryDetail
                diary={opened}
                writable={writable}
                hidden={hiddenIds.includes(opened.id)}
                onBack={() => setOpenDiaryId(null)}
                onAddEntry={(d) => requestComposer({ kind: "entry", diary: d })}
                onEdit={(d) => requestComposer({ kind: "edit", diary: d })}
                onHide={(d) => {
                  void hideDiary(d.id);
                  setOpenDiaryId(null);
                  setShowHidden(false);
                }}
                onUnhide={(d) => void unhideDiary(d.id)}
                onUnlock={(d) => requestComposer({ kind: "entry", diary: d })}
                onDelete={handleDelete}
                onResendDelete={handleResendDelete}

              />
            ) : section === "diaries" ? (
              <section className="grid min-w-0 gap-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-cream/80">
                    {showHidden ? "Hidden diaries" : "Your diaries"}
                  </h2>
                  {showHidden ? (
                    <button
                      type="button"
                      onClick={() => setShowHidden(false)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/85"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to diaries
                    </button>
                  ) : hiddenList.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowHidden(true)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-forest-soft/60 px-3 py-1.5 text-xs text-cream/75"
                    >
                      <EyeOff className="h-3.5 w-3.5" aria-hidden /> Hidden diaries ({hiddenList.length})
                    </button>
                  ) : null}
                </div>

                {showHidden ? null : (
                  <div className="grid min-w-0 gap-2">
                    <button
                      type="button"
                      onClick={() => requestComposer({ kind: "create" })}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-5 py-3 text-sm font-semibold text-forest-deep shadow-lg shadow-leaf/20 sm:w-fit"
                    >
                      <Plus className="h-4 w-4" aria-hidden /> New diary
                    </button>
                    {!writable ? (
                      <p className="text-xs text-cream/65">
                        Read-only session — you&rsquo;ll be asked to unlock publishing first.
                      </p>
                    ) : null}
                  </div>
                )}


                {showHidden ? (
                  <>
                    <p className="text-xs text-cream/65">
                      Hidden only in WondersLand on this device — nothing was deleted from Nostr.
                    </p>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {hiddenList.map((diary) => (
                        <div key={diary.id} className="grid min-w-0 gap-2">
                          <Card diary={diary} onOpen={openDiary} onAddEntry={null} />
                          <button
                            type="button"
                            onClick={() => void unhideDiary(diary.id)}
                            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-leaf/40 px-4 py-2.5 text-sm font-medium text-leaf"
                          >
                            <RotateCcw className="h-4 w-4" aria-hidden /> Restore diary
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : sorted.length === 0 ? (
                  <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-6 text-sm text-cream/80">
                    {status === "loading"
                      ? "Reading your diaries from the relays…"
                      : hiddenList.length > 0
                        ? "All of your diaries are hidden on this device."
                        : "No diaries found on your relays yet."}
                  </p>
                ) : (
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sorted.map((diary) => (
                      <Card
                        key={diary.id}
                        diary={diary}
                        onOpen={openDiary}
                        onAddEntry={(d) => requestComposer({ kind: "entry", diary: d })}
                        onEdit={(d) => requestComposer({ kind: "edit", diary: d })}

                      />
                    ))}
                  </div>
                )}
              </section>

            ) : section === "missions" ? (
              <>
                {cards}
                <Panel title="Missions" Icon={Sparkles}>
                  <p className="text-sm text-cream/80">
                    Missions grow out of real documentation: new species, entries on real days and
                    completed grows. Nothing here expires and nothing punishes you for being away.
                  </p>
                  <p className="text-xs text-cream/60">
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

      {composer ? (
        <DiaryComposer
          mode={composer}
          onClose={() => setComposer(null)}
          onPublished={handlePublished}
        />
      ) : null}

      {unlockOpen ? (
        <PublishUnlock
          onUnlocked={() => {
            setUnlockOpen(false);
            if (pendingIntent) setComposer(pendingIntent);
            setPendingIntent(null);
          }}
          onClose={() => {
            setUnlockOpen(false);
            setPendingIntent(null);
          }}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
        >
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-leaf/40 bg-forest-deep/95 px-4 py-2.5 text-sm text-cream shadow-2xl backdrop-blur">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-leaf" aria-hidden />
            <span className="truncate">{toast}</span>
          </p>
        </div>
      ) : null}
    </div>

  );
}
