import {
  Color,
  InstancedMesh,
  LineSegments,
  Matrix4,
  Mesh,
  Points,
  type BufferGeometry,
  type Material,
  type PerspectiveCamera,
  type Scene,
} from "three";

type Surface = {
  geometry: BufferGeometry;
  object: Mesh | Points | LineSegments;
  color: Color;
  kind: "faces" | "points" | "lines";
};
type Primitive = {
  z: number;
  kind: "face" | "point" | "line";
  x: number;
  y: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  color: string;
  radius: number;
};

/** A small painter's-algorithm renderer for devices without WebGL. The same
 * perspective camera and 3D geometry remain interactive; it is not an image swap. */
export class SoftwareRenderer {
  readonly domElement = document.createElement("canvas");
  readonly info = { render: { calls: 0, triangles: 0 } };
  outputColorSpace = "";
  toneMapping = 0;
  toneMappingExposure = 1;
  private context = this.domElement.getContext("2d", { alpha: true })!;
  private width = 1;
  private height = 1;
  private ratio = 1;
  private surfaces: Surface[] | null = null;
  private sprites = new Map<string, HTMLCanvasElement>();
  setClearColor(_color: number, _alpha: number) {}
  setPixelRatio(value: number) {
    this.ratio = value;
  }
  setSize(width: number, height: number, _style = false) {
    this.width = width;
    this.height = height;
    this.domElement.width = Math.max(1, Math.round(width * this.ratio));
    this.domElement.height = Math.max(1, Math.round(height * this.ratio));
  }
  private sprite(color: string) {
    let sprite = this.sprites.get(color);
    if (!sprite) {
      sprite = document.createElement("canvas");
      sprite.width = sprite.height = 32;
      const c = sprite.getContext("2d")!,
        shade = c.createRadialGradient(11, 8, 1, 17, 17, 16);
      shade.addColorStop(0, color);
      shade.addColorStop(1, new Color(color).multiplyScalar(0.58).getStyle());
      c.fillStyle = shade;
      c.beginPath();
      c.ellipse(16, 16, 15, 16, 0, 0, Math.PI * 2);
      c.fill();
      this.sprites.set(color, sprite);
    }
    return sprite;
  }
  render(scene: Scene, camera: PerspectiveCamera) {
    const ctx = this.context,
      width = this.width,
      height = this.height;
    if (!ctx) throw new Error("Canvas rendering is unavailable");
    scene.updateMatrixWorld();
    if (!this.surfaces) {
      this.surfaces = [];
      scene.traverse((object) => {
        if (!(object instanceof Mesh || object instanceof LineSegments || object instanceof Points))
          return;
        const material = (
          Array.isArray(object.material) ? object.material[0]! : object.material
        ) as Material & { color?: Color };
        this.surfaces!.push({
          object,
          geometry: object.geometry,
          color: material.color ?? new Color(1, 1, 1),
          kind:
            object instanceof LineSegments
              ? "lines"
              : object instanceof Points
                ? "points"
                : "faces",
        });
      });
    }
    const vp = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const matrix = new Matrix4(),
      instance = new Matrix4();
    const primitives: Primitive[] = [],
      tint = new Color();
    let triangles = 0;
    function project(x: number, y: number, z: number, m: Matrix4) {
      const e = m.elements,
        w = e[3]! * x + e[7]! * y + e[11]! * z + e[15]!;
      const px = (e[0]! * x + e[4]! * y + e[8]! * z + e[12]!) / w;
      const py = (e[1]! * x + e[5]! * y + e[9]! * z + e[13]!) / w;
      return [
        ((px + 1) * width) / 2,
        ((-py + 1) * height) / 2,
        (e[2]! * x + e[6]! * y + e[10]! * z + e[14]!) / w,
        w,
      ] as const;
    }
    for (const part of this.surfaces) {
      const { object, geometry, color, kind } = part;
      matrix.multiplyMatrices(vp, object.matrixWorld);
      if (object instanceof InstancedMesh) {
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, instance);
          const e = instance.elements,
            point = project(e[12]!, e[13]!, e[14]!, matrix);
          if (point[2] > 1 || point[2] < -1) continue;
          const scale = Math.hypot(e[0]!, e[1]!, e[2]!);
          const radius = Math.max(0.6, (scale * height) / (point[3] * 0.75));
          if (
            point[0] + radius < 0 ||
            point[0] - radius > width ||
            point[1] + radius < 0 ||
            point[1] - radius > height
          )
            continue;
          tint.copy(color);
          if (object.instanceColor) object.getColorAt(i, tint);
          // Quantized palette shares tiny shaded sphere sprites instead of per-frame gradients.
          const rgb = [tint.r, tint.g, tint.b].map((c) => Math.round(Math.sqrt(c) * 12) * 20);
          primitives.push({
            z: point[2],
            kind: "point",
            x: point[0],
            y: point[1],
            x2: 0,
            y2: 0,
            x3: 0,
            y3: 0,
            color: `rgb(${rgb.join(",")})`,
            radius,
          });
        }
        continue;
      }
      const position = geometry.getAttribute("position"),
        colors = geometry.getAttribute("color"),
        normal = geometry.getAttribute("normal");
      const projected = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) {
        const p = project(position.getX(i), position.getY(i), position.getZ(i), matrix);
        projected[i * 3] = p[0];
        projected[i * 3 + 1] = p[1];
        projected[i * 3 + 2] = p[3] > 0 ? p[2] : 2;
      }
      if (kind === "points") {
        for (let i = 0; i < position.count; i++) {
          const x = projected[i * 3]!,
            y = projected[i * 3 + 1]!,
            z = projected[i * 3 + 2]!;
          if (z > 1 || z < -1 || x < 0 || x > width || y < 0 || y > height) continue;
          primitives.push({
            z,
            kind: "point",
            x,
            y,
            x2: 0,
            y2: 0,
            x3: 0,
            y3: 0,
            color: "#d6d6ad",
            radius: 0.65,
          });
        }
        continue;
      }
      const index = geometry.index,
        count = index ? index.count : position.count,
        stride = kind === "lines" ? 2 : 3;
      for (let i = 0; i < count; i += stride) {
        const a = (index ? index.getX(i) : i) * 3,
          b = (index ? index.getX(i + 1) : i + 1) * 3;
        const c = kind === "lines" ? b : (index ? index.getX(i + 2) : i + 2) * 3;
        const z = (projected[a + 2]! + projected[b + 2]! + projected[c + 2]!) / 3;
        if (z > 1 || z < -1) continue;
        const x = projected[a]!,
          y = projected[a + 1]!,
          x2 = projected[b]!,
          y2 = projected[b + 1]!,
          x3 = projected[c]!,
          y3 = projected[c + 1]!;
        if (
          Math.max(x, x2, x3) < 0 ||
          Math.min(x, x2, x3) > width ||
          Math.max(y, y2, y3) < 0 ||
          Math.min(y, y2, y3) > height
        )
          continue;
        const n = a / 3;
        const light = normal
          ? 0.48 +
            Math.abs(normal.getX(n) * -0.35 + normal.getY(n) * 0.65 + normal.getZ(n) * 0.7) * 0.6
          : 0.9;
        if (colors) tint.setRGB(colors.getX(n), colors.getY(n), colors.getZ(n));
        else tint.copy(color);
        tint.multiplyScalar(light);
        primitives.push({
          z,
          kind: kind === "lines" ? "line" : "face",
          x,
          y,
          x2,
          y2,
          x3,
          y3,
          color: tint.getStyle(),
          radius: 0,
        });
        if (kind === "faces") triangles++;
      }
    }
    primitives.sort((a, b) => b.z - a.z);
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.65;
    for (const p of primitives) {
      if (p.kind === "point") {
        if (p.radius > 1)
          ctx.drawImage(
            this.sprite(p.color),
            p.x - p.radius,
            p.y - p.radius * 1.3,
            p.radius * 2,
            p.radius * 2.6,
          );
        else {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, 1, 1);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x2, p.y2);
        if (p.kind === "line") {
          ctx.strokeStyle = p.color;
          ctx.stroke();
        } else {
          ctx.lineTo(p.x3, p.y3);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }
    }
    this.info.render.calls = primitives.length;
    this.info.render.triangles = triangles;
  }
  dispose() {
    this.surfaces = null;
    this.sprites.clear();
  }
  forceContextLoss() {}
}
