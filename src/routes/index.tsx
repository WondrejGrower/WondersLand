import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNostrStore } from "../state/useNostrStore";
import { AppShell } from "../ui/AppShell";

// 2D grow-diary client only. The 3D world source stays in src/world but is
// deliberately not imported anywhere on this route.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WondersLand — Grow diaries on Nostr" },
      {
        name: "description",
        content:
          "Follow growers' diaries, photos and dated updates, and keep your own grow journal on Nostr. No email account needed.",
      },
      { property: "og:title", content: "WondersLand — Grow diaries on Nostr" },
      {
        property: "og:description",
        content: "A calm grow-journal community: discover diaries, follow progress and document your own grows on Nostr.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const restore = useNostrStore((s) => s.restore);
  useEffect(() => {
    void restore();
  }, [restore]);
  return <AppShell />;
}
