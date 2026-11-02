// WondersLand 2D grow-diary client. Pure DOM: no Three.js, canvas or world
// modules are imported from here (directly or through shared modules).
import { useEffect, useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Compass,
  EyeOff,
  Leaf,
  Plus,
  Radio,
  Search,
  User,
  X,
} from "lucide-react";
import { useNostrStore } from "../state/useNostrStore";
import { useWorldStore } from "../state/useWorldStore";
import { useHiddenDiaries } from "../state/useHiddenDiaries";
import { profileLabel, fetchProfile } from "../nostr/profile";
import { firstImage } from "../nostr/media";
import { fetchCommunityDiaries } from "../nostr/diaries";
import { canPublish, getSigner } from "../nostr/signers";
import { deleteDiary } from "../nostr/writeDiaries";
import { relayHost } from "../nostr/hosts";
import { addRelay, getRelays, loadRelays, setRelayEnabled, type Relay } from "../nostr/relays";
import type { PublishResult } from "../nostr/pool";
import type { Diary, Profile } from "../nostr/types";
import { NostrSignIn } from "./NostrSignIn";
import { GrowFeed } from "./GrowFeed";
import { DiaryDetail } from "./DiaryDetail";
import { DiaryComposer, type ComposerMode } from "./DiaryComposer";
import { PublishUnlock } from "./PublishUnlock";
import { GrowClock } from "./GrowClock";
import { MilestoneCard } from "./MilestoneCard";
import { ReviewerPanel } from "./ReviewerPanel";
import { TasksBoard } from "../features/tasks/TasksBoard";

type Section = "explore" | "diaries" | "profile";
const NAV: { id: Section; label: string; Icon: typeof Leaf }[] = [
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "diaries", label: "My Diaries", Icon: BookOpen },
  { id: "profile", label: "Profile", Icon: User },
];

/* ------------------------------------------------------------ phase filter */

export type PhaseBucket = "seedling" | "vegetative" | "flowering" | "harvested";
const BUCKETS: { id: PhaseBucket; label: string }[] = [
  { id: "seedling", label: "Seedling" },
  { id: "vegetative", label: "Vegetative" },
  { id: "flowering", label: "Flowering" },
  { id: "harvested", label: "Harvested" },
];

/** Map free-text diary phases to a filter bucket; unknown phases stay unbucketed. */
export function phaseBucket(phase: string | undefined): PhaseBucket | null {
  const p = (phase ?? "").toLowerCase();
  if (!p) return null;
  if (/germ|seedl|sprout/.test(p)) return "seedling";
  if (/veg/.test(p)) return "vegetative";
  if (/flower|bloom/.test(p)) return "flowering";
  if (/harvest|dry|cur|finish/.test(p)) return "harvested";
  return null;
}

export function matchesQuery(diary: Diary, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [diary.title, diary.plant, diary.species, diary.cultivar, diary.breeder, diary.phase]
    .filter(Boolean)
    .some((v) => v!.toLowerCase().includes(needle));
}

function useFiltered(diaries: Diary[]) {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<PhaseBucket | "all">("all");
  const represented = useMemo(
    () => BUCKETS.filter((b) => diaries.some((d) => phaseBucket(d.phase) === b.id)),
    [diaries],
  );
  const filtered = useMemo(
    () =>
      diaries.filter(
        (d) => matchesQuery(d, query) && (bucket === "all" || phaseBucket(d.phase) === bucket),
      ),
    [diaries, query, bucket],
  );
  const reset = () => {
    setQuery("");
    setBucket("all");
  };
  return { query, setQuery, bucket, setBucket, represented, filtered, reset, active: query !== "" || bucket !== "all" };
}

function FilterBar({ f, label }: { f: ReturnType<typeof useFiltered>; label: string }) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50" aria-hidden />
        <input
          type="search"
          value={f.query}
          onChange={(e) => f.setQuery(e.target.value)}
          placeholder="Search title, cultivar, breeder…"
          className="min-h-11 w-full rounded-xl border border-forest-soft bg-forest pl-9 pr-3 text-sm text-cream placeholder:text-cream/45"
        />
      </label>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Filter by phase">
        {[{ id: "all" as const, label: "All" }, ...f.represented].map((b) => (
          <button
            key={b.id}
            type="button"
            aria-pressed={f.bucket === b.id}
            onClick={() => f.setBucket(b.id)}
            className={`min-h-9 rounded-full border px-3 text-xs font-medium ${
              f.bucket === b.id
                ? "border-leaf bg-leaf text-forest-deep"
                : "border-forest-soft bg-forest text-cream/80 hover:text-cream"
            }`}
          >
            {b.label}
          </button>
        ))}
        {f.active ? (
          <button type="button" onClick={f.reset} className="min-h-9 px-2 text-xs text-leaf underline-offset-2 hover:underline">
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ cards */

function relative(seconds: number): string {
  const days = Math.floor((Date.now() - seconds * 1000) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? "a month ago" : `${months} months ago`;
}

function DiaryCard({ diary, grower, onOpen }: { diary: Diary; grower?: string; onOpen: (d: Diary) => void }) {
  const cover = diary.coverImage ?? diary.items.map(firstImage).find(Boolean);
  const sub = [diary.cultivar, diary.plant ?? diary.species, diary.breeder].filter(Boolean).join(" · ");
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-forest-soft/70 bg-forest shadow-sm transition-shadow hover:shadow-md">
      <button type="button" onClick={() => onOpen(diary)} className="block w-full min-w-0 text-left" aria-label={`Open diary ${diary.title}`}>
        <div className="aspect-[4/3] w-full bg-forest-deep">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-cream/50">No photo yet</div>
          )}
        </div>
        <div className="grid min-w-0 gap-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-cream" style={{ fontFamily: "var(--font-display)" }}>
              {diary.title}
            </h3>
            {diary.phase ? (
              <span className="shrink-0 rounded-full bg-leaf/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-leaf">
                {diary.phase}
              </span>
            ) : null}
          </div>
          {grower ? <p className="truncate text-xs font-medium text-cream/75">{grower}</p> : null}
          {sub ? <p className="truncate text-xs text-cream/65">{sub}</p> : null}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cream/60">
            <GrowClock diary={diary} compact />
            <span>
              {diary.items.length} {diary.items.length === 1 ? "update" : "updates"} · {relative(diary.updatedAt)}
            </span>
          </p>
        </div>
      </button>
    </article>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-forest-soft/70 bg-forest p-5 text-sm text-cream/75">{children}</p>;
}

function SignInPrompt({ text }: { text: string }) {
  return (
    <div className="grid min-w-0 gap-3 rounded-2xl border border-forest-soft/70 bg-forest p-6">
      <p className="text-sm text-cream/80">{text}</p>
      <p className="text-xs text-cream/60">Use the Sign in button at the top. A browser extension (NIP-07) is recommended; you can also view an npub read-only.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- explore */

function shortNpub(pubkey: string): string {
  try {
    const n = nip19.npubEncode(pubkey);
    return `${n.slice(0, 10)}…${n.slice(-4)}`;
  } catch {
    return `${pubkey.slice(0, 8)}…`;
  }
}

function Explore({ onOpen, profiles }: { onOpen: (d: Diary) => void; profiles: Record<string, Profile> }) {
  const [tab, setTab] = useState<"diaries" | "posts">("diaries");
  const [diaries, setDiaries] = useState<Diary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadProfiles = useProfilesLoader();
  const f = useFiltered(diaries ?? []);

  useEffect(() => {
    let alive = true;
    setDiaries(null);
    setError(null);
    loadRelays()
      .then(() => fetchCommunityDiaries())
      .then((list) => {
        if (!alive) return;
        setDiaries(list);
        loadProfiles(list.map((d) => d.authorPubkey));
      })
      .catch(() => {
        if (!alive) return;
        setDiaries([]);
        setError("The relays did not answer. Check your connection or relay settings in Profile.");
      });
    return () => {
      alive = false;
    };
  }, [attempt, loadProfiles]);

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cream sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Explore
          </h1>
          <p className="text-sm text-cream/70">Grow diaries and updates from growers on Nostr.</p>
        </div>
        <div role="tablist" aria-label="Explore view" className="flex rounded-full border border-forest-soft bg-forest p-0.5">
          {(["diaries", "posts"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`min-h-9 rounded-full px-4 text-sm ${tab === t ? "bg-leaf text-forest-deep font-semibold" : "text-cream/75"}`}
            >
              {t === "diaries" ? "Diaries" : "Grow posts"}
            </button>
          ))}
        </div>
      </div>

      {tab === "posts" ? (
        <GrowFeed expanded />
      ) : (
        <>
          <FilterBar f={f} label="Search community diaries" />
          {diaries === null ? (
            <Note>Reading public diaries from your relays…</Note>
          ) : error ? (
            <div className="grid gap-2">
              <Note>{error}</Note>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-10 w-fit rounded-xl border border-leaf/50 px-4 text-sm font-medium text-leaf">
                Try again
              </button>
            </div>
          ) : diaries.length === 0 ? (
            <Note>Your relays returned no public grow diaries right now. Try Grow posts, or add a relay in Profile.</Note>
          ) : f.filtered.length === 0 ? (
            <Note>No diaries match these filters.</Note>
          ) : (
            <Grid>
              {f.filtered.map((d) => (
                <DiaryCard
                  key={`${d.authorPubkey}:${d.id}`}
                  diary={d}
                  grower={profileLabel(profiles[d.authorPubkey] ?? null, d.authorPubkey) || shortNpub(d.authorPubkey)}
                  onOpen={onOpen}
                />
              ))}
            </Grid>
          )}
        </>
      )}
    </div>
  );
}

/* Profiles for community authors, fetched once per pubkey. */
const profileCache: Record<string, Profile> = {};
let profileListener: ((p: Record<string, Profile>) => void) | null = null;
function useProfilesLoader() {
  return useMemo(
    () => (pubkeys: string[]) => {
      const todo = [...new Set(pubkeys)].filter((p) => !profileCache[p]).slice(0, 24);
      for (const pk of todo) {
        profileCache[pk] = { pubkey: pk };
        void fetchProfile(pk)
          .then((p) => {
            profileCache[pk] = p;
            profileListener?.({ ...profileCache });
          })
          .catch(() => undefined);
      }
    },
    [],
  );
}

/* ---------------------------------------------------------------- profile */

function RelaySettings() {
  const [relays, setRelays] = useState<Relay[]>(() => getRelays());
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void loadRelays().then(() => setRelays(getRelays()));
  }, []);
  return (
    <section className="grid min-w-0 gap-3 rounded-2xl border border-forest-soft/70 bg-forest p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-cream">
        <Radio className="h-4 w-4 text-leaf" aria-hidden /> Relays
      </h2>
      <p className="text-xs text-cream/65">Where WondersLand reads and publishes. Changes apply on the next refresh of a feed.</p>
      <ul className="grid gap-1.5">
        {relays.map((r) => (
          <li key={r.url} className="flex min-w-0 items-center justify-between gap-3">
            <span className="truncate text-sm text-cream/85">{relayHost(r.url)}</span>
            <label className="inline-flex shrink-0 items-center gap-2 text-xs text-cream/70">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => {
                  setRelayEnabled(r.url, e.target.checked);
                  setRelays(getRelays());
                }}
                className="h-4 w-4 accent-[var(--leaf)]"
              />
              Enabled
            </label>
          </li>
        ))}
      </ul>
      <form
        className="flex min-w-0 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          try {
            addRelay(url);
            setUrl("");
            setRelays(getRelays());
          } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid relay URL");
          }
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Relay address</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://relay.example"
            className="min-h-10 w-full rounded-xl border border-forest-soft bg-forest-deep px-3 text-sm text-cream"
          />
        </label>
        <button type="submit" className="min-h-10 rounded-xl border border-leaf/50 px-4 text-sm font-medium text-leaf">
          Add
        </button>
      </form>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}

function ProfilePage({ diaries }: { diaries: Diary[] }) {
  const pubkey = useNostrStore((s) => s.pubkey);
  const profile = useNostrStore((s) => s.profile);
  const method = useNostrStore((s) => s.method);
  const openTasks = useWorldStore((s) => s.openTasks);
  const [copied, setCopied] = useState(false);
  const npub = pubkey ? nip19.npubEncode(pubkey) : "";

  return (
    <div className="grid min-w-0 gap-5">
      <h1 className="text-2xl font-semibold text-cream sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
        Profile
      </h1>
      {!pubkey ? (
        <SignInPrompt text="Sign in with Nostr to see your grower profile, private Garden Board and milestones." />
      ) : (
        <>
          <section className="flex min-w-0 items-start gap-4 rounded-2xl border border-forest-soft/70 bg-forest p-5">
            {profile?.picture ? (
              <img src={profile.picture} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-leaf/15 text-leaf">
                <User className="h-7 w-7" aria-hidden />
              </div>
            )}
            <div className="grid min-w-0 gap-1">
              <p className="text-lg font-semibold text-cream">{profileLabel(profile, pubkey)}</p>
              {profile?.about ? <p className="whitespace-pre-wrap text-sm text-cream/75">{profile.about}</p> : null}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(npub).then(() => setCopied(true));
                }}
                className="w-fit max-w-full truncate text-left text-xs text-cream/60 hover:text-cream"
                aria-label="Copy npub"
              >
                {copied ? "Copied" : `${npub.slice(0, 16)}…${npub.slice(-6)}`}
              </button>
              <p className="text-xs text-cream/60">
                {canPublish(method) ? "Can publish from this tab" : "Read-only session — unlock publishing when you add or edit a diary."}
                {" · "}
                {diaries.length} {diaries.length === 1 ? "diary" : "diaries"}
              </p>
            </div>
          </section>

          <section className="grid min-w-0 gap-2 rounded-2xl border border-forest-soft/70 bg-forest p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-cream">
              <ClipboardList className="h-4 w-4 text-leaf" aria-hidden /> Garden Board
            </h2>
            <p className="text-xs text-cream/65">Private tasks, habits and timers. Encrypted to yourself; never shown in Explore.</p>
            <button type="button" onClick={openTasks} className="min-h-10 w-fit rounded-xl border border-leaf/50 px-4 text-sm font-medium text-leaf">
              Open Garden Board
            </button>
          </section>

          <MilestoneCard diaries={diaries} />
          <ReviewerPanel />
        </>
      )}
      <RelaySettings />
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

function deletionSummary(results: PublishResult[]): string {
  const ok = results.filter((r) => r.ok).length;
  if (results.length === 0) return "no relay was reachable";
  return `deletion accepted by ${ok} of ${results.length} relays`;
}
function deletionReport(results: PublishResult[]): string {
  if (results.length === 0) return "No relay was reachable.";
  const lines = results.map((r) => `${r.ok ? "✓" : "✕"} ${relayHost(r.relay)}${r.ok ? " accepted" : ` — ${r.error ?? "refused"}`}`);
  const tail = results.some((r) => !r.ok)
    ? "\nRelays that refuse a deletion keep serving the event. That is how Nostr works — WondersLand cannot force them."
    : "\nEvery relay accepted the request.";
  return lines.join("\n") + tail;
}

export function AppShell() {
  const pubkey = useNostrStore((s) => s.pubkey);
  const profile = useNostrStore((s) => s.profile);
  const diaries = useNostrStore((s) => s.diaries);
  const status = useNostrStore((s) => s.status);
  const method = useNostrStore((s) => s.method);
  const removeDiary = useNostrStore((s) => s.removeDiary);
  const hiddenIds = useHiddenDiaries((s) => s.ids);
  const loadHidden = useHiddenDiaries((s) => s.load);
  const hideDiary = useHiddenDiaries((s) => s.hide);
  const unhideDiary = useHiddenDiaries((s) => s.unhide);
  const writable = canPublish(method);

  const [section, setSection] = useState<Section>("explore");
  const [openOwn, setOpenOwn] = useState<string | null>(null);
  const [openCommunity, setOpenCommunity] = useState<Diary | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [composer, setComposer] = useState<ComposerMode | null>(null);
  const [pendingIntent, setPendingIntent] = useState<ComposerMode | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    profileListener = setProfiles;
    return () => {
      profileListener = null;
    };
  }, []);
  useEffect(() => {
    if (pubkey) void loadHidden(pubkey);
  }, [pubkey, loadHidden]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);
  // Signing out returns to public browsing; never keep a stale owner view.
  useEffect(() => {
    setOpenOwn(null);
    setComposer(null);
    setShowHidden(false);
  }, [pubkey]);

  const all = useMemo(() => [...diaries].sort((a, b) => b.updatedAt - a.updatedAt), [diaries]);
  const visible = useMemo(() => all.filter((d) => !hiddenIds.includes(d.id)), [all, hiddenIds]);
  const hiddenList = useMemo(() => all.filter((d) => hiddenIds.includes(d.id)), [all, hiddenIds]);
  const own = useFiltered(showHidden ? hiddenList : visible);
  const opened = openOwn ? all.find((d) => d.id === openOwn) : undefined;

  const go = (id: Section) => {
    setSection(id);
    setOpenOwn(null);
    setOpenCommunity(null);
    window.scrollTo({ top: 0 });
  };

  const requestComposer = (mode: ComposerMode) => {
    if (writable) return setComposer(mode);
    setPendingIntent(mode);
    setUnlockOpen(true);
  };

  const openFromExplore = (d: Diary) => {
    if (pubkey && d.authorPubkey === pubkey && all.some((x) => x.id === d.id)) {
      setSection("diaries");
      setOpenOwn(d.id);
    } else setOpenCommunity(d);
    window.scrollTo({ top: 0 });
  };

  const handleDelete = async (diary: Diary) => {
    const signer = getSigner(method);
    if (!signer) throw new Error("Unlock publishing first");
    const results = await deleteDiary(signer, diary);
    await removeDiary(diary.id);
    await unhideDiary(diary.id);
    setOpenOwn(null);
    setShowHidden(false);
    setToast(`Diary deleted — ${deletionSummary(results)}`);
  };
  const handleResendDelete = async (diary: Diary) => {
    const signer = getSigner(method);
    if (!signer) throw new Error("Unlock publishing first");
    return deletionReport(await deleteDiary(signer, diary));
  };

  let body: React.ReactNode;
  if (openCommunity) {
    body = (
      <DiaryDetail
        diary={openCommunity}
        owner={false}
        grower={profileLabel(profiles[openCommunity.authorPubkey] ?? null, openCommunity.authorPubkey)}
        writable={false}
        hidden={false}
        onBack={() => setOpenCommunity(null)}
        onAddEntry={() => undefined}
        onEdit={() => undefined}
        onHide={() => undefined}
        onUnhide={() => undefined}
        onUnlock={() => undefined}
        onDelete={async () => undefined}
        onResendDelete={async () => ""}
      />
    );
  } else if (section === "explore") {
    body = <Explore onOpen={openFromExplore} profiles={profiles} />;
  } else if (section === "profile") {
    body = <ProfilePage diaries={visible} />;
  } else if (opened) {
    body = (
      <DiaryDetail
        diary={opened}
        grower={profileLabel(profile, pubkey)}
        writable={writable}
        hidden={hiddenIds.includes(opened.id)}
        onBack={() => setOpenOwn(null)}
        onAddEntry={(d) => requestComposer({ kind: "entry", diary: d })}
        onEdit={(d) => requestComposer({ kind: "edit", diary: d })}
        onHide={(d) => {
          void hideDiary(d.id);
          setOpenOwn(null);
          setShowHidden(false);
        }}
        onUnhide={(d) => void unhideDiary(d.id)}
        onUnlock={(d) => requestComposer({ kind: "entry", diary: d })}
        onDelete={handleDelete}
        onResendDelete={handleResendDelete}
      />
    );
  } else {
    body = (
      <div className="grid min-w-0 gap-5">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-cream sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              {showHidden ? "Hidden diaries" : "My Diaries"}
            </h1>
            <p className="text-sm text-cream/70">
              {showHidden ? "Hidden only on this device — nothing was deleted from Nostr." : "Your grows, published to your Nostr relays."}
            </p>
          </div>
          {pubkey && !showHidden ? (
            <button
              type="button"
              onClick={() => requestComposer({ kind: "create" })}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-5 text-sm font-semibold text-forest-deep"
            >
              <Plus className="h-4 w-4" aria-hidden /> New diary
            </button>
          ) : null}
        </div>
        {!pubkey ? (
          <SignInPrompt text="Sign in with Nostr to manage your grow diaries. You can still browse everyone's diaries in Explore." />
        ) : (
          <>
            {!writable ? (
              <p className="text-xs text-cream/65">Read-only session — you&rsquo;ll be asked to unlock publishing before anything is posted.</p>
            ) : null}
            <FilterBar f={own} label="Search my diaries" />
            {status === "loading" && all.length === 0 ? (
              <Note>Reading your diaries from the relays…</Note>
            ) : own.filtered.length === 0 ? (
              <Note>
                {own.active
                  ? "No diaries match these filters."
                  : showHidden
                    ? "No hidden diaries."
                    : "No diaries yet. Start one with New diary — a title is enough."}
              </Note>
            ) : (
              <Grid>
                {own.filtered.map((d) => (
                  <DiaryCard key={d.id} diary={d} onOpen={(x) => setOpenOwn(x.id)} />
                ))}
              </Grid>
            )}
            {showHidden ? (
              <button type="button" onClick={() => setShowHidden(false)} className="min-h-10 w-fit rounded-xl border border-forest-soft px-4 text-sm text-cream/80">
                Back to my diaries
              </button>
            ) : hiddenList.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowHidden(true)}
                className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl px-2 text-xs text-cream/65 hover:text-cream"
              >
                <EyeOff className="h-4 w-4" aria-hidden /> Hidden diaries ({hiddenList.length})
              </button>
            ) : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest-deep pb-24 text-cream md:pb-10">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-forest-soft/70 bg-forest/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => go("explore")} className="flex items-center gap-2 text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            <Leaf className="h-5 w-5 text-leaf" aria-hidden /> WondersLand
          </button>
          <nav aria-label="Main" className="mx-auto hidden items-center gap-1 md:flex">
            {NAV.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={section === id ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm ${
                  section === id ? "bg-leaf/12 font-semibold text-leaf" : "text-cream/75 hover:text-cream"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto md:ml-0">
            <NostrSignIn />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6">
        {body}
      </main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-forest-soft/70 bg-forest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            aria-current={section === id ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] ${
              section === id ? "font-semibold text-leaf" : "text-cream/70"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      <div className="fixed inset-0 z-40 empty:hidden [&:not(:has(*))]:hidden">
        <TasksBoard />
      </div>

      {composer ? <DiaryComposer mode={composer} onClose={() => setComposer(null)} onPublished={(d, kind, n) => {
        setSection("diaries");
        setShowHidden(false);
        setOpenOwn(d.id);
        const relays = n === 1 ? "1 relay" : `${n} relays`;
        setToast(kind === "entry" ? `Update published · ${relays}` : kind === "edit" ? `Diary updated · ${relays}` : `Diary published · ${relays}`);
      }} /> : null}

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
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-leaf/40 bg-forest px-4 py-2.5 text-sm text-cream shadow-xl">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-leaf" aria-hidden />
            <span className="truncate">{toast}</span>
            <button type="button" className="pointer-events-auto" aria-label="Dismiss" onClick={() => setToast(null)}>
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </p>
        </div>
      ) : null}
    </div>
  );
}
