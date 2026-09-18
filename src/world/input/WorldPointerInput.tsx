/**
 * Pointer input for the world: tap/click to move or interact, drag to orbit,
 * wheel/pinch to zoom.
 *
 * It only ever issues controller commands, so it stays independent of both the
 * avatar implementation and the keyboard input path.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3, type Object3D } from "three";
import { input } from "../../state/input";
import { useWorldStore, worldFrozen } from "../../state/useWorldStore";
import { worldSettings } from "../../state/useWorldSettingsStore";
import { character, moveTo, showMarker, stop } from "../controller/CharacterController";
import { pickInteractableAt, requestInteract } from "../interactions";
import type { InteractRequest } from "../controller/CharacterController";

/** Pointer travel (px) above which a gesture is a camera drag, not a tap. */
const DRAG_THRESHOLD = 10;
/** Tapping this close to your own feet just stops you. */
const STOP_RADIUS = 0.7;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.9;

// Scratch — allocated once, never per event.
const ray = new Raycaster();
const ndc = new Vector2();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();

/** Walk up the hierarchy to the nearest object tagged as interactable. */
function taggedInteractable(object: Object3D | null): InteractRequest | null {
  for (let node = object; node; node = node.parent) {
    const tag = node.userData?.["interactable"];
    if (typeof tag !== "string") continue;
    return tag.startsWith("plant:")
      ? { kind: "plant", id: tag.slice(6) }
      : { kind: "world", id: tag };
  }
  return null;
}

export function WorldPointerInput() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
    let dragging = false;
    let pinchDistance = 0;

    const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;

    const tap = (clientX: number, clientY: number) => {
      const store = useWorldStore.getState();
      if (worldFrozen(store)) return;
      const settings = worldSettings();
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);

      // A tagged mesh under the cursor wins: clicking a tall object must not
      // read as a click on the ground behind it.
      for (const intersection of ray.intersectObjects(scene.children, true)) {
        const tagged = taggedInteractable(intersection.object);
        if (tagged) {
          requestInteract(tagged);
          return;
        }
      }

      if (!ray.ray.intersectPlane(groundPlane, hit)) return;

      // Standing near something still lets a ground click act on it.
      const target = pickInteractableAt(hit.x, hit.z);
      if (target) {
        requestInteract(target);
        return;
      }

      const tapMoveAllowed =
        settings.controls.movementMode !== "wasd" &&
        (!coarse || settings.controls.mobileMovement === "tap");
      if (!tapMoveAllowed) return;

      if (Math.hypot(hit.x - character.pos.x, hit.z - character.pos.z) < STOP_RADIUS) {
        stop();
        return;
      }
      character.pending = null;
      moveTo(hit.x, hit.z);
      if (settings.controls.movementMarker) showMarker(hit.x, hit.z);
    };

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
      if (pointers.size === 1) dragging = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      }
      el.setPointerCapture?.(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      p.x = e.clientX;
      p.y = e.clientY;

      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinchDistance > 0 && d > 0) {
          const zoomSens = worldSettings().camera.zoomSensitivity;
          character.zoom = clampZoom(character.zoom * (1 + ((pinchDistance - d) / 300) * zoomSens));
        }
        pinchDistance = d;
        dragging = true;
        return;
      }

      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > DRAG_THRESHOLD) dragging = true;
      if (!dragging || dx === 0) return;
      const settings = worldSettings();
      const sens = settings.camera.sensitivity * (settings.camera.invert ? -1 : 1);
      input.yawDelta -= dx * 0.005 * sens;
    };

    const up = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      el.releasePointerCapture?.(e.pointerId);
      if (pointers.size < 2) pinchDistance = 0;
      if (!p || dragging) return;
      // Right/middle button is camera only.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      tap(e.clientX, e.clientY);
    };

    const cancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDistance = 0;
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSens = worldSettings().camera.zoomSensitivity;
      character.zoom = clampZoom(character.zoom * (1 + (e.deltaY / 600) * zoomSens));
    };

    const contextMenu = (e: MouseEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", contextMenu);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", contextMenu);
    };
  }, [gl, camera, scene]);

  return null;
}

function clampZoom(value: number): number {
  return value < MIN_ZOOM ? MIN_ZOOM : value > MAX_ZOOM ? MAX_ZOOM : value;
}
