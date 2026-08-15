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

export function CharacterAvatar() {
  const root = useRef<Group>(null);
  const gltf = useGLTF(model.url);
  const { actions } = useAnimations(gltf.animations, root);
  const moving = useRef(false);

  useEffect(() => {
    const walk = actions["Walking"];
    walk?.reset().play();
    walk?.setEffectiveWeight(0);
    return () => {
      walk?.stop();
    };
  }, [actions]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const frozen = useWorldStore.getState().journalOpen;
    const isMoving = !frozen && (input.forward !== 0 || input.strafe !== 0);
    moving.current = isMoving;

    const walk = actions["Walking"];
    if (walk) {
      const target = isMoving ? 1 : 0;
      const w = walk.getEffectiveWeight();
      walk.setEffectiveWeight(w + (target - w) * Math.min(1, delta * 10));
      walk.paused = false;
    }

    // Gentle idle breathing when standing still.
    if (root.current) {
      const idle = 1 - (walk?.getEffectiveWeight() ?? 0);
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
