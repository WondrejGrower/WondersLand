import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Sky } from "./Sky";
import { Ground } from "./Ground";
import { Plaza } from "./Plaza";
import { GardenPlants } from "./GardenPlants";
import { Player } from "./Player";
import { Cottage } from "./Cottage";
import { GardenBoard } from "./GardenBoard";
import { WelcomeSign } from "./WelcomeSign";
import { GrowBeds } from "./GrowBeds";
import { FocusRing } from "./FocusRing";
import { DestinationMarker } from "./DestinationMarker";
import { HighlightRing } from "./HighlightRing";
import { WorldPointerInput } from "./input/WorldPointerInput";
import { useWorldSettingsStore } from "../state/useWorldSettingsStore";
import { useLayoutEditorStore } from "./editor/useLayoutEditorStore";
import { EditorLayer } from "./editor/EditorLayer";
import { EditorCamera } from "./editor/EditorCamera";
import { palette } from "./palette";
import { HIDDEN_LAYOUT_ITEMS } from "./layout";
import { PlacedModels } from "./editor/PlacedModels";

// Phones pay twice for pixels: lower the ceiling and drop MSAA there.
const coarse =
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches === true;

/** On-demand rendering driven by a timer: an honest, cheap FPS cap. */
function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

export default function World() {
  const renderScale = useWorldSettingsStore((s) => s.graphics.renderScale);
  const fpsLimit = useWorldSettingsStore((s) => s.graphics.fpsLimit);
  // Hidden layout editor: scenery remounts on every edit so it re-reads layout.
  const editing = useLayoutEditorStore((s) => s.active);
  const layoutVersion = useLayoutEditorStore((s) => s.version);

  // Settings persist locally; read them before the first frame.
  useEffect(() => {
    useWorldSettingsStore.getState().hydrate();
  }, []);

  const ceiling = (coarse ? 1.25 : 1.5) * renderScale;
  const capped = fpsLimit <= 30;

  return (
    <Canvas
      dpr={[1, ceiling]}
      frameloop={capped ? "demand" : "always"}
      camera={{ fov: 55, near: 0.1, far: 120, position: [0, 3, 14] }}
      gl={{ antialias: !coarse, powerPreference: "high-performance" }}
      style={{ touchAction: "none" }}
    >
      {capped && <FrameLimiter fps={fpsLimit} />}
      <fog attach="fog" args={[palette.fog, 26, 72]} />
      <hemisphereLight args={[palette.skyTop, palette.ground, 1.0]} />
      <directionalLight position={[8, 12, 6]} intensity={1.25} color={palette.sun} />
      <Sky />
      <group key={layoutVersion}>
        <Ground />
        <Plaza />
        {!HIDDEN_LAYOUT_ITEMS.has("grow-beds") && <GrowBeds />}
        {!HIDDEN_LAYOUT_ITEMS.has("cottage") && <Cottage />}
        <Suspense fallback={null}>
          {!HIDDEN_LAYOUT_ITEMS.has("garden-board") && <GardenBoard />}
        </Suspense>
        {!HIDDEN_LAYOUT_ITEMS.has("welcome-sign") && <WelcomeSign />}
        <GardenPlants />
        <PlacedModels />
      </group>
      <FocusRing />
      <DestinationMarker />
      <HighlightRing />
      {editing ? (
        <>
          <EditorLayer />
          <EditorCamera />
        </>
      ) : (
        <WorldPointerInput />
      )}
      <Player />
    </Canvas>
  );
}
