import { useMemo, useState } from "react";
import { Box3, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import model from "../assets/garden-board.glb.asset.json";
import { getInteractable } from "./interactables";
import { LAYOUT } from "./layout";
import { palette } from "./palette";

/**
 * Garden board beside the house — the cozy wooden to-do board model standing
 * on two simple procedural legs. Position comes from the shared interactable
 * data so the prompt, collider and visual can never drift apart.
 */
const LEG_HEIGHT = 1.15;
const BOARD_HEIGHT = 1.6;

export function GardenBoard() {
  /** Position comes from the shared interactable data, so it cannot drift. */
  const spot = getInteractable("garden-board")!;
  const position: [number, number, number] = [spot.position[0], 0, spot.position[1]];
  const gltf = useGLTF(model.url, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const [hovered, setHovered] = useState(false);

  const { scale, offset } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = size.y > 0 ? BOARD_HEIGHT / size.y : 1;
    return {
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s] as [number, number, number],
    };
  }, [scene]);

  return (
    <group
      position={POSITION}
      rotation-y={ROTATION_Y}
      userData={{ interactable: "garden-board" }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      scale={hovered ? 1.03 : 1}
    >
      {/* Simple wooden legs. */}
      <mesh position={[-0.5, LEG_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.12, LEG_HEIGHT, 0.12]} />
        <meshLambertMaterial color={palette.wood} />
      </mesh>
      <mesh position={[0.5, LEG_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.12, LEG_HEIGHT, 0.12]} />
        <meshLambertMaterial color={palette.wood} />
      </mesh>
      {/* The board model rests on top of the legs. */}
      <primitive object={scene} scale={scale} position={[offset[0], LEG_HEIGHT + offset[1], offset[2]]} />
    </group>
  );
}

useGLTF.preload(model.url, true);
