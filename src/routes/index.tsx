import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { LandingScreen } from "../ui/LandingScreen";

import { Journal } from "../ui/Journal";
import { TouchControls } from "../ui/TouchControls";

// Three.js is browser-only: the module itself must not load during SSR.
const World = lazy(() => import("../world/World"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WondersLand — A cozy 3D botanical world in your browser" },
      {
        name: "description",
        content:
          "Wander a peaceful 3D garden, walk up to a cannabis plant and read its botanical journal. No downloads, no accounts.",
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

  if (!entered) return <LandingScreen />;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <ClientOnly fallback={<Loading />}>
        <Suspense fallback={<Loading />}>
          <World />
        </Suspense>
      </ClientOnly>
      <TouchControls />
      <InteractPrompt />
      <Journal />
    </main>
  );
}
