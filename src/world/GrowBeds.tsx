import { palette } from "./palette";
import { GROW_BEDS_CENTER, GROW_BEDS_HALF } from "./interactables";

/**
 * Outdoor grow-bed area: raised timber beds that give the "raised-beds" plant
 * zone a physical home. Purely scenery — plants render from the garden store.
 */
const [CX, CZ] = GROW_BEDS_CENTER;
const [HW, HD] = GROW_BEDS_HALF;
const PLANK = 0.22;
const HEIGHT = 0.44;

export function GrowBeds() {
  return (
    <group position={[CX, 0, CZ]}>
      {/* soil pad */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <planeGeometry args={[HW * 2, HD * 2]} />
        <meshLambertMaterial color={palette.bedSoil} />
      </mesh>
      {/* long timber rims (north / south) */}
      {[-HD, HD].map((z) => (
        <mesh key={z} position={[0, HEIGHT / 2, z]}>
          <boxGeometry args={[HW * 2 + PLANK, HEIGHT, PLANK]} />
          <meshLambertMaterial color={palette.wood} />
        </mesh>
      ))}
      {/* corner posts, ends left open so the player can step in */}
      {[-HW, HW].flatMap((x) =>
        [-HD, HD].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.3, z]}>
            <boxGeometry args={[0.3, 0.6, 0.3]} />
            <meshLambertMaterial color={palette.woodDark} />
          </mesh>
        )),
      )}
      {/* a gravel apron so the bed reads as tended ground */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[HW * 2 + 1.6, HD * 2 + 1.6]} />
        <meshLambertMaterial color={palette.pathEdge} />
      </mesh>
    </group>
  );
}
