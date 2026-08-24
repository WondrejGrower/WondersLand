import { create } from "zustand";
import { getJson, setJson } from "../nostr/storage";

/**
 * Client-only presentation preference: which diaries the visitor has hidden
 * from the normal WondersLand views. This never touches Nostr — no tombstone,
 * no schema change, no relay write. It is scoped per pubkey and stored locally,
 * so the original kind:30078 diary stays fully recoverable.
 */
type HiddenState = {
  pubkey: string | null;
  ids: string[];
  load: (pubkey: string) => Promise<void>;
  hide: (id: string) => Promise<void>;
  unhide: (id: string) => Promise<void>;
  reset: () => void;
};

const key = (pubkey: string) => `hidden-diaries:${pubkey}`;

export const useHiddenDiaries = create<HiddenState>((set, get) => ({
  pubkey: null,
  ids: [],

  load: async (pubkey) => {
    if (get().pubkey === pubkey) return;
    const stored = await getJson<string[]>(key(pubkey));
    set({ pubkey, ids: Array.isArray(stored) ? stored : [] });
  },

  hide: async (id) => {
    const { pubkey, ids } = get();
    if (ids.includes(id)) return;
    const next = [...ids, id];
    set({ ids: next });
    if (pubkey) await setJson(key(pubkey), next);
  },

  unhide: async (id) => {
    const { pubkey, ids } = get();
    const next = ids.filter((x) => x !== id);
    set({ ids: next });
    if (pubkey) await setJson(key(pubkey), next);
  },

  reset: () => set({ pubkey: null, ids: [] }),
}));
