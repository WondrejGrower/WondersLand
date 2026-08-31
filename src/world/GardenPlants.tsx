import { PLANT_SLOTS } from "../garden/slots";
import { useGardenStore } from "../state/useGardenStore";
import { CannabisPlant } from "./plants/CannabisPlant";
import { GenericPlant } from "./plants/GenericPlants";
import { palette } from "./palette";

/** A tended-but-empty planting spot: raked soil, a low rim and a small stake. */
function EmptySpot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.055, 0]}>
        <circleGeometry args={[0.62, 16]} />
        <meshLambertMaterial color={palette.bedSoil} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.58, 0.66, 20]} />
        <meshBasicMaterial color={palette.pathEdge} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0.32, 0.18, 0.18]}>
        <boxGeometry args={[0.04, 0.36, 0.04]} />
        <meshLambertMaterial color={palette.woodDark} />
      </mesh>
      <mesh position={[0.32, 0.38, 0.18]} rotation-y={0.4}>
        <boxGeometry args={[0.22, 0.12, 0.02]} />
        <meshLambertMaterial color={palette.sign} />
      </mesh>
    </group>
  );
}

/**
 * The visitor's visible diaries, planted into the garden's fixed spots.
 * One diary fills one spot; every spot left over shows an empty planting
 * marker so the garden still reads as tended when there are no diaries.
 */
export function GardenPlants() {
  const plants = useGardenStore((s) => s.plants);
  const taken = new Set(plants.map((p) => p.slotIndex));

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
      {PLANT_SLOTS.filter((slot) => !taken.has(slot.id)).map((slot) => (
        <EmptySpot key={slot.id} position={slot.position} />
      ))}
    </group>
  );
}
