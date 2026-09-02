// Display helpers for provenance chips. Pure string work, no network calls.

/** `wss://relay.damus.io/` -> `relay.damus.io` */
export function relayHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^wss?:\/\//, "").replace(/\/$/, "");
  }
}

export function relayHosts(urls: readonly string[] | undefined): string[] {
  const hosts = (urls ?? []).map(relayHost).filter(Boolean);
  return [...new Set(hosts)];
}

/** Host serving a media URL, e.g. a Blossom server. */
export function mediaHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function mediaHosts(urls: readonly string[] | undefined): string[] {
  const hosts = (urls ?? []).map(mediaHost).filter(Boolean);
  return [...new Set(hosts)];
}
