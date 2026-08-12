import { useMemo } from "react";
import { Color, InstancedMesh, Matrix4, Object3D } from "three";
import { palette } from "./palette";
import { nearPath } from "./Plaza";

export const GARDEN_RADIUS = 19;

// Deterministic pseudo-random so the garden looks the same every visit
// without shipping any data.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function useScatter(
  count: number,
  seed: number,
  inner: number,
  outer: number,
  clearance = 0,
) {
  return useMemo(() => {
    const random = rng(seed);
    const dummy = new Object3D();
    const list: Matrix4[] = [];
    for (let i = 0; i < count * 2 && list.length < count; i++) {
      const a = random() * Math.PI * 2;
      const r = inner + random() * (outer - inner);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (clearance > 0 && nearPath(x, z, clearance)) continue;
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, random() * Math.PI * 2, 0);
      const s = 0.6 + random() * 0.9;
      dummy.scale.set(s, s * (0.7 + random() * 0.8), s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count, seed, inner, outer, clearance]);
}

function Instances({
  matrices,
  color,
  children,
}: {
  matrices: Matrix4[];
  color: string;
  children: React.ReactNode;
}) {
  const ref = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]} castShadow={false}>
      {children}
      <meshLambertMaterial color={new Color(color)} />
    </instancedMesh>
  );
}

export function Ground() {
  const grass = useScatter(320, 7, 1.5, GARDEN_RADIUS - 1.5, 1.6);
  const rocks = useScatter(28, 91, 4, GARDEN_RADIUS - 2, 2.2);
  const hedge = useMemo(() => {
    const dummy = new Object3D();
    const random = rng(313);
    const list: Matrix4[] = [];
    const count = 64;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = GARDEN_RADIUS + 0.6;
      dummy.position.set(Math.cos(a) * r, 0.7 + random() * 0.4, Math.sin(a) * r);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(1.6, 1.5 + random() * 0.5, 1.6);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[GARDEN_RADIUS + 6, 48]} />
        <meshLambertMaterial color={palette.ground} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[GARDEN_RADIUS - 0.4, GARDEN_RADIUS + 0.4, 48]} />
        <meshLambertMaterial color={palette.groundDark} />
      </mesh>

      <Instances matrices={hedge} color={palette.hedge}>
        <icosahedronGeometry args={[1, 1]} />
      </Instances>

      <Instances matrices={grass} color={palette.grass}>
        <coneGeometry args={[0.16, 0.7, 4]} />
      </Instances>

      <Instances matrices={rocks} color={palette.rock}>
        <dodecahedronGeometry args={[0.35, 0]} />
      </Instances>
    </group>
  );
}
