import { create } from "zustand";

type WorldState = {
  entered: boolean;
  focusedPlantId: string | null;
  journalOpen: boolean;
  enter: () => void;
  setFocusedPlant: (id: string | null) => void;
  openJournal: () => void;
  closeJournal: () => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  entered: false,
  focusedPlantId: null,
  journalOpen: false,
  enter: () => set({ entered: true }),
  setFocusedPlant: (id) => set({ focusedPlantId: id }),
  openJournal: () => set({ journalOpen: true }),
  closeJournal: () => set({ journalOpen: false }),
}));
