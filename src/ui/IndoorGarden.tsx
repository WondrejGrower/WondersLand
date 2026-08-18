import { useEffect, useMemo, useRef, useState } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { useNostrStore } from "../state/useNostrStore";
import { categorizePlant } from "../garden/categories";
import { firstImage } from "../nostr/media";
import type { Diary } from "../nostr/types";

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The cottage overlay: the signed-in visitor's indoor plant diaries only.
 * Reads the diaries already in the Nostr store — no fetching of its own.
 */
export function IndoorGarden() {
  const open = useWorldStore((s) => s.indoorOpen);
  const close = useWorldStore((s) => s.closeIndoor);
  const diaries = useNostrStore((s) => s.diaries);
  const profile = useNostrStore((s) => s.profile);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const indoor = useMemo(
    () =>
      diaries.filter(
        (d) =>
          categorizePlant({
            plantSlug: d.plantSlug,
            plant: d.plant,
            species: d.species,
            title: d.title,
          }) === "indoor",
      ),
    [diaries],
  );

  const selected: Diary | null = useMemo(
    () => indoor.find((d) => d.id === selectedId) ?? null,
    [indoor, selectedId],
  );

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      return;
    }
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedId((current) => {
        if (current) return null;
        close();
        return null;
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!open) return null;

  const name = profile?.displayName || profile?.name || "Your garden";
  const count = indoor.length;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/40 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="indoor-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center gap-4 border-b border-border px-5 py-4 sm:px-7">
          {profile?.picture ? (
            <img
              src={profile.picture}
              alt=""
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-full bg-secondary" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="indoor-title"
              className="truncate text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Indoor Garden
            </h2>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {name} · {count} indoor plant {count === 1 ? "diary" : "diaries"}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close indoor garden"
            className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="hidden sm:inline">Esc</span>
            <span className="sm:hidden">✕</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {selected ? (
            <DiaryDetail diary={selected} onBack={() => setSelectedId(null)} />
          ) : count === 0 ? (
            <p className="py-14 text-center text-sm text-muted-foreground">
              No indoor plants in this garden yet.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {indoor.map((diary) => (
                <li key={diary.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(diary.id)}
                    className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {diary.coverImage ? (
                      <img
                        src={diary.coverImage}
                        alt=""
                        loading="lazy"
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="h-28 w-full bg-secondary" aria-hidden />
                    )}
                    <span className="flex flex-1 flex-col gap-1 p-3">
                      <span className="truncate text-sm font-semibold">
                        {diary.plant || diary.title}
                      </span>
                      {diary.species || diary.cultivar ? (
                        <span className="truncate text-xs italic text-muted-foreground">
                          {diary.species ?? diary.cultivar}
                        </span>
                      ) : null}
                      <span className="mt-1 flex flex-wrap gap-1.5 text-[0.7rem]">
                        {diary.phase ? (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                            {diary.phase}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                          {diary.items.length} {diary.items.length === 1 ? "entry" : "entries"}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DiaryDetail({ diary, onBack }: { diary: Diary; onBack: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← All indoor plants
      </button>

      <h3
        className="mt-4 text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {diary.title}
      </h3>
      {diary.species || diary.cultivar ? (
        <p className="mt-1 text-sm italic text-muted-foreground">
          {diary.species ?? diary.cultivar}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
          indoor
        </span>
        {diary.phase ? (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {diary.phase}
          </span>
        ) : null}
        {diary.breeder ? (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            {diary.breeder}
          </span>
        ) : null}
      </div>

      <h4 className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Grow log · {diary.items.length} entries
      </h4>
      {diary.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This diary has no entries on the connected relays yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-4 text-sm leading-relaxed">
          {[...diary.items].reverse().map((item) => {
            const image = firstImage(item);
            return (
              <li key={item.eventId} className="border-l-2 border-primary/40 pl-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatDate(item.createdAt)}
                  {item.phaseLabel ? ` · ${item.phaseLabel}` : ""}
                </p>
                {image ? (
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="mt-2 max-h-64 w-full rounded-lg object-cover"
                  />
                ) : null}
                {item.contentPreview ? <p className="mt-2">{item.contentPreview}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
