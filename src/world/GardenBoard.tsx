import { getInteractable } from "./interactables";
import { palette } from "./palette";

/**
 * Temporary wooden notice board beside the house. Two posts and a plank —
 * three cheap boxes, shared materials, no imported asset.
 */
export function GardenBoard() {
  const spot = getInteractable("garden-board");
  if (!spot) return null;
  const [x, z] = spot.position;

  return (
    <group position={[x, 0, z]} rotation={[0, -0.5, 0]}>
      <mesh position={[-0.42, 0.55, 0]} castShadow={false}>
        <boxGeometry args={[0.1, 1.1, 0.1]} />
        <meshLambertMaterial color={palette.wood} />
      </mesh>
      <mesh position={[0.42, 0.55, 0]}>
        <boxGeometry args={[0.1, 1.1, 0.1]} />
        <meshLambertMaterial color={palette.wood} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.15, 0.75, 0.08]} />
        <meshLambertMaterial color={palette.woodLight} />
      </mesh>
    </group>
  );
}
