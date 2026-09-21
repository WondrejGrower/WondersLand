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
  LAYOUT,
  PATH_FROM,
  PATH_TO,
  PATH_VIA,
  SPAWN,
  TREE_INSTANCES,
  WELCOME_POSITION,
} from "../layout";

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

  items.push({
    id: "arch",
    label: "Brána WondersLand",
    group: "Stavby",
    x: ARCH_POSITION[0],
    z: ARCH_POSITION[2],
    rot: LAYOUT.archRotY,
    scale: LAYOUT.archScale,
    set: (p) => {
      if (p.x !== undefined) ARCH_POSITION[0] = p.x;
      if (p.z !== undefined) ARCH_POSITION[2] = p.z;
      if (p.rot !== undefined) LAYOUT.archRotY = p.rot;
      if (p.scale !== undefined) LAYOUT.archScale = p.scale;
    },
  });

  items.push({
    id: "cottage",
    label: "Domek My Garden",
    group: "Stavby",
    x: COTTAGE_POSITION[0],
    z: COTTAGE_POSITION[2],
    rot: LAYOUT.cottageRotY,
    scale: LAYOUT.cottageScale,
    set: (p) => {
      if (p.x !== undefined) COTTAGE_POSITION[0] = p.x;
      if (p.z !== undefined) COTTAGE_POSITION[2] = p.z;
      if (p.rot !== undefined) LAYOUT.cottageRotY = p.rot;
      if (p.scale !== undefined) LAYOUT.cottageScale = p.scale;
    },
  });

  items.push({
    id: "greenhouse",
    label: "Skleník",
    group: "Stavby",
    x: GREENHOUSE_POSITION[0],
    z: GREENHOUSE_POSITION[2],
    rot: LAYOUT.greenhouseRotY,
    scale: LAYOUT.greenhouseScale,
    set: (p) => {
      if (p.x !== undefined) GREENHOUSE_POSITION[0] = p.x;
      if (p.z !== undefined) GREENHOUSE_POSITION[2] = p.z;
      if (p.rot !== undefined) LAYOUT.greenhouseRotY = p.rot;
      if (p.scale !== undefined) LAYOUT.greenhouseScale = p.scale;
    },
  });

  items.push(
    pair(
      "garden-board",
      "Task cedule",
      "Stavby",
      BOARD_POSITION,
      { get: () => LAYOUT.boardRotY, set: (v) => (LAYOUT.boardRotY = v) },
      { get: () => LAYOUT.boardScale, set: (v) => (LAYOUT.boardScale = v) },
    ),
  );
  items.push(
    pair(
      "welcome-sign",
      "Uvítací cedule",
      "Stavby",
      WELCOME_POSITION,
      { get: () => LAYOUT.welcomeRotY, set: (v) => (LAYOUT.welcomeRotY = v) },
      { get: () => LAYOUT.welcomeScale, set: (v) => (LAYOUT.welcomeScale = v) },
    ),
  );
  items.push(pair("grow-beds", "Vyvýšené záhony", "Stavby", GROW_BEDS_CENTER));
  items.push(pair("cottage-door", "Vstup do domku", "Stavby", COTTAGE_INTERACTION_POINT));
  items.push(pair("spawn", "Spawn point", "Cesta", SPAWN));

  const leg = (id: string, label: string, p: { x: number; z: number }): EditItem => ({
    id,
    label,
    group: "Cesta",
    x: p.x,
    z: p.z,
    rot: null,
    scale: null,
    set: (patch) => {
      if (patch.x !== undefined) p.x = patch.x;
      if (patch.z !== undefined) p.z = patch.z;
    },
  });
  items.push(leg("path-from", "Cesta — začátek", PATH_FROM));
  items.push(leg("path-via", "Cesta — zlom u brány", PATH_VIA));
  items.push(leg("path-to", "Cesta — konec u domku", PATH_TO));

  TREE_INSTANCES.forEach((tree, i) => {
    items.push({
      id: `tree:${i}`,
      label: `Strom ${i + 1}`,
      group: "Stromy",
      x: tree.x,
      z: tree.z,
      rot: tree.rot,
      scale: tree.scale,
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
      set: (p) => {
        if (p.x !== undefined) slot.position[0] = p.x;
        if (p.z !== undefined) slot.position[2] = p.z;
        if (p.rot !== undefined) slot.rotationY = p.rot;
      },
    });
  });

  return items;
}

export function addTree() {
  TREE_INSTANCES.push({ x: 0, z: 6, rot: 0, scale: 1, scaleY: 1 });
  return `tree:${TREE_INSTANCES.length - 1}`;
}

export function removeTree(index: number) {
  if (index >= 0 && index < TREE_INSTANCES.length) TREE_INSTANCES.splice(index, 1);
}
