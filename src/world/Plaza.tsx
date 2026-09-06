import { useMemo } from "react";
import { CanvasTexture, Color, InstancedMesh, Matrix4, Object3D } from "three";
import { palette } from "./palette";
import { nearInteractable } from "./interactables";
import { StonePath } from "./StonePath";


// Deterministic pseudo-random: same plaza every visit, no data shipped.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function Instances({
  matrices,
  color,
  children,
}: {
  matrices: Matrix4[];
  color: string;
  children: React.ReactNode;
}) {
  const ref = (mesh: InstancedMesh | null) => {
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]}>
      {children}
      <meshLambertMaterial color={new Color(color)} />
    </instancedMesh>
  );
}

// Cheap fake contact shadow: one flat translucent disc.
function ContactShadow({
  position,
  radius,
  opacity = 0.22,
}: {
  position: [number, number, number];
  radius: number;
  opacity?: number;
}) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={position}>
      <circleGeometry args={[radius, 14]} />
      <meshBasicMaterial color={palette.shadow} transparent opacity={opacity} />
    </mesh>
  );
}

// Locally drawn sign texture — no remote font, no network asset.
function useSignTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = palette.sign;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = palette.woodDark;
    ctx.font = "bold 62px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("WondersLand", c.width / 2, c.height / 2 + 4);
    const tex = new CanvasTexture(c);
    tex.anisotropy = 2;
    return tex;
  }, []);
}

/** Shared scenery constants — collision.ts reads these so it cannot drift. */
export const ARCH_POSITION: [number, number, number] = [0, 0, 17];
export const ARCH_POST_X = [-2.4, 2.4];
export const ARCH_POST_RADIUS = 0.55;
export const GREENHOUSE_POSITION: [number, number, number] = [-13, 0, -13];
export const GREENHOUSE_ROTATION_Y = 0.7;
/** Half-extents of the greenhouse stone base (7 x 4.4). */
export const GREENHOUSE_HALF: [number, number] = [3.5, 2.2];

function EntranceArch() {
  const sign = useSignTexture();
  return (
    <group position={ARCH_POSITION}>
      {ARCH_POST_X.map((x) => (
        <group key={x} position={[x, 0, 0]}>

          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[0.9, 0.5, 0.9]} />
            <meshLambertMaterial color={palette.stoneDark} />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <boxGeometry args={[0.55, 3.3, 0.55]} />
            <meshLambertMaterial color={palette.wood} />
          </mesh>
          <ContactShadow position={[0, 0.03, 0]} radius={0.8} />
        </group>
      ))}
      {/* crossbeam + curved top */}
      <mesh position={[0, 3.7, 0]}>
        <boxGeometry args={[5.9, 0.34, 0.42]} />
        <meshLambertMaterial color={palette.woodDark} />
      </mesh>
      <mesh position={[0, 3.9, 0]} rotation-z={0}>
        <torusGeometry args={[2.2, 0.13, 5, 14, Math.PI]} />
        <meshLambertMaterial color={palette.wood} />
      </mesh>
      {/* sign board */}
      <mesh position={[0, 3.05, -0.26]} rotation-y={Math.PI}>
        <planeGeometry args={[4.1, 1.0]} />
        {sign ? (
          <meshBasicMaterial map={sign} toneMapped={false} />
        ) : (
          <meshLambertMaterial color={palette.sign} />
        )}
      </mesh>
      <mesh position={[0, 3.05, 0.2]}>
        <boxGeometry args={[4.4, 1.25, 0.12]} />
        <meshLambertMaterial color={palette.woodDark} />
      </mesh>
    </group>
  );
}

// Shared path line so vegetation can keep clear of the walkable route.
// The route is deliberately straight: PATH_MID is the exact midpoint, so the
// quadratic curve below degenerates into a line from the arch to the plant.
/** Edge length of one stone slab, in world units. */
const SLAB_SIZE = 2.4;
const PATH_FROM = { x: 0, z: 16 };
const PATH_TO = { x: 5.4, z: -3.2 };
const PATH_MID = { x: (PATH_FROM.x + PATH_TO.x) / 2, z: (PATH_FROM.z + PATH_TO.z) / 2 };

function pathPoint(t: number) {
  const x =
    (1 - t) * (1 - t) * PATH_FROM.x + 2 * (1 - t) * t * PATH_MID.x + t * t * PATH_TO.x;
  const z =
    (1 - t) * (1 - t) * PATH_FROM.z + 2 * (1 - t) * t * PATH_MID.z + t * t * PATH_TO.z;
  return { x, z };
}

export function nearPath(x: number, z: number, clearance: number) {
  for (let i = 0; i <= 20; i++) {
    const p = pathPoint(i / 20);
    if (Math.hypot(p.x - x, p.z - z) < clearance) return true;
  }
  return false;
}

// Flat stone slabs stepped along the straight route.
function Path() {
  const points = useMemo(() => {
    const heading = Math.atan2(PATH_TO.x - PATH_FROM.x, PATH_TO.z - PATH_FROM.z);
    const length = Math.hypot(PATH_TO.x - PATH_FROM.x, PATH_TO.z - PATH_FROM.z);
    // One slab per SLAB_SIZE of route: slabs meet edge to edge instead of
    // stacking on top of each other (which flickered).
    const count = Math.max(1, Math.ceil(length / SLAB_SIZE));
    const list: { x: number; z: number; rot: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const { x, z } = pathPoint(i / count);
      list.push({ x, z, rot: -heading });
    }
    return list;
  }, []);

  return (
    <group>
      {/* soil strip so no gap shows between slabs */}
      <mesh
        rotation={[-Math.PI / 2, 0, -Math.atan2(PATH_TO.x - PATH_FROM.x, PATH_TO.z - PATH_FROM.z)]}
        position={[PATH_MID.x, 0.008, PATH_MID.z]}
      >
        <planeGeometry args={[SLAB_SIZE + 0.3, Math.hypot(PATH_TO.x - PATH_FROM.x, PATH_TO.z - PATH_FROM.z)]} />
        <meshLambertMaterial color={palette.path} />
      </mesh>
      <StonePath points={points} size={SLAB_SIZE} />
    </group>
  );
}


function Greenhouse() {
  return (
    <group position={GREENHOUSE_POSITION} rotation-y={GREENHOUSE_ROTATION_Y}>
      <ContactShadow position={[0, 0.04, 0]} radius={4.4} opacity={0.18} />
      {/* low stone base */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[7, 0.6, 4.4]} />
        <meshLambertMaterial color={palette.stoneDark} />
      </mesh>
      {/* glass body */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[6.6, 2.4, 4]} />
        <meshLambertMaterial color={palette.glass} transparent opacity={0.72} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 3.35, -1]} rotation-x={-0.62}>
        <boxGeometry args={[6.8, 0.14, 2.5]} />
        <meshLambertMaterial color={palette.glass} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 3.35, 1]} rotation-x={0.62}>
        <boxGeometry args={[6.8, 0.14, 2.5]} />
        <meshLambertMaterial color={palette.glass} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 4.05, 0]}>
        <boxGeometry args={[6.9, 0.16, 0.16]} />
        <meshLambertMaterial color={palette.frame} />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.4, 2.02]}>
        <boxGeometry args={[1.1, 2, 0.1]} />
        <meshLambertMaterial color={palette.woodDark} />
      </mesh>
    </group>
  );
}

// Instanced shrubs and flower clumps scattered around the plaza, away from the path.
function Scatter() {
  const shrubs = useMemo(() => {
    const random = rng(902);
    const dummy = new Object3D();
    const list: Matrix4[] = [];
    for (let i = 0; i < 70 && list.length < 46; i++) {
      const a = random() * Math.PI * 2;
      const r = 5 + random() * 11;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (nearPath(x, z, 2.6) || nearInteractable(x, z, 0.4)) continue;
      dummy.position.set(x, 0.35, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      const s = 0.4 + random() * 0.5;
      dummy.scale.set(s, s * 0.8, s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, []);

  return (
    <group>
      <Instances matrices={shrubs} color={palette.shrub}>
        <icosahedronGeometry args={[1, 1]} />
      </Instances>
    </group>
  );
}

export function Plaza() {
  return (
    <group>
      <EntranceArch />
      <Path />
      <Greenhouse />
      <Scatter />
      {/* soil pad + shadow under the interaction plant */}
      <ContactShadow position={[6, 0.03, -4]} radius={1.6} opacity={0.2} />
    </group>
  );
}
