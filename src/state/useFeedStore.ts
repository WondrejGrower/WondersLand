import { create } from "zustand";
import { fetchFeedPage, type FeedMode, type FeedPost } from "../nostr/feed";

export type FeedLane = {
  posts: FeedPost[];
  status: "idle" | "loading" | "loadingMore" | "ready" | "error";
  error: string | null;
  cursor: number | null;
  exhausted: boolean;
};

type FeedState = {
  mode: FeedMode;
  grow: FeedLane;
  nostr: FeedLane;
  setMode: (mode: FeedMode) => void;
  load: (force?: boolean, mode?: FeedMode) => Promise<void>;
  loadMore: (mode?: FeedMode) => Promise<void>;
};

const emptyLane = (): FeedLane => ({
  posts: [],
  status: "idle",
  error: null,
  cursor: null,
  exhausted: false,
});

const PAGE_SIZE = 40;

export const useFeedStore = create<FeedState>((set, get) => {
  const patch = (mode: FeedMode, lane: Partial<FeedLane>) =>
    set((state) => ({ [mode]: { ...state[mode], ...lane } }) as Partial<FeedState>);

  return {
    mode: "grow",
    grow: emptyLane(),
    nostr: emptyLane(),

    setMode: (mode) => {
      set({ mode });
      void get().load(false, mode);
    },

    load: async (force = false, mode) => {
      const target = mode ?? get().mode;
      const lane = get()[target];
      if (lane.status === "loading" || lane.status === "loadingMore") return;
      if (!force && lane.posts.length > 0) return;
      patch(target, { status: "loading", error: null });
      try {
        const page = await fetchFeedPage(target, PAGE_SIZE);
        patch(target, {
          posts: page.posts,
          cursor: page.cursor,
          exhausted: page.cursor === null,
          status: "ready",
        });
      } catch (err) {
        patch(target, {
          status: get()[target].posts.length > 0 ? "ready" : "error",
          error: err instanceof Error ? err.message : "Could not reach the relays",
        });
      }
    },

    loadMore: async (mode) => {
      const target = mode ?? get().mode;
      const lane = get()[target];
      if (lane.status === "loading" || lane.status === "loadingMore") return;
      if (lane.exhausted || lane.cursor === null) return;
      patch(target, { status: "loadingMore", error: null });
      try {
        const page = await fetchFeedPage(target, PAGE_SIZE, lane.cursor - 1);
        const seen = new Set(get()[target].posts.map((p) => p.id));
        const fresh = page.posts.filter((p) => !seen.has(p.id));
        patch(target, {
          posts: [...get()[target].posts, ...fresh],
          cursor: page.cursor,
          exhausted: page.cursor === null || page.cursor >= lane.cursor,
          status: "ready",
        });
      } catch (err) {
        patch(target, {
          status: "ready",
          error: err instanceof Error ? err.message : "Could not reach the relays",
        });
      }
    },
  };
});
