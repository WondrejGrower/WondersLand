/**
 * In-canvas half of the hidden layout editor: a marker over every editable
 * object plus drag-on-the-ground handling. Mounted only while the editor is
 * open, so the normal scene never pays for it.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { stop } from "../controller/CharacterController";
import { buildItems } from "./items";
import { orbitBy, panByScreen, zoomBy } from "./editorCamera";
import { round, useLayoutEditorStore } from "./useLayoutEditorStore";

/** How close to a marker, in screen pixels, a press counts as grabbing it. */
const GRAB_PIXELS = 30;

const ray = new Raycaster();
const ndc = new Vector2();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const projected = new Vector3();

function snap(value: number, step: number) {
  return round(Math.round(value / step) * step);
}

export function EditorLayer() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const version = useLayoutEditorStore((s) => s.version);
  const selected = useLayoutEditorStore((s) => s.selected);

  useEffect(() => {
    const el = gl.domElement;
    let dragging: string | null = null;
    let mode: "none" | "pan" | "orbit" = "none";
    let lastX = 0;
    let lastY = 0;
    // Active touches, for pinch zoom / two-finger orbit.
    const touches = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let pinchMidX = 0;
    let pinchMidY = 0;

    const toGround = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(groundPlane, hit) ? hit : null;
    };

    const beginPinch = () => {
      if (touches.size !== 2) return;
      const [a, b] = [...touches.values()];
      mode = "orbit";
      dragging = null;
      pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      pinchMidX = (a!.x + b!.x) / 2;
      pinchMidY = (a!.y + b!.y) / 2;
    };

    const cancelGesture = () => {
      dragging = null;
      mode = "none";
      pinchDist = 0;
      touches.clear();
    };

    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      if (e.pointerType === "touch") touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastX = e.clientX;
      lastY = e.clientY;

      // Two fingers: pinch zoom + orbit, never object dragging.
      if (touches.size === 2) {
        beginPinch();
        return;
      }

      if (e.pointerType === "mouse" && e.button !== 0) {
        mode = "orbit";
        return;
      }

      const store = useLayoutEditorStore.getState();
      // Camera mode never grabs scenery, so the map is always draggable.
      let best: { id: string; d: number } | null = null;
      if (store.pointerMode === "edit") {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        for (const item of buildItems()) {
          projected.set(item.x, 0, item.z).project(camera);
          const sx = ((projected.x + 1) / 2) * rect.width;
          const sy = ((1 - projected.y) / 2) * rect.height;
          const d = Math.hypot(sx - px, sy - py);
          if (d < GRAB_PIXELS && (!best || d < best.d)) best = { id: item.id, d };
        }
      }
      if (best) {
        dragging = best.id;
        mode = "none";
        store.select(best.id);
        stop();
        return;
      }
      // Empty ground: drag the map using stable screen-space deltas. Ground
      // raycasts are intentionally not used here because the render camera is
      // easing at the same time and would feed its own movement back into pan.
      mode = "pan";
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch" && touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const midX = (a!.x + b!.x) / 2;
        const midY = (a!.y + b!.y) / 2;
        if (pinchDist > 0 && dist > 0) zoomBy(pinchDist / dist);
        orbitBy((midX - pinchMidX) * -0.006, (midY - pinchMidY) * 0.004);
        pinchDist = dist;
        pinchMidX = midX;
        pinchMidY = midY;
        return;
      }

      if (mode === "orbit") {
        orbitBy((e.clientX - lastX) * -0.006, (e.clientY - lastY) * 0.004);
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }

      if (mode === "pan") {
        const rect = el.getBoundingClientRect();
        panByScreen(e.clientX - lastX, e.clientY - lastY, rect.height);
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }

      if (!dragging) return;
      const point = toGround(e.clientX, e.clientY);
      if (!point) return;
      const step = useLayoutEditorStore.getState().step;
      useLayoutEditorStore
        .getState()
        .update(dragging, { x: snap(point.x, step), z: snap(point.z, step) });
    };

    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      dragging = null;
      pinchDist = 0;

      // When one finger remains after a pinch, start a fresh pan baseline.
      // Reusing the old pinch midpoint causes the first one-finger move to jump.
      if (e.pointerType === "touch" && touches.size === 1) {
        const remaining = [...touches.values()][0];
        if (remaining) {
          lastX = remaining.x;
          lastY = remaining.y;
          mode = "pan";
        }
      } else {
        mode = "none";
      }
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    const lostCapture = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return;
      touches.delete(e.pointerId);
      dragging = null;
      mode = "none";
      pinchDist = 0;
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY > 0 ? 1.1 : 1 / 1.1);
    };

    const contextMenu = (e: MouseEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", lostCapture);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", contextMenu);
    window.addEventListener("blur", cancelGesture);
    const unsubscribe = useLayoutEditorStore.subscribe((state, previous) => {
      if (state.pointerMode !== previous.pointerMode) cancelGesture();
    });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", lostCapture);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", contextMenu);
      window.removeEventListener("blur", cancelGesture);
      unsubscribe();
    };
  }, [gl, camera]);

  // Rebuilt on every edit; the editor is not a per-frame concern.
  const items = buildItems();
  void version;

  return (
    <group>
      {items.map((item) => {
        const active = item.id === selected;
        return (
          <group key={item.id} position={[item.x, 0, item.z]}>
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
              <ringGeometry args={[0.5, 0.66, 20]} />
              <meshBasicMaterial
                color={active ? "#ffd166" : "#7fd1ae"}
                transparent
                opacity={active ? 0.95 : 0.45}
                depthWrite={false}
                depthTest={false}
              />
            </mesh>
            <mesh position={[0, active ? 1.6 : 1.1, 0]}>
              <cylinderGeometry args={[0.035, 0.035, active ? 3.2 : 2.2, 6]} />
              <meshBasicMaterial
                color={active ? "#ffd166" : "#7fd1ae"}
                transparent
                opacity={active ? 0.9 : 0.35}
                depthWrite={false}
                depthTest={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
