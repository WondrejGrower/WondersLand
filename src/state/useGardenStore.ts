import { create } from "zustand";
import type { GardenConfig, GardenSyncStatus, PlantPlacement } from "../garden/config";
import { buildDefaultConfig, reconcileDiaries } from "../garden/defaults";
import { mapDiariesToSlots, type GardenPlant } from "../garden/mapping";
import {
  fetchGardenConfig,
  getCachedGarden,
  getDraft,
  isNewerEvent,
  publishGardenConfig,
  setCachedGarden,
  setDraft,
  type GardenDraft,
} from "../nostr/garden";
import type { PublishResult } from "../nostr/pool";
import { getSigner } from "../nostr/signers";
import type { AuthMethod, Diary, NostrEvent } from "../nostr/types";

const AUTOSAVE_DEBOUNCE_MS = 1000;

type GardenState = {
  pubkey: string | null;
  method: AuthMethod | null;
  config: GardenConfig | null;
  /** Last signed event we know about — the base for ordering and conflicts. */
  baseEvent: NostrEvent | null;
  diaries: Diary[];
  /** Client-only: diaries the visitor hid — never planted in the world. */
  hiddenIds: string[];
  plants: GardenPlant[];
  status: GardenSyncStatus;
  dirty: boolean;
  error: string | null;
  relayResults: PublishResult[];
  /** Remote garden that arrived while local edits were pending. */
  conflict: { config: GardenConfig; event: NostrEvent } | null;
  canEdit: boolean;

  load: (pubkey: string, method: AuthMethod, diaries: Diary[]) => Promise<void>;
  setDiaries: (diaries: Diary[]) => void;
  setHiddenIds: (ids: string[]) => void;
  setPlacement: (diaryId: string, patch: Partial<PlantPlacement>) => void;
  save: () => Promise<void>;
  resolveConflict: (choice: "mine" | "theirs") => void;
  reset: () => void;
};

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let publishing = false;

export const useGardenStore = create<GardenState>((set, get) => {
  function visiblePlants(diaries = get().diaries, hidden = get().hiddenIds) {
    return mapDiariesToSlots(diaries.filter((d) => !hidden.includes(d.id)));
  }

  function apply(config: GardenConfig) {
    set({ config, plants: visiblePlants() });
  }

  function queueAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      const { pubkey, config, baseEvent } = get();
      if (!pubkey || !config) return;
      const draft: GardenDraft = {
        config,
        dirtyAt: Date.now(),
        baseEventId: baseEvent?.id ?? null,
        baseCreatedAt: baseEvent?.created_at ?? 0,
        baseRev: baseEvent ? config.rev : 0,
      };
      void setDraft(pubkey, draft);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  return {
    pubkey: null,
    method: null,
    config: null,
    baseEvent: null,
    diaries: [],
    hiddenIds: [],
    plants: [],
    status: "idle",
    dirty: false,
    error: null,
    relayResults: [],
    conflict: null,
    canEdit: false,

    load: async (pubkey, method, diaries) => {
      set({
        pubkey,
        method,
        diaries,
        status: "loading",
        error: null,
        conflict: null,
        canEdit: getSigner(method) !== null,
      });

      // 1. Local first — the 3D scene never waits on the network.
      const cached = await getCachedGarden(pubkey);
      const draft = await getDraft(pubkey);
      let base: NostrEvent | null = cached?.event ?? null;
      let config = draft?.config ?? cached?.config ?? buildDefaultConfig(pubkey, diaries);
      config = reconcileDiaries(config, pubkey, diaries);
      set({ baseEvent: base, dirty: Boolean(draft), status: "ready" });
      apply(config);

      // 2. Then reconcile with the relays in the background.
      try {
        const remote = await fetchGardenConfig(pubkey);
        if (!remote || get().pubkey !== pubkey) return;
        const remoteIsNewer = isNewerEvent(remote.event, base);
        const movedOnAnotherDevice =
          !draft?.baseEventId || remote.event.id !== draft.baseEventId
            ? remote.event.created_at > (draft?.baseCreatedAt ?? 0)
            : false;

        if (draft && movedOnAnotherDevice) {
          set({ conflict: remote, status: "conflict" });
          return;
        }
        if (!remoteIsNewer) return;

        base = remote.event;
        const merged = reconcileDiaries(remote.config, pubkey, get().diaries);
        set({ baseEvent: base, status: "ready" });
        apply(merged);
        await setCachedGarden(pubkey, { event: base, config: merged, fetchedAt: Date.now() });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Could not reach the relays" });
      }
    },

    setDiaries: (diaries) => {
      const { pubkey, config } = get();
      set({ diaries, plants: visiblePlants(diaries) });
      if (!pubkey || !config) return;
      apply(reconcileDiaries(config, pubkey, diaries));
    },

    setHiddenIds: (ids) => set({ hiddenIds: ids, plants: visiblePlants(undefined, ids) }),

    setPlacement: (diaryId, patch) => {
      const { config, canEdit } = get();
      if (!config || !canEdit) return;
      const plants = config.plants.map((placement) =>
        placement.diaryId === diaryId ? { ...placement, ...patch, pinned: true } : placement,
      );
      apply({ ...config, plants, updatedAt: Math.floor(Date.now() / 1000) });
      set({ dirty: true });
      queueAutosave(); // local only — no signing, no relays
    },

    // Explicit action: this is the only place the signer is invoked.
    save: async () => {
      const { pubkey, method, config, baseEvent, canEdit } = get();
      if (!pubkey || !config || !canEdit || publishing) return;
      const signer = getSigner(method);
      if (!signer) {
        set({ error: "Read-only session — sign in with a Nostr extension to save" });
        return;
      }
      publishing = true;
      set({ status: "saving", error: null, relayResults: [] });
      try {
        const next: GardenConfig = { ...config, rev: config.rev + 1 };
        const { event, results } = await publishGardenConfig(signer, next, baseEvent?.created_at ?? 0);
        const saved: GardenConfig = { ...next, updatedAt: event.created_at };
        set({ baseEvent: event, dirty: false, relayResults: results, status: "ready" });
        apply(saved);
        await setCachedGarden(pubkey, { event, config: saved, fetchedAt: Date.now() });
        await setDraft(pubkey, {
          config: saved,
          dirtyAt: 0,
          baseEventId: event.id,
          baseCreatedAt: event.created_at,
          baseRev: saved.rev,
        });
      } catch (err) {
        // Keep the draft: a failed publish never discards the owner's work.
        set({ status: "error", error: err instanceof Error ? err.message : "Could not save the garden" });
      } finally {
        publishing = false;
      }
    },

    resolveConflict: (choice) => {
      const { conflict, pubkey } = get();
      if (!conflict || !pubkey) return;
      if (choice === "theirs") {
        const merged = reconcileDiaries(conflict.config, pubkey, get().diaries);
        set({ baseEvent: conflict.event, conflict: null, dirty: false, status: "ready" });
        apply(merged);
        void setCachedGarden(pubkey, { event: conflict.event, config: merged, fetchedAt: Date.now() });
      } else {
        // Keep local edits but publish on top of the remote event.
        set({ baseEvent: conflict.event, conflict: null, dirty: true, status: "ready" });
      }
    },

    reset: () => {
      if (autosaveTimer) clearTimeout(autosaveTimer);
      set({
        pubkey: null,
        method: null,
        config: null,
        baseEvent: null,
        diaries: [],
        hiddenIds: [],
        plants: [],
        status: "idle",
        dirty: false,
        error: null,
        relayResults: [],
        conflict: null,
        canEdit: false,
      });
    },
  };
});
