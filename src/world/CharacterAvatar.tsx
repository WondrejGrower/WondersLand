import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { input } from "../state/input";
import { useWorldStore } from "../state/useWorldStore";
import model from "../assets/village-boy.glb.asset.json";

// Uploaded rigged character (Meshy "Village Boy Qing"). Native height ~1.76,
// origin at the feet — scaled to the ~1.9 gameplay height of the old avatar.
const SCALE = 1.08;

// The GLB ships only "Walking" and "Running" — there is no Idle clip. Fading
// the walk out to weight 0 left the rig in its bind/T-pose, so instead the walk
// stays at full weight and eases to a stop on its passing pose (the frame where
// the legs are closest together), which reads as a natural stand.
const NEUTRAL_FRACTION = 0.4516;

export function CharacterAvatar() {
  const root = useRef<Group>(null);
  const gltf = useGLTF(model.url);
  const { actions } = useAnimations(gltf.animations, root);
  const speed = useRef(0);

  useEffect(() => {
    const walk = actions["Walking"];
    if (!walk) return;
    walk.reset().play();
    walk.setEffectiveWeight(1);
    walk.timeScale = 0;
    walk.time = walk.getClip().duration * NEUTRAL_FRACTION;
    return () => {
      walk.stop();
    };
  }, [actions]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const frozen = useWorldStore.getState().journalOpen;
    const isMoving = !frozen && (input.forward !== 0 || input.strafe !== 0);

    const walk = actions["Walking"];
    if (walk) {
      // Ease playback speed instead of weight, so the skeleton is always posed.
      const target = isMoving ? 1 : 0;
      speed.current += (target - speed.current) * Math.min(1, delta * 8);
      if (!isMoving && speed.current < 0.02) {
        // Settle onto the neutral standing frame.
        speed.current = 0;
        const neutral = walk.getClip().duration * NEUTRAL_FRACTION;
        walk.time += (neutral - walk.time) * Math.min(1, delta * 6);
      }
      walk.timeScale = speed.current;
      walk.setEffectiveWeight(1);
      walk.paused = false;
    }

    // Gentle idle breathing when standing still.
    if (root.current) {
      const idle = 1 - speed.current;
      root.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.015 * idle;
    }
  });


  return (
    <group ref={root} rotation-y={Math.PI} scale={SCALE}>
      <primitive object={gltf.scene} />
    </group>
  );
}

useGLTF.preload(model.url);
