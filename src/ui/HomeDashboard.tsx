import { useMemo } from "react";
import { useNostrStore } from "../state/useNostrStore";
import { useGardenStore } from "../state/useGardenStore";
import { useWorldStore } from "../state/useWorldStore";
import { profileLabel } from "../nostr/profile";
import { firstImage } from "../nostr/media";
import { ZONES, type ZoneId } from "../garden/zones";
import type { Diary } from "../nostr/types";
import { NostrSignIn } from "./NostrSignIn";

const DAY = 86_400_000;
const STALE_DAYS = 14;

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

function Card({ diary }: { diary: Diary }) {
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
      </div>
    </article>
  );
}

/**
 * Signed-in Home. The 3D world is one destination inside the client, not the
 * whole app. Everything here is derived from diaries already in the stores —
 * no new fetching, no new event kinds.
 */
export function HomeDashboard() {
  const profile = useNostrStore((s) => s.profile);
  const pubkey = useNostrStore((s) => s.pubkey);
  const diaries = useNostrStore((s) => s.diaries);
  const status = useNostrStore((s) => s.status);
  const plants = useGardenStore((s) => s.plants);
  const gardenStatus = useGardenStore((s) => s.status);
  const enter = useWorldStore((s) => s.enter);

  const sorted = useMemo(() => [...diaries].sort((a, b) => b.updatedAt - a.updatedAt), [diaries]);

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

  return (
    <div className="min-h-screen bg-forest-deep text-cream">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <span
          className="text-base font-semibold tracking-tight sm:text-lg"
          style={{ fontFamily: "var(--font-display)" }}
        >
          WondersLand<span className="text-leaf">.online</span>
        </span>
        <NostrSignIn />
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 sm:px-6">
        <h1 className="sr-only">Your WondersLand garden</h1>

        {/* Hero: enter the garden */}
        <section className="overflow-hidden rounded-[1.75rem] border border-forest-soft/50 bg-forest p-6 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)] sm:p-8">
          <p className="text-sm text-cream/60">Welcome back, {name}</p>
          <p
            className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {diaries.length > 0
              ? `${diaries.length} ${diaries.length === 1 ? "diary" : "diaries"} growing in your garden`
              : "Your garden is waiting for its first plant"}
          </p>
          <button
            type="button"
            onClick={enter}
            className="mt-5 inline-flex items-center gap-3 rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-forest-deep shadow-lg shadow-leaf/20 sm:text-base"
          >
            <span aria-hidden="true">▶</span> Enter My Garden
          </button>
        </section>

        {/* Today in your Garden — calm, factual, never urgent */}
        {(stale.length > 0 || sorted[0]) && (
          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-cream/80">Today in your Garden</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {stale.length > 0 && (
                <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-4 text-sm text-cream/70">
                  {stale.length} {stale.length === 1 ? "diary has" : "diaries have"} no entry in the
                  last {STALE_DAYS} days. Whenever you have news, they are here.
                </p>
              )}
              {sorted[0] && (
                <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-4 text-sm text-cream/70">
                  Latest update: <span className="text-cream">{sorted[0].title}</span>
                  {sorted[0].phase ? ` — ${sorted[0].phase}` : ""}, {relative(sorted[0].updatedAt)}.
                </p>
              )}
            </div>
          </section>
        )}

        {/* Diaries */}
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-cream/80">Your diaries</h2>
          {sorted.length === 0 ? (
            <p className="rounded-2xl border border-forest-soft/50 bg-forest/60 p-6 text-sm text-cream/65">
              {status === "loading"
                ? "Reading your diaries from the relays…"
                : "No diaries found on your relays yet. Everything here grows from what you document."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((diary) => (
                <Card key={diary.id} diary={diary} />
              ))}
            </div>
          )}
        </section>

        {/* Garden status */}
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-cream/80">Garden status</h2>
          <div className="grid gap-3 rounded-2xl border border-forest-soft/50 bg-forest/60 p-4 text-sm text-cream/70 sm:grid-cols-2">
            <div className="grid gap-1">
              {zones.length === 0 ? (
                <span className="text-cream/50">No plants placed yet.</span>
              ) : (
                zones.map(([zone, count]) => (
                  <span key={zone}>
                    {ZONES[zone]?.label ?? zone}: {count}
                  </span>
                ))
              )}
            </div>
            <div className="grid gap-1 text-cream/50">
              <span>Relays: {status}</span>
              <span>Garden layout: {gardenStatus}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
