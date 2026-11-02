import { describe, expect, it } from "vitest";
import { Box3, InstancedMesh, Mesh, Vector3 } from "three";
import { cameraPose, pixelRatio } from "./journey";
import { createPlant, disposePlant } from "./plant";

describe("botanical scene budgets and camera", () => {
  it("keeps drawing-buffer pixels bounded on phones, high DPR and 4K displays", () => {
    for (const [width, height, dpr] of [
      [390, 844, 3],
      [1440, 900, 2],
      [3840, 2160, 2],
    ]) {
      const ratio = pixelRatio(width!, height!, dpr!);
      expect(width! * height! * ratio * ratio).toBeLessThanOrEqual(
        (width! < 700 ? 600_000 : 1_250_000) + 1,
      );
      expect(ratio).toBeGreaterThan(0);
    }
  });
  it("ascends continuously, clamps overscroll, and retains the same camera framing on mobile", () => {
    for (const mobile of [false, true]) {
      let previous = -Infinity;
      for (let step = 0; step <= 100; step++) {
        const pose = cameraPose(step / 100, mobile);
        expect(pose.focusY).toBeGreaterThanOrEqual(previous);
        expect(pose.distance).toBeGreaterThan(0);
        expect(Object.values(pose).every(Number.isFinite)).toBe(true);
        previous = pose.focusY;
      }
      expect(cameraPose(-1, mobile)).toEqual(cameraPose(0, mobile));
      expect(cameraPose(2, mobile)).toEqual(cameraPose(1, mobile));
    }
  });
  it("builds finite volumetric geometry within mobile and desktop triangle budgets", () => {
    for (const lowDetail of [false, true]) {
      const plant = createPlant(lowDetail),
        bounds = new Box3().setFromObject(plant);
      let triangles = 0,
        meshCount = 0;
      plant.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        meshCount++;
        const geometry = object.geometry,
          positions = geometry.getAttribute("position");
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        triangles +=
          ((geometry.index?.count ?? positions.count) / 3) *
          (object instanceof InstancedMesh ? object.count : 1);
      });
      expect(triangles).toBeLessThan(lowDetail ? 40_000 : 160_000);
      expect(meshCount).toBeLessThanOrEqual(6);
      expect(bounds.min.y).toBeLessThan(-2);
      expect(bounds.max.y).toBeGreaterThan(6);
      expect(bounds.getSize(new Vector3()).z).toBeGreaterThan(1.5);
      disposePlant(plant);
    }
  });
});
