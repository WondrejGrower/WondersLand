import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function randomSource(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A curved, ribbed, serrated leaflet. It has geometry on both sides of its rib. */
function leaflet(length: number, width: number, shade: number, lowDetail = false) {
  const vertices: number[] = [],
    colors: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const tint = new Color();
  const rows = lowDetail ? 14 : 48,
    columns = lowDetail ? 2 : 6;
  for (let y = 0; y <= rows; y++) {
    const t = y / rows;
    const profile = Math.pow(Math.sin(Math.PI * t), 0.85);
    const tooth = y % 2 === 0 ? 1 : 0.72;
    for (let x = 0; x <= columns; x++) {
      const u = (x / columns - 0.5) * 2;
      const edge = width * profile * tooth;
      const z =
        length * (0.12 * Math.sin(Math.PI * t) - 0.21 * t * t) -
        Math.abs(u) * edge * 0.22 +
        Math.sin(t * 48) * Math.abs(u) * 0.008;
      vertices.push(u * edge, t * length, z);
      uv.push(x / columns, t);
      const rib = x === columns / 2 ? 0.19 : y % 2 === 0 ? 0.025 : 0;
      tint.setRGB(0.055 + rib * 0.42, (0.19 + rib + profile * 0.09) * shade, 0.028 + rib * 0.15);
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + columns + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function tube(points: Vector3[], radius: number, tint: Color, segments = 14, taper = 0.5) {
  const curve = new CatmullRomCurve3(points);
  const g = new TubeGeometry(curve, segments, radius, 8, false);
  const pos = g.getAttribute("position"),
    rgb: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const t = Math.floor(i / 9) / segments;
    const center = curve.getPointAt(t),
      scale = 1 - t * taper;
    pos.setXYZ(
      i,
      center.x + (pos.getX(i) - center.x) * scale,
      center.y + (pos.getY(i) - center.y) * scale,
      center.z + (pos.getZ(i) - center.z) * scale,
    );
    const light = 0.7 + (0.3 * (i % 9)) / 8;
    rgb.push(tint.r * light, tint.g * light, tint.b * light);
  }
  g.setAttribute("color", new Float32BufferAttribute(rgb, 3));
  g.computeVertexNormals();
  return g;
}

function mergedMesh(geometries: BufferGeometry[], material: MeshStandardMaterial) {
  const merged = mergeGeometries(geometries, false)!;
  geometries.forEach((g) => g.dispose());
  return new Mesh(merged, material);
}

export const LEAF_ANCHOR = new Vector3(1.36, 3.35, 0.42);
export const FLOWER_ANCHOR = new Vector3(0.12, 5.94, 0.14);

/** One connected botanical sculpture; no image planes, downloaded model or old world. */
export function createPlant(lowDetail = false) {
  const plant = new Group(),
    random = randomSource(42042);
  plant.name = "NoTillMan — one living plant";
  const leaves: BufferGeometry[] = [],
    stems: BufferGeometry[] = [],
    roots: BufferGeometry[] = [];
  const stemColor = new Color("#658543"),
    rootColor = new Color("#b7a078");
  const greenMaterial = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.83,
    side: DoubleSide,
  });
  const stemMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const rootMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });

  stems.push(
    tube(
      [
        new Vector3(0, 0, 0),
        new Vector3(0.08, 1.8, 0),
        new Vector3(-0.06, 3.3, 0.03),
        new Vector3(0.13, 4.7, 0),
        new Vector3(0.1, 6, 0),
      ],
      0.084,
      stemColor,
      34,
      0.78,
    ),
  );

  function fan(x: number, y: number, z: number, size: number, azimuth: number, tilt: number) {
    const rig = new Object3D();
    rig.position.set(x, y, z);
    rig.rotation.set(-0.28, azimuth, tilt);
    rig.updateMatrix();
    for (let f = -3; f <= 3; f++) {
      const length = size * [1, 0.91, 0.72, 0.45][Math.abs(f)]!;
      const g = leaflet(length, length * 0.105, 0.84 + random() * 0.3, lowDetail);
      g.rotateZ(-f * 0.39);
      g.applyMatrix4(rig.matrix);
      leaves.push(g);
    }
    stems.push(
      tube(
        [
          new Vector3(0, y - 0.26, 0),
          new Vector3(x * 0.52, y - 0.17, z * 0.5),
          new Vector3(x, y, z),
        ],
        0.026 * size,
        stemColor,
        10,
        0.45,
      ),
    );
  }
  fan(-0.86, 1.25, 0.48, 0.95, -0.32, 0.89);
  fan(0.91, 1.72, -0.15, 1.04, 0.32, -0.94);
  fan(-0.82, 2.24, -0.48, 0.88, -0.63, 0.9);
  fan(0.96, 2.85, 0.54, 1.04, -0.12, -0.67);
  fan(-0.8, 3.29, 0.2, 0.88, 0.2, 0.8);
  fan(0.65, 3.8, -0.45, 0.68, 0.5, -0.74);
  fan(-0.5, 4.2, -0.12, 0.62, -0.3, 0.69);
  fan(0.4, 4.64, 0.2, 0.44, 0.1, -0.48);

  // Tapered branching roots have their own depth, unlike a photographic cutout.
  for (let r = 0; r < 13; r++) {
    const angle = (r * Math.PI * 2) / 13 + random() * 0.2;
    const reach = 0.85 + random() * 0.9,
      depth = 1.55 + random() * 1.15;
    const path = [new Vector3(0, 0, 0)];
    for (let s = 1; s <= 5; s++) {
      const t = s / 5;
      path.push(
        new Vector3(
          Math.cos(angle + t * 0.55) * reach * Math.sin(t * 1.8),
          -depth * t,
          Math.sin(angle + t * 0.55) * reach * Math.sin(t * 1.8),
        ),
      );
    }
    roots.push(tube(path, 0.044 + random() * 0.027, rootColor, 20, 0.94));
    for (let branch = 1; branch < 5; branch++) {
      const base = path[branch]!,
        a = angle + (branch % 2 ? 1 : -1) * (0.5 + random());
      const tip = base
        .clone()
        .add(new Vector3(Math.cos(a) * 0.45, -0.45 - random() * 0.4, Math.sin(a) * 0.45));
      roots.push(
        tube(
          [
            base.clone(),
            base
              .clone()
              .lerp(tip, 0.5)
              .add(new Vector3(0.1, 0, 0.08)),
            tip,
          ],
          0.014,
          rootColor,
          8,
          0.96,
        ),
      );
    }
  }

  // Fine root hairs and branching hypha-like filaments remain visible in macro.
  const fibres: number[] = [];
  for (let i = 0; i < (lowDetail ? 160 : 720); i++) {
    const a = random() * Math.PI * 2,
      t = 0.15 + random() * 0.8;
    const radius = (0.85 + random() * 0.55) * Math.sin(t * 1.8);
    const x = Math.cos(a) * radius,
      y = -t * 2.6,
      z = Math.sin(a) * radius;
    const reach = 0.035 + random() * 0.12;
    const tip = [x + Math.cos(a + 0.7) * reach, y - reach * 0.5, z + Math.sin(a + 0.7) * reach];
    fibres.push(
      x,
      y,
      z,
      ...tip,
      ...tip,
      tip[0]! + reach * 0.3,
      tip[1]! - reach * 0.3,
      tip[2]! + reach * 0.2,
    );
  }
  const fibreGeometry = new BufferGeometry();
  fibreGeometry.setAttribute("position", new Float32BufferAttribute(fibres, 3));
  plant.add(new LineSegments(fibreGeometry, new LineBasicMaterial({ color: "#b8ad87" })));

  const buds: { position: Vector3; scale: Vector3; tint: Color }[] = [];
  const hairs: number[] = [],
    trichomes: number[] = [];
  function flower(x: number, y: number, z: number, height: number, radius: number) {
    stems.push(
      tube(
        [
          new Vector3(0, y - 0.8, 0),
          new Vector3(x * 0.7, y - 0.25, z * 0.7),
          new Vector3(x, y + height * 0.7, z),
        ],
        0.032,
        stemColor,
        12,
        0.7,
      ),
    );
    for (let i = 0; i < Math.round(height * (lowDetail ? 120 : 235)); i++) {
      const t = random(),
        angle = i * 2.39996;
      const bulge = Math.pow(Math.sin(Math.PI * t), 0.6);
      const r = radius * (0.18 + 0.82 * bulge) * (0.62 + random() * 0.38);
      const position = new Vector3(
        x + Math.cos(angle) * r,
        y + t * height,
        z + Math.sin(angle) * r,
      );
      const scale = 0.037 + random() * 0.031;
      const tint = new Color().setHSL(
        random() > 0.95 ? 0.78 : 0.22 + random() * 0.05,
        0.23 + random() * 0.22,
        0.26 + random() * 0.11,
      );
      buds.push({ position, scale: new Vector3(scale, scale * 1.65, scale * 0.85), tint });
      for (let h = 0; h < 2; h++) {
        const direction = new Vector3(Math.cos(angle), 0.8, Math.sin(angle)).multiplyScalar(
          0.045 + random() * 0.045,
        );
        const middle = position.clone().addScaledVector(direction, 0.6),
          end = position.clone().add(direction);
        end.y += 0.02;
        end.x += (random() - 0.5) * 0.07;
        hairs.push(
          ...position.toArray(),
          ...middle.toArray(),
          ...middle.toArray(),
          ...end.toArray(),
        );
      }
      for (let crystal = 0; crystal < (lowDetail ? 1 : 5); crystal++) {
        trichomes.push(
          position.x + Math.cos(angle) * scale,
          position.y + random() * scale * 1.5,
          position.z + Math.sin(angle) * scale,
        );
      }
    }
    for (let i = 0; i < 13; i++) {
      const t = i / 13,
        g = leaflet(height * (0.18 + random() * 0.12), radius * 0.1, 0.9, lowDetail);
      g.rotateX(-0.25);
      g.rotateZ(0.55 + random() * 0.65);
      g.rotateY(i * 2.4);
      g.translate(x, y + t * height * 0.85, z);
      leaves.push(g);
    }
  }
  flower(0.1, 4.7, 0.02, 1.48, 0.29);
  flower(-0.67, 4.04, 0.12, 0.95, 0.22);
  flower(0.68, 3.92, -0.12, 0.92, 0.23);
  flower(-0.94, 3.17, -0.3, 0.77, 0.19);
  flower(0.91, 3.17, 0.45, 0.87, 0.21);

  plant.add(
    mergedMesh(leaves, greenMaterial),
    mergedMesh(stems, stemMaterial),
    mergedMesh(roots, rootMaterial),
  );
  const budMesh = new InstancedMesh(
    new IcosahedronGeometry(1, lowDetail ? 0 : 1),
    new MeshStandardMaterial({ roughness: 0.87 }),
    buds.length,
  );
  const dummy = new Object3D();
  buds.forEach((bud, i) => {
    dummy.position.copy(bud.position);
    dummy.scale.copy(bud.scale);
    dummy.rotation.set(random(), random(), random());
    dummy.updateMatrix();
    budMesh.setMatrixAt(i, dummy.matrix);
    budMesh.setColorAt(i, bud.tint);
  });
  budMesh.instanceMatrix.needsUpdate = true;
  budMesh.computeBoundingSphere();
  plant.add(budMesh);
  const hairGeometry = new BufferGeometry();
  hairGeometry.setAttribute("position", new Float32BufferAttribute(hairs, 3));
  plant.add(new LineSegments(hairGeometry, new LineBasicMaterial({ color: "#b98342" })));
  const crystalGeometry = new BufferGeometry();
  crystalGeometry.setAttribute("position", new Float32BufferAttribute(trichomes, 3));
  plant.add(
    new Points(
      crystalGeometry,
      new PointsMaterial({ color: "#e1dfb6", size: 0.018, sizeAttenuation: true }),
    ),
  );

  // A small, irregular soil island makes the surface/underground transition legible.
  const soil = new IcosahedronGeometry(1, 2),
    pos = soil.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const ripple = 0.95 + Math.sin(pos.getX(i) * 13 + pos.getZ(i) * 9) * 0.06;
    pos.setXYZ(
      i,
      pos.getX(i) * 1.55 * ripple,
      pos.getY(i) * 0.22 - 0.13,
      pos.getZ(i) * 1.55 * ripple,
    );
  }
  soil.computeVertexNormals();
  plant.add(
    new Mesh(soil, new MeshStandardMaterial({ color: "#30261b", roughness: 1, flatShading: true })),
  );
  const pebbles = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    new MeshStandardMaterial({ color: "#584631", roughness: 1 }),
    lowDetail ? 165 : 405,
  );
  for (let i = 0; i < pebbles.count; i++) {
    const a = random() * Math.PI * 2,
      r = Math.sqrt(random()) * 1.4;
    dummy.position.set(Math.cos(a) * r, 0.045 - r * 0.02, Math.sin(a) * r);
    if (i >= 85)
      dummy.position.set((random() - 0.5) * 3.3, -0.3 - random() * 2.5, -0.4 - random() * 1.2);
    dummy.scale.setScalar(i < 85 ? 0.025 + random() * 0.055 : 0.018 + random() * 0.095);
    dummy.rotation.set(random(), random(), random());
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  pebbles.computeBoundingSphere();
  plant.add(pebbles);
  return plant;
}

export function disposePlant(plant: Group) {
  const geometries = new Set<BufferGeometry>(),
    materials = new Set<{ dispose(): void }>();
  plant.traverse((object) => {
    if (object instanceof Mesh || object instanceof Points || object instanceof LineSegments) {
      geometries.add(object.geometry);
      for (const m of Array.isArray(object.material) ? object.material : [object.material])
        materials.add(m);
      if (object instanceof InstancedMesh) object.dispose();
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
