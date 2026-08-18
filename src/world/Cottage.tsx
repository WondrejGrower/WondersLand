import { useMemo } from "react";
import { Box3, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import model from "../assets/cottage.glb.asset.json";

/** Static scenery: the garden cottage. No interaction, no UI. */
const TARGET_HEIGHT = 5.5;
const POSITION: [number, number, number] = [6, 0, -4];
/** World position + reach used by the interaction system. */
export const COTTAGE_POSITION = POSITION;
export const COTTAGE_INTERACT_RADIUS = 5;
const ROTATION_Y = -0.5;

export function Cottage() {
  const gltf = useGLTF(model.url, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // Normalise: sit the model on the ground and give it a sane world size.
  const { scale, offset } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    return {
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s] as [number, number, number],
    };
  }, [scene]);

  return (
    <group position={POSITION} rotation-y={ROTATION_Y}>
      <primitive object={scene} scale={scale} position={offset} />
    </group>
  );
}

useGLTF.preload(model.url, true);
