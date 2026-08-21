import { useEffect } from "react";
import { Leaf, Maximize2, X } from "lucide-react";
import { nip19 } from "nostr-tools";
import { useFeedStore } from "../state/useFeedStore";
import type { FeedPost } from "../nostr/feed";

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
  { key: "like", label: "Like", Icon: Heart },
  { key: "zap", label: "Zap", Icon: Zap },
  { key: "reply", label: "Reply", Icon: MessageCircle },
  { key: "repost", label: "Repost", Icon: Repeat2 },
] as const;

function PostCard({ post }: { post: FeedPost }) {
  const name = post.author?.displayName || post.author?.name || "Grower";
  const image = post.images[0];
  return (
    <article className="rounded-2xl border border-forest-soft/40 bg-forest/60 p-4">
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
          <p className="truncate text-[0.7rem] text-cream/45">{shortNpub(post.pubkey)}</p>
        </div>
        <span className="shrink-0 text-[0.7rem] text-cream/40">{ago(post.createdAt)}</span>
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

      <div className="mt-3 grid grid-cols-4 gap-2">
        {ACTIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            disabled
            title={`${label} — coming with Nostr write support`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-forest-soft/40 bg-forest-deep/40 px-2 py-1.5 text-[0.7rem] text-cream/45 disabled:cursor-not-allowed"
          >
            <Icon aria-hidden className="h-3.5 w-3.5 text-leaf/70" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

export function GrowFeed({
  expanded,
  onToggleExpand,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const posts = useFeedStore((s) => s.posts);
  const status = useFeedStore((s) => s.status);
  const error = useFeedStore((s) => s.error);
  const load = useFeedStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-[1.5rem] border border-forest-soft/50 bg-forest/50 ${
        expanded ? "h-full" : "lg:max-h-[calc(100vh-8rem)]"
      }`}
      aria-label="Grow Feed"
    >
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div>
          <h2
            className="flex items-center gap-2 text-lg font-semibold text-cream"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Leaf className="h-4 w-4 text-leaf" aria-hidden /> Grow Feed
          </h2>
          <p className="mt-0.5 text-xs text-cream/50">All posts from the Nostr garden community</p>
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? "Back to dashboard" : "Expand feed"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-forest-soft/50 bg-forest/60 text-cream/70 hover:text-cream"
        >
          {expanded ? <X className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {status === "loading" && posts.length === 0 ? (
          <p className="px-1 text-sm text-cream/55">Reading the community feed from the relays…</p>
        ) : status === "error" ? (
          <div className="grid gap-3 px-1">
            <p className="text-sm text-cream/60">{error ?? "The relays did not answer."}</p>
            <button
              type="button"
              onClick={() => void load(true)}
              className="justify-self-start rounded-full border border-leaf/40 px-3 py-1 text-xs text-leaf"
            >
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <p className="px-1 text-sm text-cream/55">
            No grow posts on your relays right now. Add more relays and the feed fills up.
          </p>
        ) : (
          <div className={`grid gap-3 ${expanded ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`}>
            {(expanded ? posts : posts.slice(0, 12)).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
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
