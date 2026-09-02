// Small, muted provenance chips: which relay served an event, and which host
// (e.g. a Blossom server) serves its images. Display only — no network calls.
import { Radio, Image as ImageIcon } from "lucide-react";

import { mediaHosts, relayHosts } from "../nostr/hosts";

function Chips({
  icon: Icon,
  label,
  hosts,
}: {
  icon: typeof Radio;
  label: string;
  hosts: string[];
}) {
  if (hosts.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[0.65rem] text-cream/55">
      <span className="inline-flex items-center gap-1 uppercase tracking-wide">
        <Icon className="h-3 w-3" aria-hidden /> {label}
      </span>
      {hosts.map((host) => (
        <span
          key={host}
          className="max-w-full truncate rounded-full border border-forest-soft/50 bg-forest-deep/40 px-2 py-0.5 text-cream/70"
        >
          {host}
        </span>
      ))}
    </div>
  );
}

/** Relays that served an event on the last fetch. */
export function RelayChips({
  relays,
  label = "Seen on",
  fallback,
}: {
  relays: string[] | undefined;
  label?: string;
  fallback?: string;
}) {
  const hosts = relayHosts(relays);
  if (hosts.length === 0) {
    return fallback ? <p className="text-[0.65rem] text-cream/45">{fallback}</p> : null;
  }
  return <Chips icon={Radio} label={label} hosts={hosts} />;
}

/** Hosts serving the media of an event (Blossom or any other server). */
export function MediaChips({ urls, label = "Media" }: { urls: string[] | undefined; label?: string }) {
  return <Chips icon={ImageIcon} label={label} hosts={mediaHosts(urls)} />;
}
