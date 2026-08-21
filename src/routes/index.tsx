import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";
import { useWorldStore } from "../state/useWorldStore";
import { useNostrStore } from "../state/useNostrStore";
import { LandingScreen } from "../ui/LandingScreen";
import { HomeDashboard } from "../ui/HomeDashboard";


import { Journal } from "../ui/Journal";
import { IndoorGarden } from "../ui/IndoorGarden";
import { InteractionPrompt } from "../ui/InteractionPrompt";
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

  useEffect(() => setHydrated(true), []);

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


  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <ClientOnly fallback={<Loading />}>
        <Suspense fallback={<Loading />}>
          <World />
        </Suspense>
      </ClientOnly>
      <TouchControls />
      <InteractionPrompt />
      <Journal />
      <IndoorGarden />
    </main>
  );
}
