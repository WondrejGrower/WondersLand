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
  /** Private tasks/habits/timers board, opened from the board beside the house. */
  tasksOpen: boolean;
  /** Device-local world settings panel. */
  settingsOpen: boolean;
  /** Short transient message, e.g. "Move closer to use this". */
  hint: string | null;
  enter: () => void;
  /** Leave the 3D world back to the Nostr client (C key / touch button). */
  exit: () => void;
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
  openTasks: () => void;
  closeTasks: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setHint: (hint: string | null) => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  entered: false,
  focusedPlantId: null,
  target: null,
  journalOpen: false,
  indoorOpen: false,
  aboutOpen: false,
  comingSoon: null,
  tasksOpen: false,
  settingsOpen: false,
  hint: null,
  enter: () => set({ entered: true }),
  exit: () =>
    set({
      entered: false,
      journalOpen: false,
      indoorOpen: false,
      aboutOpen: false,
      comingSoon: null,
      tasksOpen: false,
      settingsOpen: false,
      hint: null,
      target: null,
      focusedPlantId: null,
    }),
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
  openTasks: () => set({ tasksOpen: true }),
  closeTasks: () => set({ tasksOpen: false }),
  openSettings: () => set({ settingsOpen: true, hint: null }),
  closeSettings: () => set({ settingsOpen: false }),
  setHint: (hint) => set({ hint }),
}));

/** True while any overlay owns the screen; the world must not react. */
export function worldFrozen(s: {
  journalOpen: boolean;
  indoorOpen: boolean;
  aboutOpen: boolean;
  tasksOpen: boolean;
  settingsOpen: boolean;
  comingSoon: ComingSoon;
}): boolean {
  return (
    s.journalOpen || s.indoorOpen || s.aboutOpen || s.tasksOpen || s.settingsOpen || s.comingSoon !== null
  );
}
