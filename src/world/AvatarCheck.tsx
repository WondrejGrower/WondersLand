import { Canvas } from "@react-three/fiber";
import { Avatar } from "./Avatar";
export default function AvatarCheck() {
  return (
    <div style={{ height: "100vh" }}>
      <Canvas camera={{ fov: 40, position: [0, 1.1, 3.6] }}>
        <hemisphereLight args={["#ffffff", "#888888", 1.4]} />
        <directionalLight position={[3, 5, 4]} intensity={1} />
        <group rotation-y={Math.PI}>
          <Avatar />
        </group>
      </Canvas>
    </div>
  );
}
