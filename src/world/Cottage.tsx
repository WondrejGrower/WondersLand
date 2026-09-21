import { useMemo } from "react";
import { Box3, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import model from "../assets/cottage.glb.asset.json";
import {
  COTTAGE_HALF,
  COTTAGE_POSITION,
  COTTAGE_ROTATION_Y,
  LAYOUT,
} from "./layout";

/** Static scenery: the garden cottage. No interaction, no UI. */
const TARGET_HEIGHT = 5.5;
/** World position + reach used by the interaction system. */
export { COTTAGE_POSITION };
export const COTTAGE_INTERACT_RADIUS = 5;
/** Rotation + solid footprint half-extents used by collision.ts. */
export { COTTAGE_ROTATION_Y, COTTAGE_HALF };


export function Cottage({
  position = COTTAGE_POSITION,
  rotation = LAYOUT.cottageRotY,
  modelScale = LAYOUT.cottageScale,
  interactive = true,
}: {
  position?: [number, number, number];
  rotation?: number;
  modelScale?: number;
  interactive?: boolean;
}) {
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
    <group
      position={position}
      rotation-y={rotation}
      scale={modelScale}
      userData={interactive ? { interactable: "my-garden-house" } : undefined}
    >
      <primitive object={scene} scale={scale} position={offset} />
    </group>
  );
}

useGLTF.preload(model.url, true);
