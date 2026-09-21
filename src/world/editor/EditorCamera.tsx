/**
 * Drives the R3F camera while the hidden layout editor is open: an orbiting
 * bird's-eye view instead of the character follow-cam. Mounted only in edit
 * mode, so the normal game loop is untouched.
 */
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { editorCamera } from "./editorCamera";

// Scratch objects — never allocate inside useFrame.
const desired = new Vector3();
const look = new Vector3();

export function EditorCamera() {
  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const { targetX, targetZ, distance, yaw, pitch } = editorCamera;
    const horizontal = Math.cos(pitch) * distance;
    desired.set(
      targetX + Math.sin(yaw) * horizontal,
      Math.sin(pitch) * distance,
      targetZ + Math.cos(yaw) * horizontal,
    );
    state.camera.position.lerp(desired, 1 - Math.pow(0.0005, delta));
    look.set(targetX, 0, targetZ);
    state.camera.lookAt(look);
  });
  return null;
}
