import { create } from "zustand";
import {
  DEFAULT_LENS_CONFIG,
  importLensConfig,
  loadLensConfig,
  saveLensConfig,
  type LensConfig,
  type LensSignalId,
} from "../nostr/lens/config";

/**
 * The Grow Lens configuration the user can see and change. Local only — no
 * relay, no backend. The feed reads it before every page request.
 */
type LensState = {
  config: LensConfig;
  loaded: boolean;
  ensureLoaded: () => Promise<LensConfig>;
  setWeight: (id: LensSignalId, value: number) => void;
  setSource: (key: keyof LensConfig["sources"], value: boolean) => void;
  setHashtags: (hashtags: string[]) => void;
  setKeywords: (keywords: string[]) => void;
  setMinScore: (value: number) => void;
  setMaxPerAuthor: (value: number) => void;
  replace: (config: LensConfig) => void;
  importJson: (json: string) => void;
  reset: () => void;
};

export const useLensStore = create<LensState>((set, get) => {
  const commit = (config: LensConfig) => {
    set({ config });
    void saveLensConfig(config);
  };

  return {
    config: DEFAULT_LENS_CONFIG,
    loaded: false,

    ensureLoaded: async () => {
      if (get().loaded) return get().config;
      const config = await loadLensConfig();
      set({ config, loaded: true });
      return config;
    },

    setWeight: (id, value) =>
      commit({ ...get().config, weights: { ...get().config.weights, [id]: value } }),
    setSource: (key, value) =>
      commit({ ...get().config, sources: { ...get().config.sources, [key]: value } }),
    setHashtags: (hashtags) => commit({ ...get().config, hashtags }),
    setKeywords: (keywords) => commit({ ...get().config, keywords }),
    setMinScore: (minScore) => commit({ ...get().config, minScore }),
    setMaxPerAuthor: (maxPerAuthor) => commit({ ...get().config, maxPerAuthor }),
    replace: (config) => commit(config),
    importJson: (json) => commit(importLensConfig(json)),
    reset: () => commit({ ...DEFAULT_LENS_CONFIG, hashtags: [...DEFAULT_LENS_CONFIG.hashtags] }),
  };
});
