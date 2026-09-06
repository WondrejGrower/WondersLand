import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, BufferGeometry, InstancedMesh, Material, Mesh, Object3D, Vector3 } from "three";
import model from "../assets/stone-tile.glb.asset.json";

/**
 * Instanced stone slabs laid along the walkway.
 * One geometry, one material, one draw call.
 */
export function StonePath({
  points,
  size = 2.4,
}: {
  points: { x: number; z: number; rot: number }[];
  size?: number;
}) {
  const gltf = useGLTF(model.url, true);

  const { geometry, material, scale } = useMemo(() => {
    let geo: BufferGeometry | null = null;
    let mat: Material | Material[] | null = null;
    gltf.scene.traverse((o) => {
      if (!geo && (o as Mesh).isMesh) {
        geo = (o as Mesh).geometry;
        mat = (o as Mesh).material;
      }
    });
    const box = new Box3().setFromObject(gltf.scene);
    const dims = box.getSize(new Vector3());
    const width = Math.max(dims.x, dims.z) || 1;
    return { geometry: geo, material: mat, scale: size / width };
  }, [gltf.scene, size]);

  const matrices = useMemo(() => {
    const dummy = new Object3D();
    return points.map((p, i) => {
      const wobble = ((i * 37) % 11) / 11 - 0.5;
      dummy.position.set(p.x, 0.02, p.z);
      dummy.rotation.set(0, p.rot + wobble * 0.05, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [points, scale]);

  const ref = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };

  if (!geometry || !material) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material as Material, matrices.length]}
    />
  );
}

useGLTF.preload(model.url, true);
