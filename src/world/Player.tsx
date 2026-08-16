import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { input } from "../state/input";
import { useWorldStore } from "../state/useWorldStore";
import { useNostrStore } from "../state/useNostrStore";
const INTERACT_RADIUS = 4;
import { GARDEN_RADIUS } from "./Ground";
import { palette } from "./palette";
import { CharacterAvatar } from "./CharacterAvatar";


const SPEED = 4.2;
const CAMERA_DISTANCE = 6;
const CAMERA_HEIGHT = 3.1;

// Scratch objects — never allocate inside useFrame.
const move = new Vector3();
const desiredCam = new Vector3();
const lookAt = new Vector3();

const candidate = new Vector3();

const keyMap: Record<string, [axis: "forward" | "strafe", value: number]> = {
  KeyW: ["forward", 1],
  ArrowUp: ["forward", 1],
  KeyS: ["forward", -1],
  ArrowDown: ["forward", -1],
  KeyA: ["strafe", -1],
  ArrowLeft: ["strafe", -1],
  KeyD: ["strafe", 1],
  ArrowRight: ["strafe", 1],
};

export function Player() {
  const body = useRef<Group>(null);
  const pos = useRef(new Vector3(0, 0, 8));
  const yaw = useRef(0);
  const near = useRef<string | null>(null);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const held = new Set<string>();

    const apply = () => {
      let f = 0;
      let s = 0;
      held.forEach((code) => {
        const entry = keyMap[code];
        if (!entry) return;
        if (entry[0] === "forward") f += entry[1];
        else s += entry[1];
      });
      input.forward = Math.max(-1, Math.min(1, f));
      input.strafe = Math.max(-1, Math.min(1, s));
    };

    const down = (e: KeyboardEvent) => {
      if (!keyMap[e.code]) return;
      held.add(e.code);
      apply();
    };
    const up = (e: KeyboardEvent) => {
      held.delete(e.code);
      apply();
    };
    const blur = () => {
      held.clear();
      apply();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      blur();
    };
  }, []);

  // Drag to look — works with mouse and touch, no pointer lock required.
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;

    const start = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture?.(e.pointerId);
    };
    const moveHandler = (e: PointerEvent) => {
      if (!dragging) return;
      input.yawDelta -= (e.clientX - lastX) * 0.005;
      lastX = e.clientX;
    };
    const end = (e: PointerEvent) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", start);
    el.addEventListener("pointermove", moveHandler);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    return () => {
      el.removeEventListener("pointerdown", start);
      el.removeEventListener("pointermove", moveHandler);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
  }, [gl]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useWorldStore.getState();
    const frozen = store.journalOpen;

    if (frozen) {
      input.forward = 0;
      input.strafe = 0;
      input.yawDelta = 0;
    }

    yaw.current += input.yawDelta;
    input.yawDelta = 0;

    if (input.forward !== 0 || input.strafe !== 0) {
      const sin = Math.sin(yaw.current);
      const cos = Math.cos(yaw.current);
      move.set(
        input.strafe * cos - input.forward * sin,
        0,
        -input.strafe * sin - input.forward * cos,
      );
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(SPEED * delta);
        pos.current.add(move);
        const dist = Math.hypot(pos.current.x, pos.current.z);
        if (dist > GARDEN_RADIUS - 1) {
          pos.current.multiplyScalar((GARDEN_RADIUS - 1) / dist);
        }
      }
    }

    if (body.current) {
      body.current.position.copy(pos.current);
      body.current.rotation.y = yaw.current;
    }

    desiredCam.set(
      pos.current.x + Math.sin(yaw.current) * CAMERA_DISTANCE,
      CAMERA_HEIGHT,
      pos.current.z + Math.cos(yaw.current) * CAMERA_DISTANCE,
    );
    state.camera.position.lerp(desiredCam, 1 - Math.pow(0.001, delta));
    lookAt.set(pos.current.x, 1.2, pos.current.z);
    state.camera.lookAt(lookAt);

    // Proximity: closest plant within reach wins. Only write to the store when
    // the focused plant actually changes.
    let focusId: string | null = null;
    let best = INTERACT_RADIUS;
    for (const plant of useNostrStore.getState().plants) {
      candidate.set(plant.position[0], 0, plant.position[2]);
      const dist = pos.current.distanceTo(candidate);
      if (dist < best) {
        best = dist;
        focusId = plant.id;
      }
    }
    if (focusId !== near.current) {
      near.current = focusId;
      store.setFocusedPlant(focusId);
    }
  });

  return (
    <group ref={body}>
      <CharacterAvatar />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color={palette.groundDark} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

