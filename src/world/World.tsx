import { Canvas } from "@react-three/fiber";
import { Sky } from "./Sky";
import { Ground } from "./Ground";
import { Plaza } from "./Plaza";
import { GardenPlants } from "./GardenPlants";
import { Player } from "./Player";
import { Cottage } from "./Cottage";
import { WelcomeSign } from "./WelcomeSign";
import { Portals } from "./Portals";
import { GrowBeds } from "./GrowBeds";
import { FocusRing } from "./FocusRing";
import { palette } from "./palette";

export default function World() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 3, 14] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <fog attach="fog" args={[palette.fog, 30, 84]} />
      <hemisphereLight args={[palette.skyTop, palette.ground, 1.0]} />
      <directionalLight position={[8, 12, 6]} intensity={1.25} color={palette.sun} />
      <Sky />
      <Ground />
      <Plaza />
      <GrowBeds />
      <Portals />
      <Cottage />
      <WelcomeSign />
      <GardenPlants />
      <FocusRing />
      <Player />
    </Canvas>
  );
}

