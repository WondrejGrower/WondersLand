import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { input } from "../state/input";
import { useWorldStore } from "../state/useWorldStore";
import { useGardenStore } from "../state/useGardenStore";
const INTERACT_RADIUS = 4;
import { GARDEN_RADIUS } from "./Ground";
import { palette } from "./palette";
import { CharacterAvatar } from "./CharacterAvatar";
import { COTTAGE_INTERACT_RADIUS, COTTAGE_POSITION } from "./Cottage";
import {
  WORLD_COLLIDERS,
  assertSpawnClear,
  resolveMove,
  resolved,
  type Collider,
} from "./collision";


const SPEED = 4.2;
const CAMERA_DISTANCE = 6;
const CAMERA_HEIGHT = 3.1;
/** Diary plants are solid too, but slim enough to walk right up to. */
const PLANT_COLLIDER_RADIUS = 0.45;
const SPAWN: [number, number] = [0, 8];

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
  const pos = useRef(new Vector3(SPAWN[0], 0, SPAWN[1]));
  const yaw = useRef(0);
  const near = useRef<string | null>(null);
  const gl = useThree((s) => s.gl);

  // Diary plants are dynamic scenery: rebuild their colliders only when the
  // list changes, never inside useFrame.
  const plants = useGardenStore((s) => s.plants);
  const plantColliders = useRef<Collider[]>([]);
  plantColliders.current = useMemo(
    () =>
      plants.map((p) => ({
        kind: "circle" as const,
        x: p.position[0],
        z: p.position[2],
        r: PLANT_COLLIDER_RADIUS,
      })),
    [plants],
  );

  useEffect(() => {
    if (import.meta.env.DEV) assertSpawnClear(SPAWN[0], SPAWN[1]);
  }, []);


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
    const frozen = store.journalOpen || store.indoorOpen;

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
        let nx = pos.current.x + move.x;
        let nz = pos.current.z + move.z;
        const dist = Math.hypot(nx, nz);
        if (dist > GARDEN_RADIUS - 1) {
          const k = (GARDEN_RADIUS - 1) / dist;
          nx *= k;
          nz *= k;
        }
        // Push out of solid scenery; the surviving tangential motion is the slide.
        resolveMove(nx, nz, WORLD_COLLIDERS, plantColliders.current);
        pos.current.x = resolved.x;
        pos.current.z = resolved.z;
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

    // Proximity: the cottage wins over plants so its door isn't fighting the
    // flower beds. Only write to the store when the target actually changes.
    candidate.set(COTTAGE_POSITION[0], 0, COTTAGE_POSITION[2]);
    const cottageDist = pos.current.distanceTo(candidate);

    let key: string | null = null;
    if (cottageDist < COTTAGE_INTERACT_RADIUS) {
      key = "cottage";
    } else {
      let best = INTERACT_RADIUS;
      for (const plant of useGardenStore.getState().plants) {
        candidate.set(plant.position[0], 0, plant.position[2]);
        const dist = pos.current.distanceTo(candidate);
        if (dist < best) {
          best = dist;
          key = plant.id;
        }
      }
    }

    if (key !== near.current) {
      near.current = key;
      store.setTarget(
        key === null ? null : key === "cottage" ? { kind: "cottage" } : { kind: "plant", id: key },
      );
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

