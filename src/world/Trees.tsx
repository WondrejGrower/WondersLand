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

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function Trees({ radius }: { radius: number }) {
  const asset = useTreeAsset();
  const ref = useRef<InstancedMesh>(null);

  const matrices = useMemo(() => {
    const dummy = new Object3D();
    const random = rng(4711);
    const list: Matrix4[] = [];

    // Boundary ring — the tree line that closes the garden off.
    const count = 26;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + random() * 0.08;
      const r = radius + 1.2 + random() * 1.6;
      dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      dummy.rotation.set(0, random() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.85 + random() * 0.45);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }

    // A few closer trees framing the plaza (replacing the old low-poly ones).
    ([
      [-7.5, 6, 0.7],
      [8.5, 5.5, 0.62],
      [10, -8, 0.8],
    ] as [number, number, number][]).forEach(([x, z, s], i) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, i * 1.7, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    });

    return list;
  }, [radius]);

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
