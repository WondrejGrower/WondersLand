import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { clearKeyboardInput, clearTouchInput, input, setKeyboardAxes } from "../state/input";
import { useWorldStore } from "../state/useWorldStore";
import { useGardenStore } from "../state/useGardenStore";
const INTERACT_RADIUS = 4;
import { GARDEN_RADIUS } from "./Ground";
import { palette } from "./palette";
import { CharacterAvatar } from "./CharacterAvatar";
import { SPAWN, WORLD_INTERACTABLES } from "./interactables";
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

/** How fast the character turns toward the direction it is walking. */
const TURN_RATE = 9;
/** How fast the camera swings back behind the character. */
const RECENTER_RATE = 2.4;
/** Manual look keeps control of the camera for this long after the last input. */
const MANUAL_HOLD = 2.5;
/** Arrow-key look speed, radians per second. */
const LOOK_KEY_RATE = 1.8;

// Scratch objects — never allocate inside useFrame.
const move = new Vector3();
const desiredCam = new Vector3();
const lookAt = new Vector3();

const candidate = new Vector3();

/** Shortest signed angular difference, wrapped to [-PI, PI]. */
function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const keyMap: Record<string, [axis: "forward" | "strafe", value: number]> = {
  KeyW: ["forward", 1],
  KeyS: ["forward", -1],
  KeyA: ["strafe", -1],
  KeyD: ["strafe", 1],
};

/** Arrow keys orbit the camera instead of moving the character. */
const lookMap: Record<string, number> = {
  ArrowLeft: 1,
  ArrowRight: -1,
};

export function Player() {
  const body = useRef<Group>(null);
  const pos = useRef(new Vector3(SPAWN[0], 0, SPAWN[1]));
  /** Camera orbit angle. */
  const camYaw = useRef(0);
  /** Character facing. */
  const charYaw = useRef(0);
  /** Seconds left of manual camera control. */
  const manual = useRef(0);
  const lookAxis = useRef(0);
  const held = useRef<Set<string>>(new Set());
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
    const keys = held.current;

    const apply = () => {
      let f = 0;
      let s = 0;
      let look = 0;
      keys.forEach((code) => {
        const entry = keyMap[code];
        if (entry) {
          if (entry[0] === "forward") f += entry[1];
          else s += entry[1];
        }
        const l = lookMap[code];
        if (l) look += l;
      });
      lookAxis.current = look;
      setKeyboardAxes(f, s);
    };

    const down = (e: KeyboardEvent) => {
      if (!keyMap[e.code] && !lookMap[e.code]) return;
      // Auto-repeat counts as proof the key is still physically down.
      if (e.repeat) {
        if (!keys.has(e.code)) keys.add(e.code);
        apply();
        return;
      }
      keys.add(e.code);
      apply();
    };
    // Always recompute on keyup, even for a key we never saw go down: a missed
    // keydown must never leave the character walking forever.
    const up = (e: KeyboardEvent) => {
      if (!keyMap[e.code] && !lookMap[e.code]) return;
      keys.delete(e.code);
      apply();
    };
    // Any focus/lifecycle change can swallow a keyup — drop keyboard state.
    const release = () => {
      keys.clear();
      lookAxis.current = 0;
      clearKeyboardInput();
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") release();
    };
    // Manual escape hatch: Escape always stops the character dead.
    const onEscape = (e: KeyboardEvent) => {
      if (e.code === "Escape") release();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keydown", onEscape, true);
    // Capture phase: a keyup can never be swallowed by a stopPropagation overlay.
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", release);
    // Coming back to the window: we cannot know what is still held, and a keyup
    // released while the window was away never arrived. Start from zero.
    window.addEventListener("focus", release);
    window.addEventListener("pagehide", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keydown", onEscape, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", release);
      window.removeEventListener("focus", release);
      window.removeEventListener("pagehide", release);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, []);


  // A lost pointerup (overlay, browser gesture, capture loss) could leave the
  // touch joystick pushed — clear it from the window as a safety net.
  useEffect(() => {
    const stop = () => clearTouchInput();
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);


  // Optional manual look: drag the scene (mouse or touch) to orbit the camera.
  // It hands control back to the automatic follow shortly after you let go.
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
      const dx = e.clientX - lastX;
      if (dx !== 0) {
        input.yawDelta -= dx * 0.005;
        manual.current = MANUAL_HOLD;
      }
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
    const frozen = store.journalOpen || store.indoorOpen || store.aboutOpen || store.comingSoon !== null;

    if (frozen) {
      held.current.clear();
      lookAxis.current = 0;
      clearKeyboardInput();
      clearTouchInput();
      input.yawDelta = 0;
    }

    // Manual camera control: arrow keys or an active drag.
    if (lookAxis.current !== 0) {
      camYaw.current += lookAxis.current * LOOK_KEY_RATE * delta;
      manual.current = MANUAL_HOLD;
    }
    camYaw.current += input.yawDelta;
    input.yawDelta = 0;
    if (manual.current > 0) manual.current = Math.max(0, manual.current - delta);

    const moving = input.forward !== 0 || input.strafe !== 0;

    if (moving) {
      const sin = Math.sin(camYaw.current);
      const cos = Math.cos(camYaw.current);
      move.set(
        input.strafe * cos - input.forward * sin,
        0,
        -input.strafe * sin - input.forward * cos,
      );
      if (move.lengthSq() > 0) {
        // Face where we are actually walking.
        const target = Math.atan2(-move.x, -move.z);
        charYaw.current += angleDelta(charYaw.current, target) * Math.min(1, delta * TURN_RATE);

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

      // Camera eases back behind the character unless the player is looking around.
      if (manual.current <= 0) {
        camYaw.current +=
          angleDelta(camYaw.current, charYaw.current) * Math.min(1, delta * RECENTER_RATE);
      }
    }


    if (body.current) {
      body.current.position.copy(pos.current);
      body.current.rotation.y = charYaw.current;
    }

    desiredCam.set(
      pos.current.x + Math.sin(camYaw.current) * CAMERA_DISTANCE,
      CAMERA_HEIGHT,
      pos.current.z + Math.cos(camYaw.current) * CAMERA_DISTANCE,
    );
    state.camera.position.lerp(desiredCam, 1 - Math.pow(0.001, delta));
    lookAt.set(pos.current.x, 1.2, pos.current.z);
    state.camera.lookAt(lookAt);

    // Proximity: pick the target the player is deepest inside, so the house
    // wins over the flower beds at its door. Only write on an actual change.
    let key: string | null = null;
    let bestScore = 1;
    for (const it of WORLD_INTERACTABLES) {
      candidate.set(it.position[0], 0, it.position[1]);
      const score = pos.current.distanceTo(candidate) / it.radius;
      if (score < bestScore) {
        bestScore = score;
        key = `world:${it.id}`;
      }
    }
    for (const plant of useGardenStore.getState().plants) {
      candidate.set(plant.position[0], 0, plant.position[2]);
      const score = pos.current.distanceTo(candidate) / INTERACT_RADIUS;
      if (score < bestScore) {
        bestScore = score;
        key = `plant:${plant.id}`;
      }
    }

    if (key !== near.current) {
      near.current = key;
      store.setTarget(
        key === null
          ? null
          : key.startsWith("world:")
            ? { kind: "world", id: key.slice(6) }
            : { kind: "plant", id: key.slice(6) },
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
