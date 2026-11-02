import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { createPlant, disposePlant, FLOWER_ANCHOR, LEAF_ANCHOR } from "./plant";
import { cameraPose, clamp, pixelRatio, smoothstep } from "./journey";
import { SoftwareRenderer } from "./SoftwareRenderer";

export type SceneController = {
  setProgress(progress: number, immediate?: boolean): void;
  rotate(delta: number): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
};
type Anchor = { x: number; y: number; visible: boolean };
export type SceneFrame = { progress: number; width: number; leaf: Anchor; flower: Anchor };

export function mountPlantScene({
  host,
  input,
  reducedMotion,
  progress,
  onFrame,
  onStatus,
}: {
  host: HTMLElement;
  input: HTMLElement;
  reducedMotion: boolean;
  progress: number;
  onFrame(frame: SceneFrame): void;
  onStatus(ready: boolean): void;
}): SceneController {
  // This module is imported in an effect: neither Three nor WebGL runs during SSR.
  const surface = document.createElement("canvas");
  const context = surface.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const renderer = context
    ? new WebGLRenderer({
        canvas: surface,
        context,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      })
    : new SoftwareRenderer();
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.17;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset["scene"] = "volumetric-plant";
  canvas.dataset["renderer"] = context ? "webgl" : "software";
  host.appendChild(canvas);
  const scene = new Scene(),
    plant = createPlant(!context);
  scene.add(plant);
  const camera = new PerspectiveCamera(42, 1, 0.1, 60);
  const hemisphere = new HemisphereLight("#b7c5da", "#463720", 2.1);
  const sun = new DirectionalLight("#e5cfa1", 3.2);
  sun.position.set(-3, 7, 5);
  const rim = new DirectionalLight("#a594d6", 2.3);
  rim.position.set(4, 4, -3);
  scene.add(hemisphere, sun, rim);
  const darkSun = new Color("#afc9df"),
    warmSun = new Color("#fff1c6");
  const darkRim = new Color("#a594d6"),
    lightRim = new Color("#c1db90");
  const lookAt = new Vector3(),
    projected = new Vector3();
  let width = 1,
    height = 1,
    target = clamp(progress),
    current = target;
  let orbit = 0,
    targetOrbit = 0,
    frame: number | null = null,
    previous = 0;
  let disposed = false,
    lost = false,
    failed = false,
    ready = false,
    reduced = reducedMotion;
  let ratio = 1,
    quality = 1,
    slowFrames = 0,
    rendered = 0;
  let drag: {
    id: number;
    x: number;
    y: number;
    orbit: number;
    active: boolean;
    touch: boolean;
  } | null = null;

  function project(point: Vector3): Anchor {
    projected.copy(point).applyMatrix4(plant.matrixWorld).project(camera);
    return {
      x: ((projected.x + 1) * width) / 2,
      y: ((-projected.y + 1) * height) / 2,
      visible:
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.92 &&
        Math.abs(projected.y) < 0.89,
    };
  }
  function stats() {
    canvas.dataset["renderCount"] = String(rendered);
    canvas.dataset["drawCalls"] = String(renderer.info.render.calls);
    canvas.dataset["triangles"] = String(renderer.info.render.triangles);
    canvas.dataset["pixelRatio"] = ratio.toFixed(2);
    canvas.dataset["cameraY"] = camera.position.y.toFixed(3);
    canvas.dataset["orbit"] = orbit.toFixed(3);
  }
  function request() {
    if (!disposed && !lost && !failed && !document.hidden && frame === null)
      frame = requestAnimationFrame(render);
  }
  function render(now: number) {
    frame = null;
    if (disposed || lost || failed || document.hidden) return;
    const elapsed = previous ? Math.min(now - previous, 64) : 16.7;
    // Idle gaps are not slow rendering. Only consecutive moving frames affect quality.
    if (previous && now - previous < 150) {
      slowFrames = elapsed > 32 ? slowFrames + 1 : Math.max(0, slowFrames - 0.35);
      if (slowFrames > 12 && quality > 0.58) {
        quality *= 0.8;
        slowFrames = 0;
        ratio = pixelRatio(width, height, window.devicePixelRatio || 1) * quality;
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
      }
    }
    previous = now;
    const amount = reduced ? 1 : 1 - Math.exp(-elapsed / 75);
    current += (target - current) * amount;
    orbit += (targetOrbit - orbit) * amount;
    const moving = Math.abs(target - current) > 0.00008 || Math.abs(targetOrbit - orbit) > 0.0003;
    if (!moving) {
      current = target;
      orbit = targetOrbit;
    }
    const mobile = width < 700,
      pose = cameraPose(current, mobile);
    const daylight = smoothstep(0.3, 1, current);
    // A modest dolly/orbit reveals actual depth while retaining a calm editorial layout.
    lookAt.set(mobile ? -0.05 : -1.65 * Math.min(1.25, width / height / 1.4), pose.focusY, 0);
    const yaw = pose.yaw + orbit;
    camera.position.set(
      lookAt.x + Math.sin(yaw) * pose.distance,
      lookAt.y + 0.28,
      Math.cos(yaw) * pose.distance,
    );
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
    plant.rotation.y = -orbit * 0.12;
    plant.updateMatrixWorld(true);
    sun.color.copy(darkSun).lerp(warmSun, daylight);
    sun.intensity = 2.1 + daylight * 1.8;
    rim.color.copy(darkRim).lerp(lightRim, daylight);
    rim.intensity = 2.2 - daylight * 0.3;
    hemisphere.intensity = 1.55 + daylight * 1.1;
    try {
      renderer.render(scene, camera);
      rendered++;
      onFrame({
        progress: current,
        width,
        leaf: project(LEAF_ANCHOR),
        flower: project(FLOWER_ANCHOR),
      });
      if (!ready) {
        ready = true;
        onStatus(true);
      }
      if (!moving || rendered % 30 === 0) stats();
      if (moving) request();
      else previous = 0;
    } catch {
      failed = true;
      onStatus(false);
    }
  }
  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    ratio = pixelRatio(width, height, window.devicePixelRatio || 1) * quality;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    request();
  }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("a,button")))
      return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      orbit: targetOrbit,
      active: event.pointerType !== "touch",
      touch: event.pointerType === "touch",
    };
    if (drag.active) input.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (!drag.active && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      drag.active = true;
      input.setPointerCapture(event.pointerId);
    }
    if (drag.active) {
      targetOrbit = clamp(drag.orbit - (dx / Math.max(320, width)) * 1.8, -0.9, 0.9);
      request();
    }
  }
  function pointerEnd(event: PointerEvent) {
    if (drag?.id !== event.pointerId) return;
    if (input.hasPointerCapture(event.pointerId)) input.releasePointerCapture(event.pointerId);
    drag = null;
  }
  function visibility() {
    if (document.hidden && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    previous = 0;
    if (!document.hidden) request();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    ready = false;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    onStatus(false);
  }
  function contextRestored() {
    lost = false;
    previous = 0;
    request();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  input.addEventListener("pointerdown", pointerDown);
  input.addEventListener("pointermove", pointerMove);
  input.addEventListener("pointerup", pointerEnd);
  input.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  document.addEventListener("visibilitychange", visibility);
  resize();
  return {
    setProgress(p, immediate = false) {
      target = clamp(p);
      if (immediate || reduced) current = target;
      request();
    },
    rotate(delta) {
      targetOrbit = clamp(targetOrbit + delta, -0.9, 0.9);
      request();
    },
    setReducedMotion(value) {
      reduced = value;
      request();
    },
    dispose() {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      input.removeEventListener("pointerdown", pointerDown);
      input.removeEventListener("pointermove", pointerMove);
      input.removeEventListener("pointerup", pointerEnd);
      input.removeEventListener("pointercancel", pointerEnd);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      disposePlant(plant);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
