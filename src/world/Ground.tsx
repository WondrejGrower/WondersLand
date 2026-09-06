import { Trees } from "./Trees";
import { palette } from "./palette";
import { GARDEN_RADIUS as RADIUS } from "./layout";

export const GARDEN_RADIUS = RADIUS;

/**
 * Ground plane, boundary ring and the tree line.
 * Deliberately clean: no scattered grass tufts or pebbles.
 */
export function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[GARDEN_RADIUS + 6, 48]} />
        <meshLambertMaterial color={palette.ground} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[GARDEN_RADIUS - 0.4, GARDEN_RADIUS + 0.4, 48]} />
        <meshLambertMaterial color={palette.groundDark} />
      </mesh>

      <Trees />
    </group>
  );
}
