import { useMemo } from "react";
import { Color, InstancedMesh, Matrix4, Object3D } from "three";
import { Trees } from "./Trees";
import { palette } from "./palette";
import { GARDEN_RADIUS as RADIUS, GRASS_INSTANCES, ROCK_INSTANCES, type Instance } from "./layout";

export const GARDEN_RADIUS = RADIUS;

/** Turn shared layout data into instance matrices. Rendering only. */
function useMatrices(instances: Instance[]) {
  return useMemo(() => {
    const dummy = new Object3D();
    return instances.map((it) => {
      dummy.position.set(it.x, 0, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.scale, it.scaleY, it.scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [instances]);
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
  const grass = useMatrices(GRASS_INSTANCES);
  const rocks = useMatrices(ROCK_INSTANCES);

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

      <Trees />

      <Instances matrices={grass} color={palette.grass}>
        <coneGeometry args={[0.16, 0.7, 4]} />
      </Instances>

      <Instances matrices={rocks} color={palette.rock}>
        <dodecahedronGeometry args={[0.35, 0]} />
      </Instances>
    </group>
  );
}
