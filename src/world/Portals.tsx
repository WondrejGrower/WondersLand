import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { palette } from "./palette";
import { useWorldStore } from "../state/useWorldStore";
import { WORLD_INTERACTABLES, type WorldInteractable } from "./interactables";

/**
 * Placeholder portals for the Plaza and for visiting a friend's garden.
 * They are scenery + an interaction hook; neither destination exists yet.
 */
const PORTALS = WORLD_INTERACTABLES.filter((it) => it.action === "coming-soon");

function Portal({ data }: { data: WorldInteractable }) {
  const ring = useRef<Mesh>(null);
  const veil = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.25;
    if (veil.current) {
      const mat = veil.current.material as { opacity: number };
      mat.opacity = 0.28 + Math.sin(t * 1.4) * 0.06;
    }
  });

  const open = () => {
    if (data.comingSoon) useWorldStore.getState().openComingSoon(data.comingSoon);
  };

  return (
    <group
      position={[data.position[0], 0, data.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {/* fake contact shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[1.5, 16]} />
        <meshBasicMaterial color={palette.shadow} transparent opacity={0.2} />
      </mesh>
      {/* stone base */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[1.25, 1.45, 0.4, 12]} />
        <meshLambertMaterial color={palette.stoneDark} />
      </mesh>
      {/* stone arch ring */}
      <mesh ref={ring} position={[0, 2, 0]}>
        <torusGeometry args={[1.25, 0.16, 6, 20]} />
        <meshLambertMaterial color={palette.stone} />
      </mesh>
      {/* soft veil inside the ring */}
      <mesh ref={veil} position={[0, 2, 0]}>
        <circleGeometry args={[1.18, 20]} />
        <meshBasicMaterial color={palette.glass} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {/* posts */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]}>
          <boxGeometry args={[0.26, 1.9, 0.26]} />
          <meshLambertMaterial color={palette.stone} />
        </mesh>
      ))}
    </group>
  );
}

export function Portals() {
  return (
    <group>
      {PORTALS.map((portal) => (
        <Portal key={portal.id} data={portal} />
      ))}
    </group>
  );
}
