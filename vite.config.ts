// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * The dev-only source tagger annotates every JSX element with `data-tsd-source`.
 * React Three Fiber tries to apply that as a Three.js property and throws,
 * which kills the WebGL context. Strip it inside the 3D scene only (dev only).
 */
function stripSourceTagsIn3D(): Plugin {
  return {
    name: "wondersland-strip-tsd-source-3d",
    enforce: "post",
    apply: "serve",
    transform(code, id) {
      if (!id.includes("/src/world/") || !code.includes("data-tsd-source")) return null;
      return { code: code.replace(/"data-tsd-source":\s*"[^"]*",?/g, ""), map: null };
    },
  };
}

export default defineConfig({
  vite: { plugins: [stripSourceTagsIn3D()] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

