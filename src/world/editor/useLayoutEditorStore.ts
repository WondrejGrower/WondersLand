/**
 * Hidden layout editor state.
 *
 * Only reachable with `?edit=1` or the F2 key. It mutates the shared layout
 * data in place, rebuilds colliders and interactables, and bumps `version` so
 * the scenery remounts. Nothing is persisted or published: the result leaves
 * the browser as copied text.
 */
import { create } from "zustand";
import { PLANT_SLOTS } from "../../garden/slots";
import { isOwner } from "../../nostr/owner";
import { useGardenStore } from "../../state/useGardenStore";
import { useNostrStore } from "../../state/useNostrStore";
import { rebuildColliders } from "../collision";
import { rebuildInteractables } from "../interactables";
import {
  ARCH_POSITION,
  BOARD_POSITION,
  COTTAGE_INTERACTION_POINT,
  COTTAGE_POSITION,
  GREENHOUSE_POSITION,
  GROW_BEDS_CENTER,
  LAYOUT,
  PATH_FROM,
  PATH_TO,
  PATH_VIA,
  SPAWN,
  TREE_INSTANCES,
  WELCOME_POSITION,
  type Instance,
} from "../layout";
import { addTree, buildItems, removeTree, type EditItem } from "./items";

type Snapshot = {
  arch: [number, number, number];
  cottage: [number, number, number];
  greenhouse: [number, number, number];
  spawn: [number, number];
  welcome: [number, number];
  board: [number, number];
  beds: [number, number];
  door: [number, number];
  from: { x: number; z: number };
  via: { x: number; z: number };
  to: { x: number; z: number };
  scalars: typeof LAYOUT;
  trees: Instance[];
  slots: Array<{ x: number; z: number; rot: number }>;
};

function snapshot(): Snapshot {
  return {
    arch: [...ARCH_POSITION] as [number, number, number],
    cottage: [...COTTAGE_POSITION] as [number, number, number],
    greenhouse: [...GREENHOUSE_POSITION] as [number, number, number],
    spawn: [...SPAWN] as [number, number],
    welcome: [...WELCOME_POSITION] as [number, number],
    board: [...BOARD_POSITION] as [number, number],
    beds: [...GROW_BEDS_CENTER] as [number, number],
    door: [...COTTAGE_INTERACTION_POINT] as [number, number],
    from: { ...PATH_FROM },
    via: { ...PATH_VIA },
    to: { ...PATH_TO },
    scalars: { ...LAYOUT },
    trees: TREE_INSTANCES.map((t) => ({ ...t })),
    slots: PLANT_SLOTS.map((s) => ({ x: s.position[0], z: s.position[2], rot: s.rotationY })),
  };
}

function restore(snap: Snapshot) {
  const copy = (target: number[], source: number[]) => {
    for (let i = 0; i < source.length; i++) target[i] = source[i]!;
  };
  copy(ARCH_POSITION, snap.arch);
  copy(COTTAGE_POSITION, snap.cottage);
  copy(GREENHOUSE_POSITION, snap.greenhouse);
  copy(SPAWN, snap.spawn);
  copy(WELCOME_POSITION, snap.welcome);
  copy(BOARD_POSITION, snap.board);
  copy(GROW_BEDS_CENTER, snap.beds);
  copy(COTTAGE_INTERACTION_POINT, snap.door);
  Object.assign(PATH_FROM, snap.from);
  Object.assign(PATH_VIA, snap.via);
  Object.assign(PATH_TO, snap.to);
  Object.assign(LAYOUT, snap.scalars);
  TREE_INSTANCES.length = 0;
  TREE_INSTANCES.push(...snap.trees.map((t) => ({ ...t })));
  PLANT_SLOTS.length = 0;
  snap.slots.forEach((s, i) => {
    PLANT_SLOTS.push({ id: i, position: [s.x, 0, s.z], rotationY: s.rot });
  });
}

/** Push edited layout data through everything derived from it. */
function applyLayout() {
  rebuildInteractables();
  rebuildColliders();
  const garden = useGardenStore.getState();
  if (garden.diaries.length) garden.setDiaries(garden.diaries);
}

type EditorState = {
  active: boolean;
  selected: string | null;
  /** Grid step for nudging and dragging, in world units. */
  step: number;
  /** Bumped after every change; the scenery is keyed on it. */
  version: number;
  dirty: boolean;
  open: () => void;
  close: () => void;
  select: (id: string | null) => void;
  setStep: (step: number) => void;
  update: (id: string, patch: { x?: number; z?: number; rot?: number; scale?: number }) => void;
  nudge: (id: string, dx: number, dz: number) => void;
  addTree: () => void;
  removeSelectedTree: () => void;
  revert: () => void;
  items: () => EditItem[];
};

let baseline: Snapshot | null = null;

export const useLayoutEditorStore = create<EditorState>((set, get) => ({
  active: false,
  selected: null,
  step: 0.1,
  version: 0,
  dirty: false,

  open: () => {
    // Fail closed: only the owner identity may ever open the editor.
    if (!isOwner(useNostrStore.getState().pubkey)) return;
    if (!baseline) baseline = snapshot();
    set({ active: true });
  },
  close: () => set({ active: false, selected: null }),
  select: (id) => set({ selected: id }),
  setStep: (step) => set({ step }),

  update: (id, patch) => {
    const item = buildItems().find((it) => it.id === id);
    if (!item) return;
    item.set(patch);
    applyLayout();
    set((s) => ({ version: s.version + 1, dirty: true, selected: id }));
  },

  nudge: (id, dx, dz) => {
    const item = buildItems().find((it) => it.id === id);
    if (!item) return;
    get().update(id, { x: round(item.x + dx), z: round(item.z + dz) });
  },

  addTree: () => {
    const id = addTree();
    applyLayout();
    set((s) => ({ version: s.version + 1, dirty: true, selected: id }));
  },

  removeSelectedTree: () => {
    const id = get().selected;
    if (!id?.startsWith("tree:")) return;
    removeTree(Number(id.slice(5)));
    applyLayout();
    set((s) => ({ version: s.version + 1, dirty: true, selected: null }));
  },

  revert: () => {
    if (!baseline) return;
    restore(baseline);
    applyLayout();
    set((s) => ({ version: s.version + 1, dirty: false, selected: null }));
  },

  items: () => buildItems(),
}));

export function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** True while the editor owns the pointer; normal world input stands down. */
export function editorActive(): boolean {
  return useLayoutEditorStore.getState().active;
}
