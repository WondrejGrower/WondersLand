// NIP-89 client attribution. Other clients render this as "from Damus" /
// "from Primal"; every event WondersLand signs carries "from WondersLand".
//
// The bare two-element form is what every reader understands. We deliberately
// do not add an addressable `31990:<pubkey>:...` coordinate yet: we do not
// publish a handler-information event, so the coordinate would not resolve.
import type { EventTemplate } from "./signers";

export const CLIENT_NAME = "WondersLand";

/** Add the `client` tag unless the template already carries one. */
export function withClientTag(template: EventTemplate): EventTemplate {
  if (template.tags.some((tag) => tag[0] === "client")) return template;
  return { ...template, tags: [...template.tags, ["client", CLIENT_NAME]] };
}

/** Which client published an event, when it says so. Display only. */
export function clientOf(tags: string[][]): string | undefined {
  const tag = tags.find((t) => t[0] === "client");
  const name = tag?.[1]?.trim();
  if (!name) return undefined;
  // Some clients put the addressable coordinate in the second slot.
  if (name.includes(":")) return name.split(":").pop()?.trim() || undefined;
  return name.slice(0, 32);
}
