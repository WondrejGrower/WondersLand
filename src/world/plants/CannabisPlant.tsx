import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  MeshLambertMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Group,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { palette } from "../palette";

/**
 * One cannabis plant used to cost ~60 meshes, each with its own inline
 * geometry and material. Every leaflet is now baked once, at module scope,
 * into two merged geometries (one per leaf tone), so a whole plant is five
 * meshes that share five GPU resources with every other plant in the garden.
 */

const NODES = [0.55, 0.95, 1.35, 1.7].map((y, i) => ({
  y,
  rot: i * 1.4,
  scale: 1.1 - i * 0.18,
}));

const LEAFLET_ANGLES = [-1.05, -0.7, -0.35, 0, 0.35, 0.7, 1.05];

function buildLeafTones() {
  const base = new SphereGeometry(1, 6, 4);
  const even: BufferGeometry[] = [];
  const odd: BufferGeometry[] = [];
  const m = new Matrix4();
  const leafLocal = new Matrix4();
  const nodeLocal = new Matrix4();
  const side = new Matrix4();
  const leaflet = new Matrix4();

  NODES.forEach(({ y, rot, scale }) => {
    nodeLocal.makeRotationY(rot).setPosition(0, y, 0);

    [0, Math.PI].forEach((flip) => {
      // Mirrored leaf pair: offset out from the stem, tilted up a touch.
      side
        .makeRotationY(flip)
        .multiply(new Matrix4().makeRotationZ(0.25))
        .multiply(new Matrix4().makeRotationX(-0.1))
        .multiply(new Matrix4().makeScale(scale, scale, scale));
      side.setPosition(flip === 0 ? 0.12 : -0.12, y, 0);
      leafLocal.copy(nodeLocal).multiply(new Matrix4().makeRotationY(0));

      LEAFLET_ANGLES.forEach((a, i) => {
        const len = 1 - Math.abs(a) * 0.55;
        leaflet
          .makeRotationY(a)
          .multiply(new Matrix4().makeRotationZ(-0.15))
          .multiply(new Matrix4().makeTranslation(0, 0, len * 0.5))
          .multiply(new Matrix4().makeScale(0.09, 0.02, len * 0.55));

        m.makeRotationY(rot).setPosition(0, 0, 0);
        m.multiply(side).multiply(leaflet);
        // Node rotation applies around the stem; position stays at node height.
        const g = base.clone().applyMatrix4(m);
        (i % 2 === 0 ? even : odd).push(g);
      });
      void leafLocal;
    });
  });

  base.dispose();
  return {
    even: mergeGeometries(even, false)!,
    odd: mergeGeometries(odd, false)!,
  };
}

const LEAVES = buildLeafTones();

const geo = {
  soil: new SphereGeometry(1, 12, 8),
  stem: new CylinderGeometry(0.035, 0.065, 2, 6),
  cola: new IcosahedronGeometry(1, 1),
};

const mat = {
  soil: new MeshLambertMaterial({ color: palette.soil }),
  stem: new MeshLambertMaterial({ color: palette.stem }),
  leaf: new MeshLambertMaterial({ color: palette.leaf }),
  leafLight: new MeshLambertMaterial({ color: palette.leafLight }),
  bud: new MeshLambertMaterial({ color: palette.bud }),
};

export function CannabisPlant({ position }: { position: [number, number, number] }) {
  const sway = useRef<Group>(null);

  useFrame((state) => {
    const g = sway.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.z = Math.sin(t * 0.8) * 0.035;
    g.rotation.x = Math.cos(t * 0.6) * 0.02;
  });

  return (
    <group position={position} scale={1.9}>
      <mesh
        geometry={geo.soil}
        material={mat.soil}
        position={[0, 0.08, 0]}
        scale={[0.85, 0.28, 0.85]}
      />

      <group ref={sway}>
        <mesh geometry={geo.stem} material={mat.stem} position={[0, 1, 0]} />
        <mesh geometry={LEAVES.even} material={mat.leaf} />
        <mesh geometry={LEAVES.odd} material={mat.leafLight} />
        <mesh
          geometry={geo.cola}
          material={mat.bud}
          position={[0, 2.1, 0]}
          scale={[0.16, 0.32, 0.16]}
        />
      </group>
    </group>
  );
}
