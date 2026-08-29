import { create } from "zustand";

/** What the player is currently close enough to interact with. */
export type InteractionTarget =
  | { kind: "plant"; id: string }
  | { kind: "world"; id: string }
  | null;

export type ComingSoon = { title: string; body: string } | null;

type WorldState = {
  entered: boolean;
  focusedPlantId: string | null;
  /** Generic focus so the world layer stays free of UI knowledge. */
  target: InteractionTarget;
  journalOpen: boolean;
  indoorOpen: boolean;
  /** "What is WondersLand" overlay opened from the 3D welcome sign. */
  aboutOpen: boolean;
  /** Placeholder overlay for portals that are not built yet. */
  comingSoon: ComingSoon;
  enter: () => void;
  setFocusedPlant: (id: string | null) => void;
  setTarget: (target: InteractionTarget) => void;
  openJournal: () => void;
  closeJournal: () => void;
  openIndoor: () => void;
  closeIndoor: () => void;
  openAbout: () => void;
  closeAbout: () => void;
  openComingSoon: (info: NonNullable<ComingSoon>) => void;
  closeComingSoon: () => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  entered: false,
  focusedPlantId: null,
  target: null,
  journalOpen: false,
  indoorOpen: false,
  aboutOpen: false,
  comingSoon: null,
  enter: () => set({ entered: true }),
  setFocusedPlant: (id) => set({ focusedPlantId: id }),
  setTarget: (target) =>
    set({ target, focusedPlantId: target?.kind === "plant" ? target.id : null }),
  openJournal: () => set({ journalOpen: true }),
  closeJournal: () => set({ journalOpen: false }),
  openIndoor: () => set({ indoorOpen: true }),
  closeIndoor: () => set({ indoorOpen: false }),
  openAbout: () => set({ aboutOpen: true }),
  closeAbout: () => set({ aboutOpen: false }),
  openComingSoon: (info) => set({ comingSoon: info }),
  closeComingSoon: () => set({ comingSoon: null }),
}));
