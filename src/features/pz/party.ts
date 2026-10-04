/**
 * Party profiles (kind 30078) and public death notes (kind 1) over the
 * existing WondersLand relay pool. Death counts are always rebuilt from relay
 * events; nothing authoritative is stored locally.
 */
import { verifyEvent } from "nostr-tools";
import { publish, query } from "../../nostr/pool";
import { getEnabledRelayUrls, loadRelays } from "../../nostr/relays";
import type { NostrEvent } from "../../nostr/types";
import { signGameEvent, type GameProfile } from "./identity";

export const PLAYER_TAG = "wondersland-pz-player";
export const DEATH_TAG = "wondersland-pz-death";
const CLIENT = "WondersLand Games";

export const normalizeParty = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
export const cleanNick = (s: string) => s.replace(/[\r\n\t]/g, " ").trim().slice(0, 32);
export const cleanRole = (s: string) => s.replace(/[\r\n\t]/g, " ").trim().slice(0, 24);
export const roomTag = (party: string) => `wondersland:pz:${party}`;
const playerD = (party: string) => `wondersland:pz:${party}:player`;

const tagValue = (e: NostrEvent, name: string) => e.tags.find((t) => t[0] === name)?.[1];
const hasTag = (e: NostrEvent, name: string, value: string) => e.tags.some((t) => t[0] === name && t[1] === value);

function valid(e: NostrEvent): boolean {
  try {
    return verifyEvent(e);
  } catch {
    return false;
  }
}

async function send(event: NostrEvent) {
  await loadRelays();
  const results = await publish(getEnabledRelayUrls(), event);
  if (!results.some((r) => r.ok)) throw new Error("No relay accepted the post. Try again in a moment.");
}

export async function publishPlayerProfile(p: GameProfile): Promise<void> {
  const event = signGameEvent({
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["d", playerD(p.party)],
      ["t", PLAYER_TAG],
      ["t", "project-zomboid"],
      ["nick", p.nick],
      ["role", p.role],
      ["client", CLIENT],
    ],
    content: JSON.stringify({ schema: "wondersland-pz-player", v: 1, nick: p.nick, role: p.role }),
  });
  await send(event);
}

const DEATH_LINES = [
  "{n} has died. Again. Knox County remains undefeated.",
  "{n} became locally sourced zombie food.",
  "{n} tested whether zombies are friendly. Research result: no.",
  "{n} has successfully converted one survivor into a cautionary tale.",
  "{n} found out that 'it's probably clear' is not a strategy.",
  "{n} has left the living team chat.",
  "{n} tried speedrunning the afterlife.",
  "{n} discovered a new respawn mechanic the hard way.",
  "{n} lost another argument with Knox County.",
  "{n} is now contributing to the local zombie economy.",
  "{n} opened one door too many.",
  "{n} trusted a window. The window did not trust back.",
];

export async function publishDeath(p: GameProfile): Promise<NostrEvent> {
  const line = (DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)] ?? DEATH_LINES[0]!).replace("{n}", p.nick);
  const event = signGameEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["t", DEATH_TAG],
      ["t", "project-zomboid"],
      ["h", roomTag(p.party)],
      ["nick", p.nick],
      ["client", CLIENT],
    ],
    content: `☠ ${line} #ProjectZomboid`,
  });
  await send(event);
  return event;
}

export type PartyPlayer = { pubkey: string; nick: string; role: string; at: number };
export type Death = { id: string; pubkey: string; line: string; at: number };

export function deathFromEvent(e: NostrEvent, party: string): Death | null {
  if (e.kind !== 1 || !hasTag(e, "t", DEATH_TAG) || !hasTag(e, "h", roomTag(party))) return null;
  return { id: e.id, pubkey: e.pubkey, line: e.content.replace(/\s*#ProjectZomboid\s*$/, "").slice(0, 200), at: e.created_at };
}

export async function fetchParty(party: string): Promise<{ players: PartyPlayer[]; deaths: Death[] }> {
  await loadRelays();
  const urls = getEnabledRelayUrls();
  const [profiles, deathEvents] = await Promise.all([
    query(urls, { kinds: [30078], "#d": [playerD(party)], limit: 200 }, 6000),
    query(urls, { kinds: [1], "#h": [roomTag(party)], "#t": [DEATH_TAG], limit: 1000 }, 6000),
  ]);

  const players = new Map<string, PartyPlayer>();
  for (const e of profiles) {
    if (tagValue(e, "d") !== playerD(party) || !hasTag(e, "t", PLAYER_TAG)) continue;
    const prev = players.get(e.pubkey);
    if (prev && prev.at >= e.created_at) continue;
    if (!valid(e)) continue;
    players.set(e.pubkey, {
      pubkey: e.pubkey,
      nick: cleanNick(tagValue(e, "nick") ?? "") || "Survivor",
      role: cleanRole(tagValue(e, "role") ?? ""),
      at: e.created_at,
    });
  }

  const deaths = new Map<string, Death>();
  for (const e of deathEvents) {
    if (deaths.has(e.id)) continue;
    const d = deathFromEvent(e, party);
    if (d && valid(e)) deaths.set(e.id, d);
  }
  return { players: [...players.values()], deaths: [...deaths.values()] };
}
