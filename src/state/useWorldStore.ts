import { create } from "zustand";

/** What the player is currently close enough to interact with. */
export type InteractionTarget = { kind: "plant"; id: string } | { kind: "cottage" } | null;

type WorldState = {
  entered: boolean;
  focusedPlantId: string | null;
  /** Generic focus so the world layer stays free of UI knowledge. */
  target: InteractionTarget;
  journalOpen: boolean;
  indoorOpen: boolean;
  /** "What is WondersLand" overlay opened from the 3D welcome sign. */
  aboutOpen: boolean;
  enter: () => void;
  setFocusedPlant: (id: string | null) => void;
  setTarget: (target: InteractionTarget) => void;
  openJournal: () => void;
  closeJournal: () => void;
  openIndoor: () => void;
  closeIndoor: () => void;
  openAbout: () => void;
  closeAbout: () => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  entered: false,
  focusedPlantId: null,
  target: null,
  journalOpen: false,
  indoorOpen: false,
  aboutOpen: false,
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
}));
