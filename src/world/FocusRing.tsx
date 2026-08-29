import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { useWorldStore } from "../state/useWorldStore";
import { useGardenStore } from "../state/useGardenStore";
import { getInteractable } from "./interactables";
import { palette } from "./palette";

/**
 * Subtle in-range cue: one soft pulsing ring under whatever the player can
 * currently interact with. Re-renders only when the target changes; the pulse
 * itself runs in useFrame without touching React state.
 */
export function FocusRing() {
  const target = useWorldStore((s) => s.target);
  const plants = useGardenStore((s) => s.plants);
  const ring = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ring.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.05;
    ring.current.scale.setScalar(pulse);
    const mat = ring.current.material as { opacity: number };
    mat.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2.2) * 0.1;
  });

  if (!target) return null;

  let x = 0;
  let z = 0;
  let radius = 1;

  if (target.kind === "world") {
    const data = getInteractable(target.id);
    if (!data) return null;
    x = data.position[0];
    z = data.position[1];
    radius = data.focusRadius;
  } else {
    const plant = plants.find((p) => p.id === target.id);
    if (!plant) return null;
    x = plant.position[0];
    z = plant.position[2];
    radius = 0.9;
  }

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} position={[x, 0.05, z]}>
      <ringGeometry args={[radius * 0.86, radius, 28]} />
      <meshBasicMaterial
        color={palette.flowerCream}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}
