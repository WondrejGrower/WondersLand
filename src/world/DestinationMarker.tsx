/**
 * Where you just tapped: a soft ring that fades out in under a second.
 * Reads controller state directly — no React state, no allocation per frame.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial } from "three";
import { character } from "./controller/CharacterController";
import { palette } from "./palette";

const LIFE = 0.9;

export function DestinationMarker() {
  const ring = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = ring.current;
    if (!mesh) return;
    const life = character.marker.life;
    if (life <= 0) {
      if (mesh.visible) mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.set(character.marker.x, 0.04, character.marker.z);
    const t = 1 - life / LIFE;
    const scale = 0.7 + t * 0.6;
    mesh.scale.set(scale, scale, scale);
    (mesh.material as MeshBasicMaterial).opacity = Math.max(0, life / LIFE) * 0.75;
  });

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.34, 0.46, 24]} />
      <meshBasicMaterial color={palette.leaf} transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}
