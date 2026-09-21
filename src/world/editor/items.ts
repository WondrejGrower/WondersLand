/**
 * The editable things in the world, described as plain getters and setters over
 * the shared layout data. Hidden layout editor only — nothing here runs in the
 * normal game loop.
 */
import { PLANT_SLOTS } from "../../garden/slots";
import {
  ARCH_POSITION,
  BOARD_POSITION,
  COTTAGE_INTERACTION_POINT,
  COTTAGE_POSITION,
  GREENHOUSE_POSITION,
  GROW_BEDS_CENTER,
  HIDDEN_LAYOUT_ITEMS,
  LAYOUT,
  PLACED_MODELS,
  PATH_FROM,
  PATH_TO,
  PATH_VIA,
  SPAWN,
  TREE_INSTANCES,
  WELCOME_POSITION,
} from "../layout";
import type { PlaceableModelType } from "../layout";

export type EditGroup = "Stavby" | "Cesta" | "Stromy" | "Rostliny";

export type EditItem = {
  id: string;
  label: string;
  group: EditGroup;
  x: number;
  z: number;
  /** null when the object has no meaningful facing. */
  rot: number | null;
  /** null when the object cannot be resized. */
  scale: number | null;
  removable: boolean;
  set: (patch: { x?: number; z?: number; rot?: number; scale?: number }) => void;
};

function pair(
  id: string,
  label: string,
  group: EditGroup,
  target: [number, number],
  rot?: { get: () => number; set: (v: number) => void },
  scale?: { get: () => number; set: (v: number) => void },
): EditItem {
  return {
    id,
    label,
    group,
    x: target[0],
    z: target[1],
    rot: rot ? rot.get() : null,
    scale: scale ? scale.get() : null,
    removable: true,
    set: (patch) => {
      if (patch.x !== undefined) target[0] = patch.x;
      if (patch.z !== undefined) target[1] = patch.z;
      if (patch.rot !== undefined && rot) rot.set(patch.rot);
      if (patch.scale !== undefined && scale) scale.set(patch.scale);
    },
  };
}

export function buildItems(): EditItem[] {
  const items: EditItem[] = [];

  if (!HIDDEN_LAYOUT_ITEMS.has("arch")) items.push({
    id: "arch",
    label: "Brána WondersLand",
    group: "Stavby",
    x: ARCH_POSITION[0],
    z: ARCH_POSITION[2],
    rot: LAYOUT.archRotY,
    scale: LAYOUT.archScale,
    removable: true,
    set: (p) => {
      if (p.x !== undefined) ARCH_POSITION[0] = p.x;
      if (p.z !== undefined) ARCH_POSITION[2] = p.z;
      if (p.rot !== undefined) LAYOUT.archRotY = p.rot;
      if (p.scale !== undefined) LAYOUT.archScale = p.scale;
    },
  });

  if (!HIDDEN_LAYOUT_ITEMS.has("cottage")) items.push({
    id: "cottage",
    label: "Domek My Garden",
    group: "Stavby",
    x: COTTAGE_POSITION[0],
    z: COTTAGE_POSITION[2],
    rot: LAYOUT.cottageRotY,
    scale: LAYOUT.cottageScale,
    removable: true,
    set: (p) => {
      if (p.x !== undefined) COTTAGE_POSITION[0] = p.x;
      if (p.z !== undefined) COTTAGE_POSITION[2] = p.z;
      if (p.rot !== undefined) LAYOUT.cottageRotY = p.rot;
      if (p.scale !== undefined) LAYOUT.cottageScale = p.scale;
    },
  });

  if (!HIDDEN_LAYOUT_ITEMS.has("greenhouse")) items.push({
    id: "greenhouse",
    label: "Skleník",
    group: "Stavby",
    x: GREENHOUSE_POSITION[0],
    z: GREENHOUSE_POSITION[2],
    rot: LAYOUT.greenhouseRotY,
    scale: LAYOUT.greenhouseScale,
    removable: true,
    set: (p) => {
      if (p.x !== undefined) GREENHOUSE_POSITION[0] = p.x;
      if (p.z !== undefined) GREENHOUSE_POSITION[2] = p.z;
      if (p.rot !== undefined) LAYOUT.greenhouseRotY = p.rot;
      if (p.scale !== undefined) LAYOUT.greenhouseScale = p.scale;
    },
  });

  if (!HIDDEN_LAYOUT_ITEMS.has("garden-board")) items.push(
    pair(
      "garden-board",
      "Task cedule",
      "Stavby",
      BOARD_POSITION,
      { get: () => LAYOUT.boardRotY, set: (v) => (LAYOUT.boardRotY = v) },
      { get: () => LAYOUT.boardScale, set: (v) => (LAYOUT.boardScale = v) },
    ),
  );
  if (!HIDDEN_LAYOUT_ITEMS.has("welcome-sign")) items.push(
    pair(
      "welcome-sign",
      "Uvítací cedule",
      "Stavby",
      WELCOME_POSITION,
      { get: () => LAYOUT.welcomeRotY, set: (v) => (LAYOUT.welcomeRotY = v) },
      { get: () => LAYOUT.welcomeScale, set: (v) => (LAYOUT.welcomeScale = v) },
    ),
  );
  if (!HIDDEN_LAYOUT_ITEMS.has("grow-beds")) items.push(pair("grow-beds", "Vyvýšené záhony", "Stavby", GROW_BEDS_CENTER));
  const cottageDoor = pair("cottage-door", "Vstup do domku", "Stavby", COTTAGE_INTERACTION_POINT);
  cottageDoor.removable = false;
  items.push(cottageDoor);
  const spawn = pair("spawn", "Spawn point", "Cesta", SPAWN);
  spawn.removable = false;
  items.push(spawn);

  const leg = (id: string, label: string, p: { x: number; z: number }): EditItem => ({
    id,
    label,
    group: "Cesta",
    x: p.x,
    z: p.z,
    rot: null,
    scale: null,
    removable: false,
    set: (patch) => {
      if (patch.x !== undefined) p.x = patch.x;
      if (patch.z !== undefined) p.z = patch.z;
    },
  });
  items.push(leg("path-from", "Cesta — začátek", PATH_FROM));
  items.push(leg("path-via", "Cesta — zlom u brány", PATH_VIA));
  items.push(leg("path-to", "Cesta — konec u domku", PATH_TO));

  // The drawn walkway itself: it has no position of its own, but it can be
  // hidden. Waypoints above keep steering the character either way.
  if (!HIDDEN_LAYOUT_ITEMS.has("path")) {
    items.push({
      id: "path",
      label: "Pěšina (povrch)",
      group: "Cesta",
      x: PATH_VIA.x,
      z: PATH_VIA.z,
      rot: null,
      scale: null,
      removable: true,
      set: () => {},
    });
  }

  TREE_INSTANCES.forEach((tree, i) => {
    items.push({
      id: `tree:${i}`,
      label: `Strom ${i + 1}`,
      group: "Stromy",
      x: tree.x,
      z: tree.z,
      rot: tree.rot,
      scale: tree.scale,
      removable: true,
      set: (p) => {
        if (p.x !== undefined) tree.x = p.x;
        if (p.z !== undefined) tree.z = p.z;
        if (p.rot !== undefined) tree.rot = p.rot;
        if (p.scale !== undefined) {
          tree.scale = p.scale;
          tree.scaleY = p.scale;
        }
      },
    });
  });

  PLANT_SLOTS.forEach((slot, i) => {
    items.push({
      id: `slot:${i}`,
      label: `Místo pro rostlinu ${i + 1}`,
      group: "Rostliny",
      x: slot.position[0],
      z: slot.position[2],
      rot: slot.rotationY,
      scale: null,
      removable: true,
      set: (p) => {
        if (p.x !== undefined) slot.position[0] = p.x;
        if (p.z !== undefined) slot.position[2] = p.z;
        if (p.rot !== undefined) slot.rotationY = p.rot;
      },
    });
  });

  const labels: Record<PlaceableModelType, string> = {
    arch: "Brána WondersLand",
    cottage: "Domek My Garden",
    greenhouse: "Skleník",
    "garden-board": "Task cedule",
    "welcome-sign": "Uvítací cedule",
    "grow-beds": "Vyvýšené záhony",
  };
  for (const model of PLACED_MODELS) {
    items.push({
      id: `model:${model.id}`,
      label: `${labels[model.type]} (kopie)`,
      group: "Stavby",
      x: model.x,
      z: model.z,
      rot: model.rot,
      scale: model.scale,
      removable: true,
      set: (p) => {
        if (p.x !== undefined) model.x = p.x;
        if (p.z !== undefined) model.z = p.z;
        if (p.rot !== undefined) model.rot = p.rot;
        if (p.scale !== undefined) model.scale = p.scale;
      },
    });
  }

  return items;
}

export function addTree(x = 0, z = 6) {
  TREE_INSTANCES.push({ x, z, rot: 0, scale: 1, scaleY: 1 });
  return `tree:${TREE_INSTANCES.length - 1}`;
}

export function removeTree(index: number) {
  if (index >= 0 && index < TREE_INSTANCES.length) TREE_INSTANCES.splice(index, 1);
}

export function addModel(type: PlaceableModelType, x: number, z: number) {
  const id = PLACED_MODELS.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  PLACED_MODELS.push({ id, type, x, z, rot: 0, scale: 1 });
  return `model:${id}`;
}

export function removeItem(id: string) {
  if (id.startsWith("tree:")) {
    removeTree(Number(id.slice(5)));
    return;
  }
  if (id.startsWith("slot:")) {
    const index = Number(id.slice(5));
    if (index >= 0 && index < PLANT_SLOTS.length) PLANT_SLOTS.splice(index, 1);
    PLANT_SLOTS.forEach((slot, i) => (slot.id = i));
    return;
  }
  if (id.startsWith("model:")) {
    const index = PLACED_MODELS.findIndex((item) => item.id === Number(id.slice(6)));
    if (index >= 0) PLACED_MODELS.splice(index, 1);
    return;
  }
  if (["arch", "cottage", "greenhouse", "garden-board", "welcome-sign", "grow-beds", "path"].includes(id)) {
    HIDDEN_LAYOUT_ITEMS.add(id);
  }
}

export function addPlantSlot(x: number, z: number) {
  const id = PLANT_SLOTS.length;
  PLANT_SLOTS.push({ id, position: [x, 0, z], rotationY: 0 });
  return `slot:${id}`;
}
