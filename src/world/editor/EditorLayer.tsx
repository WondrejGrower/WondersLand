/**
 * In-canvas half of the hidden layout editor: a marker over every editable
 * object plus drag-on-the-ground handling. Mounted only while the editor is
 * open, so the normal scene never pays for it.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { input } from "../../state/input";
import { stop } from "../controller/CharacterController";
import { buildItems } from "./items";
import { round, useLayoutEditorStore } from "./useLayoutEditorStore";

/** How close to a marker a click counts as grabbing it. */
const GRAB_RADIUS = 2.2;

const ray = new Raycaster();
const ndc = new Vector2();
const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();

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
    let lastX = 0;
    let orbiting = false;

    const toGround = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(groundPlane, hit) ? hit : null;
    };

    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      lastX = e.clientX;
      if (e.pointerType === "mouse" && e.button !== 0) {
        orbiting = true;
        return;
      }
      const point = toGround(e.clientX, e.clientY);
      if (!point) return;
      const store = useLayoutEditorStore.getState();
      let best: { id: string; d: number } | null = null;
      for (const item of buildItems()) {
        const d = Math.hypot(item.x - point.x, item.z - point.z);
        if (d < GRAB_RADIUS && (!best || d < best.d)) best = { id: item.id, d };
      }
      if (best) {
        dragging = best.id;
        store.select(best.id);
        stop();
      }
    };

    const move = (e: PointerEvent) => {
      if (orbiting) {
        input.yawDelta -= (e.clientX - lastX) * 0.005;
        lastX = e.clientX;
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
      el.releasePointerCapture?.(e.pointerId);
      dragging = null;
      orbiting = false;
    };

    const contextMenu = (e: MouseEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", contextMenu);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("contextmenu", contextMenu);
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
