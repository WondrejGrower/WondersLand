import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, type Group, type Mesh } from "three";
import { input } from "../state/input";
import { useWorldStore } from "../state/useWorldStore";
import { palette } from "./palette";

// A code-native low-poly garden keeper. Origin is at the feet, total height
// ~1.9 units so the camera rig and proximity checks stay unchanged.

const STEP_SPEED = 9;
const SWING = 0.55;

// Locally generated chest graphic — no network asset, drawn once.
function useShirtGraphic() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = palette.shirtGraphic;
    // Chunky "42" mark, blocky and readable from a distance.
    ctx.font = "bold 150px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("42", size / 2, size * 0.36);

    // Angled slash echoing the reference logo.
    ctx.save();
    ctx.translate(size / 2, size * 0.36);
    ctx.rotate(-0.35);
    ctx.fillRect(-95, -6, 190, 12);
    ctx.restore();

    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.fillText("FastBuds", size / 2, size * 0.68);

    const tex = new CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }, []);
}

export function Avatar() {
  const graphic = useShirtGraphic();

  const root = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const bagRef = useRef<Mesh>(null);

  const phase = useRef(0);
  const blend = useRef(0);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const frozen = useWorldStore.getState().journalOpen;
    const moving =
      !frozen && (input.forward !== 0 || input.strafe !== 0) ? 1 : 0;

    blend.current += (moving - blend.current) * Math.min(1, delta * 10);
    phase.current += delta * STEP_SPEED * blend.current;

    const swing = Math.sin(phase.current) * SWING * blend.current;
    const breathe = Math.sin(t * 1.6) * 0.02;
    const bob = Math.abs(Math.sin(phase.current)) * 0.05 * blend.current;

    if (root.current) root.current.position.y = bob;
    if (torso.current) {
      torso.current.scale.y = 1 + breathe * 0.5;
      torso.current.rotation.x = blend.current * 0.08;
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 1.1) * 0.03;
      head.current.rotation.x = -blend.current * 0.05 + breathe;
    }
    if (armL.current) armL.current.rotation.x = swing;
    if (armR.current) armR.current.rotation.x = -swing;
    if (legL.current) legL.current.rotation.x = -swing;
    if (legR.current) legR.current.rotation.x = swing;
    if (bagRef.current) bagRef.current.rotation.z = 0.1 + swing * 0.08;
  });

  return (
    <group ref={root} rotation-y={Math.PI}>
      {/* legs */}
      <group ref={legL} position={[0.16, 0.82, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[0.22, 0.34, 0.24]} />
          <meshLambertMaterial color={palette.shorts} />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.34, 8]} />
          <meshLambertMaterial color={palette.skin} />
        </mesh>
        <mesh position={[0, -0.69, 0]}>
          <cylinderGeometry args={[0.078, 0.078, 0.12, 8]} />
          <meshLambertMaterial color={palette.sockWhite} />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.081, 0.081, 0.025, 8]} />
          <meshLambertMaterial color={palette.sockStripe} />
        </mesh>
        <mesh position={[0, -0.78, 0.03]}>
          <boxGeometry args={[0.17, 0.1, 0.3]} />
          <meshLambertMaterial color={palette.shoeBlack} />
        </mesh>
        <mesh position={[0, -0.825, 0.03]}>
          <boxGeometry args={[0.18, 0.05, 0.31]} />
          <meshLambertMaterial color={palette.shoeWhite} />
        </mesh>
      </group>

      <group ref={legR} position={[-0.16, 0.82, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[0.22, 0.34, 0.24]} />
          <meshLambertMaterial color={palette.shorts} />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <cylinderGeometry args={[0.075, 0.065, 0.34, 8]} />
          <meshLambertMaterial color={palette.skin} />
        </mesh>
        <mesh position={[0, -0.69, 0]}>
          <cylinderGeometry args={[0.078, 0.078, 0.12, 8]} />
          <meshLambertMaterial color={palette.sockWhite} />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.081, 0.081, 0.025, 8]} />
          <meshLambertMaterial color={palette.sockStripe} />
        </mesh>
        <mesh position={[0, -0.78, 0.03]}>
          <boxGeometry args={[0.17, 0.1, 0.3]} />
          <meshLambertMaterial color={palette.shoeBlack} />
        </mesh>
        <mesh position={[0, -0.825, 0.03]}>
          <boxGeometry args={[0.18, 0.05, 0.31]} />
          <meshLambertMaterial color={palette.shoeWhite} />
        </mesh>
      </group>

      {/* torso — oversized tee */}
      <group ref={torso} position={[0, 0.86, 0]}>
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.5, 0.58, 0.3]} />
          <meshLambertMaterial color={palette.shirt} />
        </mesh>
        {/* chest graphic, generated locally */}
        <mesh position={[0, 0.3, 0.152]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshBasicMaterial map={graphic} transparent />
        </mesh>
        {/* neck */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.085, 0.095, 0.1, 8]} />
          <meshLambertMaterial color={palette.skinShadow} />
        </mesh>

        {/* crossbody strap */}
        <mesh position={[0.02, 0.3, 0.005]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.06, 0.72, 0.33]} />
          <meshLambertMaterial color={palette.bagStrap} />
        </mesh>
        {/* bag */}
        <mesh ref={bagRef} position={[-0.24, 0.07, 0.12]}>
          <boxGeometry args={[0.2, 0.22, 0.12]} />
          <meshLambertMaterial color={palette.bag} />
        </mesh>
        <mesh position={[-0.24, 0.03, 0.185]}>
          <boxGeometry args={[0.08, 0.06, 0.02]} />
          <meshLambertMaterial color={palette.bagClasp} />
        </mesh>

        {/* arms */}
        <group ref={armL} position={[0.3, 0.5, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.17, 0.24, 0.24]} />
            <meshLambertMaterial color={palette.shirt} />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.062, 0.055, 0.3, 8]} />
            <meshLambertMaterial color={palette.skin} />
          </mesh>
          <mesh position={[0, -0.48, 0]}>
            <cylinderGeometry args={[0.068, 0.068, 0.05, 8]} />
            <meshLambertMaterial color={palette.watch} />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <sphereGeometry args={[0.062, 8, 6]} />
            <meshLambertMaterial color={palette.skin} />
          </mesh>
        </group>

        <group ref={armR} position={[-0.3, 0.5, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.17, 0.24, 0.24]} />
            <meshLambertMaterial color={palette.shirt} />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <cylinderGeometry args={[0.062, 0.055, 0.3, 8]} />
            <meshLambertMaterial color={palette.skin} />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <sphereGeometry args={[0.062, 8, 6]} />
            <meshLambertMaterial color={palette.skin} />
          </mesh>
        </group>
      </group>

      {/* head — slightly oversized, stylized */}
      <group ref={head} position={[0, 1.58, 0]}>
        <mesh>
          <sphereGeometry args={[0.25, 14, 12]} />
          <meshLambertMaterial color={palette.skin} />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 0.05, -0.01]} scale={[1.06, 0.95, 1.06]}>
          <sphereGeometry args={[0.25, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>
        {/* layered spikes — flatter and swept back, five tufts */}
        <mesh position={[0.15, 0.19, 0.02]} rotation={[0.2, 0, -1.0]}>
          <coneGeometry args={[0.075, 0.15, 5]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>
        <mesh position={[-0.15, 0.2, -0.02]} rotation={[-0.2, 0, 1.0]}>
          <coneGeometry args={[0.075, 0.15, 5]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>
        <mesh position={[0.05, 0.24, -0.12]} rotation={[-0.9, 0, -0.25]}>
          <coneGeometry args={[0.075, 0.17, 5]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>
        <mesh position={[-0.06, 0.25, -0.06]} rotation={[-0.7, 0, 0.2]}>
          <coneGeometry args={[0.07, 0.15, 5]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>
        <mesh position={[0.0, 0.2, 0.13]} rotation={[0.8, 0, 0.1]}>
          <coneGeometry args={[0.08, 0.14, 5]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>

        {/* fringe */}
        <mesh position={[0, 0.13, 0.19]} rotation={[0.35, 0, 0]}>
          <boxGeometry args={[0.34, 0.12, 0.1]} />
          <meshLambertMaterial color={palette.hair} />
        </mesh>
        {/* eyes */}
        <mesh position={[0.09, 0.0, 0.225]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial color={palette.eye} />
        </mesh>
        <mesh position={[-0.09, 0.0, 0.225]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial color={palette.eye} />
        </mesh>
      </group>
    </group>
  );
}
