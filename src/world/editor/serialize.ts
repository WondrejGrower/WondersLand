/**
 * Turn the live, edited layout into paste-ready TypeScript. The owner copies
 * this out of the hidden editor and hands it over to be written into the repo.
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

const n = (v: number) => Number(v.toFixed(3)).toString();

export function serializeLayout(): string {
  const lines: string[] = [];
  lines.push("// WondersLand layout export — src/world/layout.ts");
  lines.push(`export const ARCH_POSITION: [number, number, number] = [${n(ARCH_POSITION[0])}, 0, ${n(ARCH_POSITION[2])}];`);
  lines.push(`export const SPAWN: [number, number] = [${n(SPAWN[0])}, ${n(SPAWN[1])}];`);
  lines.push(`export const WELCOME_POSITION: [number, number] = [${n(WELCOME_POSITION[0])}, ${n(WELCOME_POSITION[1])}];`);
  lines.push(`export const COTTAGE_POSITION: [number, number, number] = [${n(COTTAGE_POSITION[0])}, 0, ${n(COTTAGE_POSITION[2])}];`);
  lines.push(`export const COTTAGE_ROTATION_Y = ${n(LAYOUT.cottageRotY)};`);
  lines.push(`export const COTTAGE_INTERACTION_POINT: [number, number] = [${n(COTTAGE_INTERACTION_POINT[0])}, ${n(COTTAGE_INTERACTION_POINT[1])}];`);
  lines.push(`export const BOARD_POSITION: [number, number] = [${n(BOARD_POSITION[0])}, ${n(BOARD_POSITION[1])}];`);
  lines.push(`export const GROW_BEDS_CENTER: [number, number] = [${n(GROW_BEDS_CENTER[0])}, ${n(GROW_BEDS_CENTER[1])}];`);
  lines.push(`export const GREENHOUSE_POSITION: [number, number, number] = [${n(GREENHOUSE_POSITION[0])}, 0, ${n(GREENHOUSE_POSITION[2])}];`);
  lines.push(`export const GREENHOUSE_ROTATION_Y = ${n(LAYOUT.greenhouseRotY)};`);
  lines.push(`export const PATH_FROM: XZ = { x: ${n(PATH_FROM.x)}, z: ${n(PATH_FROM.z)} };`);
  lines.push(`export const PATH_VIA: XZ = { x: ${n(PATH_VIA.x)}, z: ${n(PATH_VIA.z)} };`);
  lines.push(`export const PATH_TO: XZ = { x: ${n(PATH_TO.x)}, z: ${n(PATH_TO.z)} };`);
  lines.push("");
  lines.push("export const LAYOUT = {");
  lines.push(`  archRotY: ${n(LAYOUT.archRotY)},`);
  lines.push(`  archScale: ${n(LAYOUT.archScale)},`);
  lines.push(`  cottageRotY: ${n(LAYOUT.cottageRotY)},`);
  lines.push(`  cottageScale: ${n(LAYOUT.cottageScale)},`);
  lines.push(`  greenhouseRotY: ${n(LAYOUT.greenhouseRotY)},`);
  lines.push(`  greenhouseScale: ${n(LAYOUT.greenhouseScale)},`);
  lines.push(`  boardRotY: ${n(LAYOUT.boardRotY)},`);
  lines.push(`  boardScale: ${n(LAYOUT.boardScale)},`);
  lines.push(`  welcomeRotY: ${n(LAYOUT.welcomeRotY)},`);
  lines.push(`  welcomeScale: ${n(LAYOUT.welcomeScale)},`);
  lines.push("};");
  lines.push("");
  lines.push("export const TREE_INSTANCES: Instance[] = [");
  for (const t of TREE_INSTANCES) {
    lines.push(
      `  { x: ${n(t.x)}, z: ${n(t.z)}, rot: ${n(t.rot)}, scale: ${n(t.scale)}, scaleY: ${n(t.scaleY)} },`,
    );
  }
  lines.push("];");
  lines.push("");
  lines.push("// src/garden/slots.ts — absolute spot positions");
  lines.push("export const PLANT_SLOTS: PlantSlot[] = [");
  for (const s of PLANT_SLOTS) {
    lines.push(
      `  { id: ${s.id}, position: [${n(s.position[0])}, 0, ${n(s.position[2])}], rotationY: ${n(s.rotationY)} },`,
    );
  }
  lines.push("];");
  return lines.join("\n");
}
