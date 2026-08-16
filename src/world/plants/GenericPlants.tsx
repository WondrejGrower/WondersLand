import {
  BoxGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import { palette } from "../palette";
import type { ModelKey } from "../../garden/models";

// Shared geometry + materials: every generic plant in the world reuses these,
// so adding plants costs draw calls but no new GPU resources.
const geo = {
  stem: new CylinderGeometry(0.05, 0.07, 1, 6),
  trunk: new CylinderGeometry(0.13, 0.2, 1, 7),
  blob: new IcosahedronGeometry(0.5, 0),
  leaf: new SphereGeometry(0.35, 7, 5),
  pot: new CylinderGeometry(0.28, 0.22, 0.34, 8),
  tray: new BoxGeometry(0.7, 0.12, 0.5),
  fruit: new SphereGeometry(0.1, 6, 5),
};

const mat = {
  stem: new MeshStandardMaterial({ color: palette.stem, roughness: 0.9 }),
  trunk: new MeshStandardMaterial({ color: palette.trunk, roughness: 1 }),
  leafA: new MeshStandardMaterial({ color: palette.foliageA, flatShading: true, roughness: 0.9 }),
  leafB: new MeshStandardMaterial({ color: palette.foliageB, flatShading: true, roughness: 0.9 }),
  leafC: new MeshStandardMaterial({ color: palette.leafLight, flatShading: true, roughness: 0.9 }),
  herb: new MeshStandardMaterial({ color: palette.shrub, flatShading: true, roughness: 0.95 }),
  pot: new MeshStandardMaterial({ color: palette.wood, roughness: 1 }),
  soil: new MeshStandardMaterial({ color: palette.bedSoil, roughness: 1 }),
  fruit: new MeshStandardMaterial({ color: palette.flowerGold, roughness: 0.6 }),
  sprout: new MeshStandardMaterial({ color: palette.leafLight, flatShading: true, roughness: 0.9 }),
};

function Vegetable() {
  return (
    <group>
      <mesh geometry={geo.stem} material={mat.stem} position={[0, 0.45, 0]} scale={[1, 0.9, 1]} />
      <mesh geometry={geo.blob} material={mat.leafB} position={[0, 0.85, 0]} scale={[0.8, 0.6, 0.8]} />
      <mesh geometry={geo.leaf} material={mat.leafA} position={[0.32, 0.5, 0.1]} scale={[1, 0.4, 1]} />
      <mesh geometry={geo.leaf} material={mat.leafA} position={[-0.3, 0.42, -0.16]} scale={[0.9, 0.35, 0.9]} />
      <mesh geometry={geo.fruit} material={mat.fruit} position={[0.18, 0.72, 0.24]} />
    </group>
  );
}

function Herb() {
  return (
    <group>
      <mesh geometry={geo.pot} material={mat.pot} position={[0, 0.17, 0]} />
      <mesh geometry={geo.blob} material={mat.herb} position={[0, 0.52, 0]} scale={[0.62, 0.5, 0.62]} />
      <mesh geometry={geo.blob} material={mat.leafC} position={[0.18, 0.68, -0.1]} scale={0.34} />
      <mesh geometry={geo.blob} material={mat.leafC} position={[-0.2, 0.62, 0.14]} scale={0.28} />
    </group>
  );
}

function FruitTree() {
  return (
    <group>
      <mesh geometry={geo.trunk} material={mat.trunk} position={[0, 0.9, 0]} scale={[1, 1.8, 1]} />
      <mesh geometry={geo.blob} material={mat.leafA} position={[0, 2.1, 0]} scale={[1.5, 1.25, 1.5]} />
      <mesh geometry={geo.blob} material={mat.leafB} position={[0.55, 1.75, 0.3]} scale={0.75} />
      <mesh geometry={geo.blob} material={mat.leafC} position={[-0.5, 1.95, -0.35]} scale={0.6} />
      <mesh geometry={geo.fruit} material={mat.fruit} position={[0.62, 1.7, 0.5]} />
      <mesh geometry={geo.fruit} material={mat.fruit} position={[-0.45, 1.85, 0.55]} />
    </group>
  );
}

function HousePlant() {
  return (
    <group>
      <mesh geometry={geo.pot} material={mat.soil} position={[0, 0.18, 0]} scale={[1.1, 1.15, 1.1]} />
      <mesh geometry={geo.leaf} material={mat.leafC} position={[0.16, 0.7, 0]} rotation-z={-0.5} scale={[1.1, 0.5, 0.8]} />
      <mesh geometry={geo.leaf} material={mat.leafB} position={[-0.18, 0.62, 0.1]} rotation-z={0.6} scale={[1, 0.45, 0.75]} />
      <mesh geometry={geo.leaf} material={mat.leafA} position={[0, 0.95, -0.1]} rotation-x={0.3} scale={[0.9, 0.5, 0.7]} />
    </group>
  );
}

function Seedling() {
  return (
    <group>
      <mesh geometry={geo.tray} material={mat.soil} position={[0, 0.06, 0]} />
      <mesh geometry={geo.stem} material={mat.stem} position={[0, 0.24, 0]} scale={[0.6, 0.3, 0.6]} />
      <mesh geometry={geo.leaf} material={mat.sprout} position={[0.1, 0.36, 0]} scale={[0.5, 0.2, 0.35]} />
      <mesh geometry={geo.leaf} material={mat.sprout} position={[-0.1, 0.34, 0.04]} scale={[0.45, 0.18, 0.32]} />
    </group>
  );
}

export function GenericPlant({ model }: { model: Exclude<ModelKey, "cannabis"> }) {
  switch (model) {
    case "vegetable":
      return <Vegetable />;
    case "herb":
      return <Herb />;
    case "fruit-tree":
      return <FruitTree />;
    case "houseplant":
      return <HousePlant />;
    case "seedling":
      return <Seedling />;
    default:
      return null;
  }
}
