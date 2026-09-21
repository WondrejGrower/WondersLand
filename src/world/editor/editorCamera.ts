/**
 * Strategy-view camera for the hidden layout editor.
 *
 * Plain module singleton (no React state, no per-frame allocation): the editor
 * camera orbits a ground target instead of following the character.
 */
import { GARDEN_RADIUS } from "../layout";
import { buildItems } from "./items";

export const MIN_DISTANCE = 8;
export const MAX_DISTANCE = 70;
export const MIN_PITCH = 0.35;
export const MAX_PITCH = 1.35;

export const editorCamera = {
  targetX: 0,
  targetZ: 0,
  distance: 34,
  yaw: 0,
  pitch: 0.95,
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function panBy(dx: number, dz: number) {
  const x = editorCamera.targetX + dx;
  const z = editorCamera.targetZ + dz;
  const d = Math.hypot(x, z);
  const limit = GARDEN_RADIUS + 6;
  if (d > limit) {
    const k = limit / d;
    editorCamera.targetX = x * k;
    editorCamera.targetZ = z * k;
    return;
  }
  editorCamera.targetX = x;
  editorCamera.targetZ = z;
}

export function zoomBy(factor: number) {
  editorCamera.distance = clamp(editorCamera.distance * factor, MIN_DISTANCE, MAX_DISTANCE);
}

export function orbitBy(dYaw: number, dPitch: number) {
  editorCamera.yaw += dYaw;
  editorCamera.pitch = clamp(editorCamera.pitch + dPitch, MIN_PITCH, MAX_PITCH);
}

export function focusOn(x: number, z: number) {
  editorCamera.targetX = x;
  editorCamera.targetZ = z;
  editorCamera.distance = clamp(editorCamera.distance, MIN_DISTANCE, 22);
}

/** Pull back far enough that every editable object fits on screen. */
export function frameAll() {
  const items = buildItems();
  if (!items.length) return reset();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const it of items) {
    if (it.x < minX) minX = it.x;
    if (it.x > maxX) maxX = it.x;
    if (it.z < minZ) minZ = it.z;
    if (it.z > maxZ) maxZ = it.z;
  }
  editorCamera.targetX = (minX + maxX) / 2;
  editorCamera.targetZ = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ);
  editorCamera.distance = clamp(span * 1.15 + 8, MIN_DISTANCE, MAX_DISTANCE);
  editorCamera.pitch = 0.95;
}

export function reset() {
  editorCamera.targetX = 0;
  editorCamera.targetZ = 0;
  editorCamera.distance = 34;
  editorCamera.yaw = 0;
  editorCamera.pitch = 0.95;
}
