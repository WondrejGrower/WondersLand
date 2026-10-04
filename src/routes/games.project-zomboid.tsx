import { createFileRoute } from "@tanstack/react-router";
import { ProjectZomboidPage } from "../features/pz/ProjectZomboidPage";

// Unlisted private beta: not linked anywhere, noindex/nofollow.
export const Route = createFileRoute("/games/project-zomboid")({
  head: () => ({
    meta: [
      { title: "Project Zomboid Survival Board — WondersLand Games" },
      { name: "description", content: "Private co-op survival checklist and party death counter for Project Zomboid Build 42." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Project Zomboid Survival Board" },
      { property: "og:description", content: "Co-op survival checklist with a Nostr party death counter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: ProjectZomboidPage,
});
