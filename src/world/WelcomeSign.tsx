import { useMemo, useState } from "react";
import { Box3, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import { useWorldStore } from "../state/useWorldStore";
import model from "../assets/woodland-sign.glb.asset.json";

/**
 * Woodland sign just off the spawn path. Clicking / tapping it opens the
 * "What is WondersLand" overlay — the world layer only flips a store flag.
 */
const TARGET_HEIGHT = 2.1;
/** Just ahead of spawn (0, 8), off the walking line so the path stays clear. */
const POSITION: [number, number, number] = [2.1, 0, 6.4];
/** Face back toward the player standing at spawn. */
const ROTATION_Y = 0.45;
export const SIGN_POSITION = POSITION;
export const SIGN_COLLIDER_RADIUS = 0.55;

export function WelcomeSign() {
  const gltf = useGLTF(model.url, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const [hovered, setHovered] = useState(false);

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
      position={POSITION}
      rotation-y={ROTATION_Y}
      onClick={(e) => {
        e.stopPropagation();
        useWorldStore.getState().openAbout();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      scale={hovered ? 1.04 : 1}
    >
      <primitive object={scene} scale={scale} position={offset} />
    </group>
  );
}

useGLTF.preload(model.url, true);
