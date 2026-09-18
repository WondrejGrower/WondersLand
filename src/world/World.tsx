import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky } from "./Sky";
import { Ground } from "./Ground";
import { Plaza } from "./Plaza";
import { GardenPlants } from "./GardenPlants";
import { Player } from "./Player";
import { Cottage } from "./Cottage";
import { GardenBoard } from "./GardenBoard";
import { WelcomeSign } from "./WelcomeSign";
import { Portals } from "./Portals";
import { GrowBeds } from "./GrowBeds";
import { FocusRing } from "./FocusRing";
import { palette } from "./palette";

// Phones pay twice for pixels: lower the ceiling and drop MSAA there.
const coarse =
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches === true;

export default function World() {
  return (
    <Canvas
      dpr={coarse ? [1, 1.25] : [1, 1.5]}
      camera={{ fov: 55, near: 0.1, far: 120, position: [0, 3, 14] }}
      gl={{ antialias: !coarse, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      <fog attach="fog" args={[palette.fog, 26, 72]} />
      <hemisphereLight args={[palette.skyTop, palette.ground, 1.0]} />
      <directionalLight position={[8, 12, 6]} intensity={1.25} color={palette.sun} />
      <Sky />
      <Ground />
      <Plaza />
      <GrowBeds />
      <Portals />
      <Cottage />
      <Suspense fallback={null}>
        <GardenBoard />
      </Suspense>
      <WelcomeSign />
      <GardenPlants />
      <FocusRing />
      <Player />
    </Canvas>
  );
}
