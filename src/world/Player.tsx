import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { clearKeyboardInput, clearTouchInput, input, setKeyboardAxes } from "../state/input";
import { useWorldStore, worldFrozen } from "../state/useWorldStore";
import { useGardenStore } from "../state/useGardenStore";
import { worldSettings } from "../state/useWorldSettingsStore";
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
import {
  advanceWaypoint,
  character,
  currentWaypoint,
  moveDirection,
  stop,
} from "./controller/CharacterController";
import { setDynamicColliders } from "./nav/path";
import { tickPendingInteraction } from "./interactions";

const WALK_SPEED = 4.2;
const RUN_SPEED = 5.8;
const CAMERA_DISTANCE = 6;
const CAMERA_HEIGHT = 3.1;
/** Diary plants are solid too, but slim enough to walk right up to. */
const PLANT_COLLIDER_RADIUS = 0.45;
/** How close to a waypoint counts as reached. */
const ARRIVE = 0.22;

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
  /** Seconds left of manual camera control. */
  const manual = useRef(0);
  const lookAxis = useRef(0);
  const held = useRef<Set<string>>(new Set());
  const near = useRef<string | null>(null);

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
  // Path planning must see the same obstacles the walker does.
  useEffect(() => setDynamicColliders(plantColliders.current), [plants]);

  // The controller owns the avatar position; seed it at the spawn point.
  useEffect(() => {
    character.pos.set(SPAWN[0], 0, SPAWN[1]);
    character.charYaw = 0;
    character.camYaw = 0;
    stop();
    if (import.meta.env.DEV) {
      assertSpawnClear(SPAWN[0], SPAWN[1]);
      // Dev-only inspection hook for automated checks.
      (window as unknown as { __wl?: typeof character }).__wl = character;
    }
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
      if (e.code === "Escape") {
        release();
        stop();
      }
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

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const store = useWorldStore.getState();
    const settings = worldSettings();
    const frozen = worldFrozen(store);

    // Safety net: if the document is not focused (another window, the editor
    // panel, a browser dialog) no keyup will ever reach us, so never keep
    // walking on stale key state.
    const unfocused = typeof document !== "undefined" && !document.hasFocus();

    if (frozen || unfocused) {
      held.current.clear();
      lookAxis.current = 0;
      clearKeyboardInput();
      clearTouchInput();
      input.yawDelta = 0;
      if (frozen) stop();
    }

    // ---- Camera orbit (arrow keys, drag, or automatic follow) ----
    const sens = settings.camera.sensitivity * (settings.camera.invert ? -1 : 1);
    if (lookAxis.current !== 0) {
      character.camYaw += lookAxis.current * LOOK_KEY_RATE * sens * delta;
      manual.current = MANUAL_HOLD;
    }
    character.camYaw += input.yawDelta;
    input.yawDelta = 0;
    if (manual.current > 0) manual.current = Math.max(0, manual.current - delta);

    // ---- Direction input (WASD / joystick) ----
    const wasdAllowed = settings.controls.movementMode !== "click";
    const axisF = wasdAllowed ? input.forward : 0;
    const axisS = wasdAllowed ? input.strafe : 0;
    moveDirection(axisF, axisS);

    const running = settings.controls.runMode !== "walk";
    const speed = running ? RUN_SPEED : WALK_SPEED;

    // ---- Locomotion: direction command wins, otherwise follow the path ----
    let moving = false;
    if (axisF !== 0 || axisS !== 0) {
      const sin = Math.sin(character.camYaw);
      const cos = Math.cos(character.camYaw);
      move.set(axisS * cos - axisF * sin, 0, -axisS * sin - axisF * cos);
      moving = move.lengthSq() > 0;
    } else {
      const wp = currentWaypoint();
      if (wp) {
        move.set(wp.x - character.pos.x, 0, wp.z - character.pos.z);
        if (move.lengthSq() < ARRIVE * ARRIVE) {
          advanceWaypoint();
          moving = false;
        } else {
          moving = true;
        }
      }
    }

    if (moving) {
      // Face where we are actually walking.
      const target = Math.atan2(-move.x, -move.z);
      if (settings.camera.rotateTowardMovement) {
        character.charYaw +=
          angleDelta(character.charYaw, target) * Math.min(1, delta * TURN_RATE);
      } else {
        character.charYaw = target;
      }

      move.normalize().multiplyScalar(speed * delta);
      let nx = character.pos.x + move.x;
      let nz = character.pos.z + move.z;
      const dist = Math.hypot(nx, nz);
      if (dist > GARDEN_RADIUS - 1) {
        const k = (GARDEN_RADIUS - 1) / dist;
        nx *= k;
        nz *= k;
      }
      // Push out of solid scenery; the surviving tangential motion is the slide.
      resolveMove(nx, nz, WORLD_COLLIDERS, plantColliders.current);
      character.pos.x = resolved.x;
      character.pos.z = resolved.z;

      // Camera eases back behind the character unless the player is looking around.
      if (settings.camera.followCharacter && manual.current <= 0) {
        character.camYaw +=
          angleDelta(character.camYaw, character.charYaw) *
          Math.min(1, delta * RECENTER_RATE * (settings.accessibility.reduceCameraMotion ? 0.4 : 1));
      }
    }

    // ---- Queued click-to-interact ----
    if (!frozen) tickPendingInteraction();

    // ---- Transient visuals ----
    if (character.marker.life > 0) character.marker.life -= delta;
    if (character.highlight.life > 0) {
      character.highlight.life -= delta;
      if (character.highlight.life <= 0) character.highlight.id = null;
    }

    if (body.current) {
      body.current.position.copy(character.pos);
      body.current.rotation.y = character.charYaw;
    }

    const distance = CAMERA_DISTANCE * settings.camera.distance * character.zoom;
    desiredCam.set(
      character.pos.x + Math.sin(character.camYaw) * distance,
      CAMERA_HEIGHT * (0.6 + 0.4 * settings.camera.distance * character.zoom),
      character.pos.z + Math.cos(character.camYaw) * distance,
    );
    const ease = settings.accessibility.reducedMotion ? 0.0001 : 0.001;
    state.camera.position.lerp(desiredCam, 1 - Math.pow(ease, delta));
    lookAt.set(character.pos.x, 1.2, character.pos.z);
    state.camera.lookAt(lookAt);

    // Proximity: pick the target the player is deepest inside, so the house
    // wins over the flower beds at its door. Only write on an actual change.
    let key: string | null = null;
    let bestScore = 1;
    for (const it of WORLD_INTERACTABLES) {
      candidate.set(it.position[0], 0, it.position[1]);
      const score = character.pos.distanceTo(candidate) / it.radius;
      if (score < bestScore) {
        bestScore = score;
        key = `world:${it.id}`;
      }
    }
    for (const plant of useGardenStore.getState().plants) {
      candidate.set(plant.position[0], 0, plant.position[2]);
      const score = character.pos.distanceTo(candidate) / INTERACT_RADIUS;
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
