import { useGardenStore } from "../state/useGardenStore";
import { CannabisPlant } from "./plants/CannabisPlant";
import { GenericPlant } from "./plants/GenericPlants";
import { palette } from "./palette";

/**
 * Renders the signed-in grower's diaries as plants placed across the garden's
 * semantic zones. Read-only: nothing here writes back to Nostr.
 */
export function GardenPlants() {
  const plants = useGardenStore((s) => s.plants);
  if (plants.length === 0) return null;

  return (
    <group>
      {plants.map((plant) => (
        <group key={plant.id} position={plant.position} rotation-y={plant.rotation} scale={plant.scale}>
          {plant.model.key === "cannabis" ? (
            <CannabisPlant position={[0, 0, 0]} />
          ) : (
            <GenericPlant model={plant.model.key} />
          )}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
            <circleGeometry args={[0.7, 12]} />
            <meshBasicMaterial color={palette.shadow} transparent opacity={0.16} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
