import { useMemo } from "react";
import { CanvasTexture, Color, InstancedMesh, Matrix4, Object3D } from "three";
import { palette } from "./palette";

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

function Tree({
  position,
  scale = 1,
  tint = palette.foliageA,
}: {
  position: [number, number, number];
  scale?: number;
  tint?: string;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.28, 2.2, 6]} />
        <meshLambertMaterial color={palette.trunk} />
      </mesh>
      <mesh position={[0, 2.7, 0]} scale={[1.5, 1.25, 1.5]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color={tint} />
      </mesh>
      <mesh position={[0.75, 2.2, 0.35]} scale={0.85}>
        <icosahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color={palette.foliageC} />
      </mesh>
      <mesh position={[-0.6, 2.35, -0.5]} scale={0.75}>
        <icosahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color={palette.foliageB} />
      </mesh>
      <ContactShadow position={[0, 0.03, 0]} radius={1.5 } />
    </group>
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

function EntranceArch() {
  const sign = useSignTexture();
  return (
    <group position={[0, 0, 17]}>
      {[-2.4, 2.4].map((x) => (
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

// Shared path curve so vegetation can keep clear of the walkable route.
const PATH_FROM = { x: 0, z: 16 };
const PATH_MID = { x: -1.4, z: 3 };
const PATH_TO = { x: 5.4, z: -3.2 };

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

// A short curved path: reused flat quads stepped along a spline-ish curve.
function Path() {
  const steps = useMemo(() => {
    const list: { p: [number, number, number]; r: number }[] = [];
    const count = 22;
    let prev = PATH_FROM;
    for (let i = 0; i <= count; i++) {
      const { x, z } = pathPoint(i / count);
      const r = Math.atan2(x - prev.x, z - prev.z);
      list.push({ p: [x, 0.02, z], r: i === 0 ? 0 : r });
      prev = { x, z };
    }
    return list;
  }, []);

  return (
    <group>
      {steps.map(({ p, r }, i) => (
        <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, -r]}>
          <planeGeometry args={[2.4, 1.6]} />
          <meshLambertMaterial color={palette.path} />
        </mesh>
      ))}
    </group>
  );
}

// Central planted island the path curves around.
function GardenIsland() {
  const flowers = useMemo(() => {
    const random = rng(41);
    const dummy = new Object3D();
    const list: Matrix4[] = [];
    for (let i = 0; i < 54; i++) {
      const a = random() * Math.PI * 2;
      const r = 0.4 + random() * 2.1;
      dummy.position.set(Math.cos(a) * r, 0.5 + random() * 0.25, Math.sin(a) * r);
      dummy.rotation.set(0, random() * Math.PI, 0);
      const s = 0.12 + random() * 0.1;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, []);

  return (
    <group position={[-3.6, 0, 2]}>
      {/* stone rim + soil */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
        <ringGeometry args={[2.6, 3.1, 24]} />
        <meshLambertMaterial color={palette.stone} />
      </mesh>
      <mesh position-y={0.18}>
        <cylinderGeometry args={[2.7, 2.85, 0.36, 24]} />
        <meshLambertMaterial color={palette.bedSoil} />
      </mesh>
      <group position-y={0.36}>
        <Instances matrices={flowers} color={palette.flowerPink}>
          <icosahedronGeometry args={[1, 0]} />
        </Instances>
      </group>
      {/* a few taller shrubs in the bed */}
      {([
        [-1.2, 0.6, 0.4],
        [0.9, 0.7, -0.9],
        [0.2, 0.55, 1.3],
      ] as [number, number, number][]).map(([x, s, z], i) => (
        <mesh key={i} position={[x, 0.55 + s * 0.4, z]} scale={s}>
          <icosahedronGeometry args={[1, 1]} />
          <meshLambertMaterial color={i % 2 ? palette.shrub : palette.foliageB} />
        </mesh>
      ))}
    </group>
  );
}

function Greenhouse() {
  return (
    <group position={[-13, 0, -13]} rotation-y={0.7}>
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
      if (nearPath(x, z, 2.6)) continue;
      dummy.position.set(x, 0.35, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      const s = 0.4 + random() * 0.5;
      dummy.scale.set(s, s * 0.8, s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, []);

  const blooms = useMemo(() => {
    const random = rng(77);
    const dummy = new Object3D();
    const list: Matrix4[] = [];
    for (let i = 0; i < 110 && list.length < 70; i++) {
      const a = random() * Math.PI * 2;
      const r = 4 + random() * 12;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (nearPath(x, z, 1.9)) continue;
      dummy.position.set(x, 0.25 + random() * 0.1, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      dummy.scale.setScalar(0.11 + random() * 0.08);
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
      <Instances matrices={blooms} color={palette.flowerCream}>
        <icosahedronGeometry args={[1, 0]} />
      </Instances>
    </group>
  );
}

export function Plaza() {
  return (
    <group>
      <EntranceArch />
      <Path />
      <GardenIsland />
      <Greenhouse />
      <Scatter />
      <Tree position={[-7.5, 0, 6]} scale={1.15} tint={palette.foliageA} />
      <Tree position={[8.5, 0, 5.5]} scale={0.95} tint={palette.foliageB} />
      <Tree position={[10, 0, -8]} scale={1.3} tint={palette.foliageC} />
      {/* rocks framing the plaza */}
      {([
        [-5.2, -1.6, 0.7],
        [4.2, 6.4, 0.55],
        [-9, -6, 0.9],
        [8.6, 0.5, 0.45],
      ] as [number, number, number][]).map(([x, z, s], i) => (
        <mesh key={i} position={[x, s * 0.5, z]} scale={s} rotation-y={i}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={palette.stone} />
        </mesh>
      ))}
      {/* soil pad + shadow under the interaction plant */}
      <ContactShadow position={[6, 0.03, -4]} radius={1.6} opacity={0.2} />
    </group>
  );
}
