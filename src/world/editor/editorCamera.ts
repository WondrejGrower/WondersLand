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
export const MIN_PITCH = 0.55;
export const MAX_PITCH = 1.2;

const MAX_POINTER_DELTA = 80;
const CAMERA_FOV_RADIANS = (55 * Math.PI) / 180;

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

function panBy(dx: number, dz: number) {
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

/**
 * Move the strategy-camera target from a screen-space drag. Unlike repeatedly
 * raycasting the ground through the easing render camera, this has no feedback
 * loop and keeps the same direction while the camera is moving.
 */
export function panByScreen(dx: number, dy: number, viewportHeight: number) {
  const safeHeight = Math.max(1, viewportHeight);
  const px = clamp(dx, -MAX_POINTER_DELTA, MAX_POINTER_DELTA);
  const py = clamp(dy, -MAX_POINTER_DELTA, MAX_POINTER_DELTA);
  const visibleHeight = 2 * editorCamera.distance * Math.tan(CAMERA_FOV_RADIANS / 2);
  const worldPerPixel = visibleHeight / safeHeight;
  const sin = Math.sin(editorCamera.yaw);
  const cos = Math.cos(editorCamera.yaw);

  panBy(
    (-px * cos - py * sin) * worldPerPixel,
    (px * sin - py * cos) * worldPerPixel,
  );
}

export function zoomBy(factor: number) {
  editorCamera.distance = clamp(
    editorCamera.distance * clamp(factor, 0.75, 1.34),
    MIN_DISTANCE,
    MAX_DISTANCE,
  );
}

export function orbitBy(dYaw: number, dPitch: number) {
  editorCamera.yaw += clamp(dYaw, -0.18, 0.18);
  editorCamera.pitch = clamp(
    editorCamera.pitch + clamp(dPitch, -0.12, 0.12),
    MIN_PITCH,
    MAX_PITCH,
  );
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
