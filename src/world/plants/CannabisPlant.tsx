import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CylinderGeometry,
  IcosahedronGeometry,
  MeshLambertMaterial,
  Object3D,
  SphereGeometry,
  type BufferGeometry,
  type Group,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { palette } from "../palette";

/**
 * One cannabis plant used to cost ~60 meshes, each with its own inline
 * geometry and material. Every leaflet is now baked once, at module scope,
 * into two merged geometries (one per leaf tone), so a whole plant is four
 * meshes that share their GPU resources with every other plant in the garden.
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

  // Mirror the original scene graph, then bake the resulting world matrices.
  const root = new Object3D();
  const node = new Object3D();
  const leaf = new Object3D();
  const leaflet = new Object3D();
  const blade = new Object3D();
  root.add(node);
  node.add(leaf);
  leaf.add(leaflet);
  leaflet.add(blade);

  NODES.forEach(({ y, rot, scale }) => {
    node.position.set(0, y, 0);
    node.rotation.set(0, rot, 0);

    ([0, Math.PI] as const).forEach((flip) => {
      leaf.position.set(flip === 0 ? 0.12 : -0.12, 0, 0);
      leaf.rotation.set(-0.1, flip, 0.25);
      leaf.scale.setScalar(scale);

      LEAFLET_ANGLES.forEach((a, i) => {
        const len = 1 - Math.abs(a) * 0.55;
        leaflet.position.set(0, 0, 0);
        leaflet.rotation.set(0, a, -0.15);
        blade.position.set(0, 0, len * 0.5);
        blade.scale.set(0.09, 0.02, len * 0.55);
        root.updateMatrixWorld(true);
        (i % 2 === 0 ? even : odd).push(base.clone().applyMatrix4(blade.matrixWorld));
      });
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
