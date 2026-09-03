import { create } from "zustand";
import {
  fetchInteractions,
  publishReaction,
  publishReply,
  type InteractionMap,
  type NoteInteractions,
  type ReactionTarget,
} from "../nostr/interactions";
import { getSigner } from "../nostr/signers";
import { useNostrStore } from "./useNostrStore";

type State = {
  byNote: InteractionMap;
  loading: boolean;
  /** Note ids already requested, so scrolling does not re-query the relays. */
  requested: string[];
  hydrate: (noteIds: string[]) => Promise<void>;
  like: (target: ReactionTarget) => Promise<void>;
  reply: (target: ReactionTarget, text: string) => Promise<void>;
  reset: () => void;
};

const empty = (): NoteInteractions => ({ likes: 0, likedByMe: false, replies: [] });

function signerOrThrow() {
  const { method } = useNostrStore.getState();
  const signer = getSigner(method);
  if (!signer) throw new Error("Unlock publishing first");
  return signer;
}

export const useInteractionsStore = create<State>((set, get) => ({
  byNote: {},
  loading: false,
  requested: [],

  hydrate: async (noteIds) => {
    const known = new Set(get().requested);
    const fresh = noteIds.filter((id) => !known.has(id));
    if (fresh.length === 0) return;
    set({ loading: true, requested: [...get().requested, ...fresh] });
    try {
      const viewer = useNostrStore.getState().pubkey;
      const map = await fetchInteractions(fresh, viewer);
      set({ byNote: { ...get().byNote, ...map } });
    } catch {
      // Counts are decoration; a failed read must never break the feed.
    } finally {
      set({ loading: false });
    }
  },

  like: async (target) => {
    const current = get().byNote[target.id] ?? empty();
    if (current.likedByMe) return;
    const signer = signerOrThrow();
    // Optimistic, with a rollback when no relay accepts.
    set({
      byNote: {
        ...get().byNote,
        [target.id]: { ...current, likes: current.likes + 1, likedByMe: true },
      },
    });
    try {
      await publishReaction(signer, target);
    } catch (err) {
      set({ byNote: { ...get().byNote, [target.id]: current } });
      throw err;
    }
  },

  reply: async (target, text) => {
    const signer = signerOrThrow();
    const { reply } = await publishReply(signer, target, text);
    const current = get().byNote[target.id] ?? empty();
    set({
      byNote: {
        ...get().byNote,
        [target.id]: { ...current, replies: [...current.replies, reply] },
      },
    });
  },

  reset: () => set({ byNote: {}, requested: [], loading: false }),
}));
