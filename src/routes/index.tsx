import { createFileRoute } from "@tanstack/react-router";
import { CreatorHub } from "../features/creator-hub/CreatorHub";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NoTillMan — Rooted in curiosity" },
      {
        name: "description",
        content:
          "From the soil into the light. Explore Wondrej’s world of living soil, growing and creative ideas.",
      },
      { property: "og:title", content: "NoTillMan — Rooted in curiosity" },
      {
        property: "og:description",
        content: "One plant. A journey from dark roots to new possibilities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatorHub,
});
