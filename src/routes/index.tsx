import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { useNostrStore } from "../state/useNostrStore";
import { LandingScreen } from "../ui/LandingScreen";
import { HomeDashboard } from "../ui/HomeDashboard";


import { Journal } from "../ui/Journal";
import { IndoorGarden } from "../ui/IndoorGarden";
import { AboutSign } from "../ui/AboutSign";
import { InteractionPrompt } from "../ui/InteractionPrompt";
import { TasksBoard } from "../features/tasks/TasksBoard";
import { TouchControls } from "../ui/TouchControls";
import { ExitWorldSwitch } from "../ui/ExitWorldSwitch";
import { WorldSettingsButton } from "../ui/WorldSettingsButton";
import { WorldSettings } from "../ui/WorldSettings";
import { WorldHint } from "../ui/WorldHint";
import { useWorldSettingsStore } from "../state/useWorldSettingsStore";
import { useLayoutEditorStore } from "../world/editor/useLayoutEditorStore";

// Three.js is browser-only: the module itself must not load during SSR.
const World = lazy(() => import("../world/World"));
// Hidden owner tool: never part of the normal bundle path.
const LayoutEditorPanel = lazy(() =>
  import("../ui/LayoutEditorPanel").then((m) => ({ default: m.LayoutEditorPanel })),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WondersLand — A cozy 3D botanical world in your browser" },
      {
        name: "description",
        content:
          "Wander a peaceful 3D garden, wander among plants and read their grow journals. No downloads, no accounts.",
      },
      { property: "og:title", content: "WondersLand — A cozy 3D botanical world" },
      {
        property: "og:description",
        content: "Explore a small browser garden and learn about the plants growing in it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <p className="text-sm tracking-wide text-muted-foreground">Growing the garden…</p>
    </div>
  );
}

function Index() {
  const entered = useWorldStore((s) => s.entered);
  const pubkey = useNostrStore((s) => s.pubkey);
  const restoring = useNostrStore((s) => s.restoring);
  const restore = useNostrStore((s) => s.restore);
  const [hydrated, setHydrated] = useState(false);
  const hudScale = useWorldSettingsStore((s) => s.interface.hudScale);
  const largeText = useWorldSettingsStore((s) => s.accessibility.largeText);

  const editorOpen = useLayoutEditorStore((s) => s.active);

  useEffect(() => setHydrated(true), []);

  // Hidden layout editor, owner only: ?edit=1, F2, or a two-finger long press
  // on touch devices. Invisible and inert for every other visitor.
  useEffect(() => {
    if (!isOwner(pubkey)) {
      if (useLayoutEditorStore.getState().active) useLayoutEditorStore.getState().close();
      return;
    }
    const toggle = () => {
      const store = useLayoutEditorStore.getState();
      if (store.active) store.close();
      else store.open();
    };
    if (new URLSearchParams(window.location.search).get("edit") === "1") {
      useLayoutEditorStore.getState().open();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F2") return;
      e.preventDefault();
      toggle();
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const onTouchStart = (e: TouchEvent) => {
      cancel();
      if (e.touches.length !== 2) return;
      timer = setTimeout(() => {
        timer = null;
        toggle();
      }, 1200);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", cancel, { passive: true });
    window.addEventListener("touchend", cancel);
    window.addEventListener("touchcancel", cancel);
    return () => {
      cancel();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", cancel);
      window.removeEventListener("touchend", cancel);
      window.removeEventListener("touchcancel", cancel);
    };
  }, [pubkey]);

  // Restore the saved session as early as possible so a returning grower never
  // sees the signed-out landing page flash before their dashboard.
  useEffect(() => {
    void restore();
  }, [restore]);

  // Signing in or out always returns to the 2D shell, never into a stale world.
  useEffect(() => {
    useWorldStore.setState({
      entered: false,
      journalOpen: false,
      indoorOpen: false,
      aboutOpen: false,
      target: null,
      focusedPlantId: null,
    });
  }, [pubkey]);

  // SSR renders the public landing page (good for crawlers); only after
  // hydration may we show the restore state.
  if (hydrated && restoring) return <Loading />;

  // Signed-out visitors keep the marketing landing; signed-in Nostr users get
  // the app Home, from which the 3D garden is one destination.
  if (!entered) return pubkey ? <HomeDashboard /> : <LandingScreen />;


  // HUD size and larger text are device preferences, applied to the overlay
  // layer only — the 3D canvas itself is untouched.
  const steps = ["text-[0.9rem]", "text-base", "text-[1.15rem]", "text-[1.3rem]"];
  const index = (hudScale === "small" ? 0 : hudScale === "large" ? 2 : 1) + (largeText ? 1 : 0);
  const hudFont = steps[Math.min(index, steps.length - 1)];

  return (
    <main className={`relative h-screen w-screen overflow-hidden bg-background ${hudFont}`}>
      <ClientOnly fallback={<Loading />}>
        <Suspense fallback={<Loading />}>
          <World />
        </Suspense>
      </ClientOnly>
      <TouchControls />
      <ExitWorldSwitch />
      <WorldSettingsButton />
      <InteractionPrompt />
      <WorldHint />
      <Journal />
      <IndoorGarden />
      <AboutSign />
      <TasksBoard />
      <WorldSettings />
      {editorOpen && (
        <Suspense fallback={null}>
          <LayoutEditorPanel />
        </Suspense>
      )}
    </main>
  );
}
