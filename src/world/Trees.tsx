import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Matrix4, Mesh, Object3D, Vector3, type BufferGeometry, type InstancedMesh, type Material } from "three";
import model from "../assets/tree.glb.asset.json";

/**
 * Background trees: one uploaded low-poly tree GLB, drawn as a single
 * instanced mesh so the whole tree line costs one draw call.
 */
const TARGET_HEIGHT = 6.2;

function useTreeAsset() {
  const gltf = useGLTF(model.url, true);
  return useMemo(() => {
    let geometry: BufferGeometry | null = null;
    let material: Material | undefined;
    gltf.scene.updateWorldMatrix(true, true);
    gltf.scene.traverse((child) => {
      if (geometry || !(child as Mesh).isMesh) return;
      const mesh = child as Mesh;
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      geometry = geo;
      material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    });
    if (!geometry || !material) return null;
    const geo = geometry as BufferGeometry;
    // Normalise: centre on X/Z, sit on the ground, scale to a believable height.
    const box = new Box3().setFromBufferAttribute(geo.getAttribute("position") as never);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    geo.translate(-center.x, -box.min.y, -center.z);
    geo.scale(scale, scale, scale);
    geo.computeVertexNormals();
    return { geometry: geo, material };
  }, [gltf.scene]);
}

export function Trees() {
  const asset = useTreeAsset();
  const ref = useRef<InstancedMesh>(null);

  const matrices = useMemo(() => {
    const dummy = new Object3D();
    return TREE_INSTANCES.map((it) => {
      dummy.position.set(it.x, 0, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.setScalar(it.scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, []);


  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
  }, [matrices, asset]);

  if (!asset) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[asset.geometry, asset.material, matrices.length]}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

useGLTF.preload(model.url, true);
