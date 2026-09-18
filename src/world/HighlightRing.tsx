/**
 * Brief ring under the object you just clicked. Cheap: one reused mesh,
 * position looked up only while the highlight is alive.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { character } from "./controller/CharacterController";
import { getInteractable } from "./interactables";
import { useGardenStore } from "../state/useGardenStore";
import { palette } from "./palette";

const LIFE = 0.8;

export function HighlightRing() {
  const ring = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = ring.current;
    if (!mesh) return;
    const { id, life } = character.highlight;
    if (!id || life <= 0) {
      if (mesh.visible) mesh.visible = false;
      return;
    }
    const it = getInteractable(id);
    let x: number;
    let z: number;
    let r = 1;
    if (it) {
      x = it.position[0];
      z = it.position[1];
      r = Math.max(0.8, it.focusRadius);
    } else {
      const plant = useGardenStore.getState().plants.find((p) => p.id === id);
      if (!plant) {
        mesh.visible = false;
        return;
      }
      x = plant.position[0];
      z = plant.position[2];
      r = 0.8;
    }
    mesh.visible = true;
    mesh.position.set(x, 0.05, z);
    mesh.scale.set(r, r, r);
    (mesh.material as MeshBasicMaterial).opacity = Math.max(0, life / LIFE) * 0.6;
  });

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.8, 0.96, 28]} />
      <meshBasicMaterial color={palette.flowerGold} transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}
