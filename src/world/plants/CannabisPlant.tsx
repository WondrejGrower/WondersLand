import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { palette } from "../palette";

// A fan leaf: leaflets radiating from one point, built from a shared
// flattened sphere geometry so everything reuses one buffer.
function FanLeaf({ scale = 1 }: { scale?: number }) {
  const leaflets = useMemo(() => {
    const angles = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05];
    return angles.map((a, i) => {
      const len = 1 - Math.abs(a) * 0.55;
      return { a, len, key: i };
    });
  }, []);

  return (
    <group scale={scale}>
      {leaflets.map(({ a, len, key }) => (
        <group key={key} rotation-y={a} rotation-z={-0.15}>
          <mesh position={[0, 0, len * 0.5]} scale={[0.09, 0.02, len * 0.55]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshLambertMaterial color={key % 2 === 0 ? palette.leaf : palette.leafLight} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function CannabisPlant({ position }: { position: [number, number, number] }) {
  const sway = useRef<Group>(null);

  useFrame((state) => {
    const g = sway.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.z = Math.sin(t * 0.8) * 0.035;
    g.rotation.x = Math.cos(t * 0.6) * 0.02;
  });

  const nodes = useMemo(
    () =>
      [0.55, 0.95, 1.35, 1.7].map((y, i) => ({
        y,
        rot: i * 1.4,
        scale: 1.1 - i * 0.18,
        key: i,
      })),
    [],
  );

  return (
    <group position={position} scale={1.4}>
      {/* soil mound */}
      <mesh position={[0, 0.08, 0]} scale={[0.85, 0.28, 0.85]}>
        <sphereGeometry args={[1, 14, 8]} />
        <meshLambertMaterial color={palette.soil} />
      </mesh>

      <group ref={sway}>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.035, 0.065, 2, 6]} />
          <meshLambertMaterial color={palette.stem} />
        </mesh>

        {nodes.map(({ y, rot, scale, key }) => (
          <group key={key} position={[0, y, 0]} rotation-y={rot}>
            <group position={[0.12, 0, 0]} rotation-z={0.25} rotation-x={-0.1}>
              <FanLeaf scale={scale} />
            </group>
            <group position={[-0.12, 0, 0]} rotation-y={Math.PI} rotation-z={0.25} rotation-x={-0.1}>
              <FanLeaf scale={scale} />
            </group>
          </group>
        ))}

        {/* top cola */}
        <mesh position={[0, 2.1, 0]} scale={[0.16, 0.32, 0.16]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshLambertMaterial color={palette.bud} />
        </mesh>
      </group>
    </group>
  );
}
