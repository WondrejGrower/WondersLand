import { create } from "zustand";
import { fetchFeed, type FeedPost } from "../nostr/feed";

type FeedState = {
  posts: FeedPost[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  load: (force?: boolean) => Promise<void>;
};

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  status: "idle",
  error: null,
  load: async (force = false) => {
    const { status, posts } = get();
    if (status === "loading") return;
    if (!force && posts.length > 0) return;
    set({ status: "loading", error: null });
    try {
      const next = await fetchFeed();
      set({ posts: next, status: "ready" });
    } catch (err) {
      set({
        status: get().posts.length > 0 ? "ready" : "error",
        error: err instanceof Error ? err.message : "Could not reach the relays",
      });
    }
  },
}));
