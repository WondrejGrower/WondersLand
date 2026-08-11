import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const V = lazy(() => import("../world/AvatarCheck"));
export const Route = createFileRoute("/avatar-check")({
  component: () => (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <V />
      </Suspense>
    </ClientOnly>
  ),
});
