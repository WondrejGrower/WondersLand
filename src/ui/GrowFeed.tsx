import { useEffect, useRef } from "react";
import { nip19 } from "nostr-tools";
import { useFeedStore } from "../state/useFeedStore";
import type { FeedMode, FeedPost } from "../nostr/feed";
import { MediaChips, RelayChips } from "./SourceChips";

function shortNpub(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return `${npub.slice(0, 10)}…${npub.slice(-4)}`;
  } catch {
    return `${pubkey.slice(0, 8)}…`;
  }
}

function ago(seconds: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - seconds * 1000) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d` : `${Math.round(days / 30)}mo`;
}

/**
 * Nostr write interactions (reactions, zaps, replies, reposts) are not wired
 * yet — these stay visibly inert instead of pretending to publish.
 */
const ACTIONS = [
  { key: "like", label: "Like", icon: "♡" },
  { key: "zap", label: "Zap", icon: "⚡" },
  { key: "reply", label: "Reply", icon: "↩" },
  { key: "repost", label: "Repost", icon: "⇅" },
] as const;

function PostCard({ post }: { post: FeedPost }) {
  const name = post.author?.displayName || post.author?.name || "Grower";
  const image = post.images[0];
  return (
    <article className="min-w-0 rounded-2xl border border-forest-soft/40 bg-forest/60 p-3.5 sm:p-4">
      <header className="flex items-center gap-3">
        {post.author?.picture ? (
          <img
            src={post.author.picture}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf/15 text-sm text-leaf"
          >
            ✦
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cream">{name}</p>
          <p className="truncate text-[0.7rem] text-cream/60">{shortNpub(post.pubkey)}</p>
        </div>
        <span className="shrink-0 text-[0.7rem] text-cream/55">{ago(post.createdAt)}</span>
      </header>

      {post.text ? (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-cream/80">
          {post.text}
        </p>
      ) : null}

      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="mt-3 max-h-56 w-full rounded-xl object-cover"
        />
      ) : null}

      <div className="mt-3 grid gap-1">
        <RelayChips relays={post.relays} label="Relay" />
        <MediaChips urls={post.images} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled
            title={`${action.label} — coming with Nostr write support`}
            aria-label={action.label}
            className="flex min-w-0 items-center justify-center gap-1 rounded-xl border border-forest-soft/40 bg-forest-deep/40 px-1.5 py-2 text-[0.7rem] text-cream/75 disabled:cursor-not-allowed sm:gap-1.5 sm:px-2 sm:py-1.5"
          >
            <span aria-hidden className="text-sm text-leaf/80">
              {action.icon}
            </span>
            <span className="hidden min-[380px]:inline">{action.label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

const MODES: { key: FeedMode; label: string; icon: string }[] = [
  { key: "grow", label: "Grow", icon: "🌱" },
  { key: "nostr", label: "Nostr", icon: "🌐" },
];

const COPY: Record<FeedMode, { title: string; subtitle: string; empty: string }> = {
  grow: {
    title: "Grow Feed",
    subtitle: "All posts from the Nostr garden community",
    empty: "No grow posts on your relays right now. Add more relays and the feed fills up.",
  },
  nostr: {
    title: "Nostr Feed",
    subtitle: "Everything your enabled relays are sharing right now",
    empty: "Your relays did not return any notes right now.",
  },
};

export function GrowFeed({
  expanded,
  onToggleExpand,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const mode = useFeedStore((s) => s.mode);
  const lane = useFeedStore((s) => s[s.mode]);
  const setMode = useFeedStore((s) => s.setMode);
  const load = useFeedStore((s) => s.load);
  const loadMore = useFeedStore((s) => s.loadMore);

  const { posts, status, error, exhausted } = lane;
  const copy = COPY[mode];

  // Independent scroll position per feed mode.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const offsets = useRef<Record<FeedMode, number>>({ grow: 0, nostr: 0 });

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = offsets.current[mode] ?? 0;
  }, [mode]);

  const switchMode = (next: FeedMode) => {
    if (next === mode) return;
    offsets.current[mode] = scrollRef.current?.scrollTop ?? 0;
    setMode(next);
  };

  const visible = expanded ? posts : posts.slice(0, 12);

  return (
    <section
      className={`flex w-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-forest-soft/50 bg-forest/50 ${
        expanded ? "h-full" : "lg:max-h-[calc(100vh-8rem)]"
      }`}
      aria-label={copy.title}
    >
      <header className="flex min-w-0 items-start justify-between gap-2 border-b border-forest-soft/40 px-4 py-4 sm:gap-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-cream" style={{ fontFamily: "var(--font-display)" }}>
            {copy.title}
          </h2>
          <p className="text-xs leading-snug text-cream/65 sm:truncate">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            role="tablist"
            aria-label="Feed mode"
            className="flex items-center rounded-full border border-forest-soft/60 bg-forest-deep/40 p-0.5"
          >
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => switchMode(m.key)}
                className={`rounded-full px-2.5 py-1 text-[0.7rem] transition-colors ${
                  mode === m.key ? "bg-leaf/20 text-leaf" : "text-cream/70 hover:text-cream"
                }`}
              >
                <span aria-hidden className="mr-1">
                  {m.icon}
                </span>
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Back to dashboard" : "Expand feed"}
            className="rounded-full border border-forest-soft/60 px-2.5 py-1 text-xs text-cream/70 hover:text-cream"
          >
            {expanded ? "✕" : "⤢"}
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3.5 py-4 sm:px-4">
        {status === "loading" && posts.length === 0 ? (
          <p className="px-1 text-sm text-cream/70">Reading the feed from the relays…</p>
        ) : status === "error" ? (
          <div className="grid gap-3 px-1">
            <p className="text-sm text-cream/75">{error ?? "The relays did not answer."}</p>
            <button
              type="button"
              onClick={() => void load(true)}
              className="justify-self-start rounded-full border border-leaf/40 px-3 py-1 text-xs text-leaf"
            >
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <p className="px-1 text-sm text-cream/70">{copy.empty}</p>
        ) : (
          <>
            <div className={`grid min-w-0 gap-3 ${expanded ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`}>
              {visible.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {expanded && !exhausted ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={status === "loadingMore"}
                className="mx-auto mt-4 block rounded-full border border-forest-soft/60 px-4 py-1.5 text-xs text-cream/70 hover:text-cream disabled:opacity-50"
              >
                {status === "loadingMore" ? "Loading…" : "Load older posts"}
              </button>
            ) : null}
          </>
        )}
      </div>

      <footer className="px-4 pb-4">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-forest-soft/50 bg-forest/50 px-4 py-3 text-sm font-medium text-cream/80 hover:text-cream"
        >
          {expanded ? "Back to dashboard" : "View all posts"}
          <span aria-hidden className="text-leaf">
            {expanded ? "←" : "→"}
          </span>
        </button>
      </footer>
    </section>
  );
}
