// Read/write layer for NIP-25 reactions and NIP-10 replies.
//
// Nothing here changes the diary format: these are ordinary kind 7 and kind 1
// events referencing a note by `e`/`p`. Every event we sign gets the NIP-89
// `client` tag so other clients show "from WondersLand".
import { clientOf } from "./clientTag";
import { withClientTag } from "./clientTag";
import { KIND_NOTE, KIND_REACTION } from "./kinds";
import { query, publish, type PublishResult } from "./pool";
import { getEnabledRelayUrls } from "./relays";
import type { EventTemplate, Signer } from "./signers";
import type { NostrEvent } from "./types";

const now = () => Math.floor(Date.now() / 1000);

export type Reply = {
  id: string;
  pubkey: string;
  createdAt: number;
  text: string;
  client?: string | undefined;
};

export type NoteInteractions = {
  likes: number;
  likedByMe: boolean;
  replies: Reply[];
};

export type InteractionMap = Record<string, NoteInteractions>;

function empty(): NoteInteractions {
  return { likes: 0, likedByMe: false, replies: [] };
}

function referencedIds(event: NostrEvent, known: Set<string>): string[] {
  return event.tags
    .filter((t) => t[0] === "e" && t[1] && known.has(t[1]))
    .map((t) => t[1] as string);
}

/** Likes and replies for a batch of notes. Read-only; safe for npub sessions. */
export async function fetchInteractions(
  noteIds: string[],
  viewerPubkey?: string | null,
): Promise<InteractionMap> {
  const ids = [...new Set(noteIds)].slice(0, 60);
  const map: InteractionMap = {};
  if (ids.length === 0) return map;
  for (const id of ids) map[id] = empty();

  const known = new Set(ids);
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [KIND_REACTION, KIND_NOTE], "#e": ids, limit: 500 },
    6000,
  );

  const seenLikes = new Set<string>();
  for (const event of events) {
    for (const target of referencedIds(event, known)) {
      const entry = map[target];
      if (!entry) continue;
      if (event.kind === KIND_REACTION) {
        // "-" is a downvote in NIP-25; anything else counts as a like.
        if ((event.content ?? "").trim() === "-") continue;
        const key = `${target}:${event.pubkey}`;
        if (seenLikes.has(key)) continue;
        seenLikes.add(key);
        entry.likes += 1;
        if (viewerPubkey && event.pubkey === viewerPubkey) entry.likedByMe = true;
      } else if (event.kind === KIND_NOTE) {
        const text = (event.content ?? "").trim();
        if (!text) continue;
        if (entry.replies.some((r) => r.id === event.id)) continue;
        entry.replies.push({
          id: event.id,
          pubkey: event.pubkey,
          createdAt: event.created_at,
          text,
          client: clientOf(event.tags),
        });
      }
    }
  }

  for (const entry of Object.values(map)) {
    entry.replies.sort((a, b) => a.createdAt - b.createdAt);
  }
  return map;
}

async function signAndPublish(
  signer: Signer,
  template: EventTemplate,
): Promise<{ event: NostrEvent; results: PublishResult[] }> {
  const event = await signer.signEvent(withClientTag(template));
  const results = await publish(getEnabledRelayUrls(), event);
  if (results.length > 0 && !results.some((r) => r.ok)) {
    throw new Error("No relay accepted it — try again in a moment");
  }
  return { event, results };
}

export type ReactionTarget = { id: string; pubkey: string; kind?: number };

/** NIP-25 like (`+`) on a note. */
export async function publishReaction(
  signer: Signer,
  target: ReactionTarget,
): Promise<PublishResult[]> {
  const { results } = await signAndPublish(signer, {
    kind: KIND_REACTION,
    created_at: now(),
    tags: [
      ["e", target.id],
      ["p", target.pubkey],
      ["k", String(target.kind ?? KIND_NOTE)],
    ],
    content: "+",
  });
  return results;
}

/** NIP-10 reply: a kind 1 note marked as a reply to the target note. */
export async function publishReply(
  signer: Signer,
  target: ReactionTarget,
  text: string,
): Promise<{ reply: Reply; results: PublishResult[] }> {
  const body = text.trim();
  if (!body) throw new Error("Write something first");
  const { event, results } = await signAndPublish(signer, {
    kind: KIND_NOTE,
    created_at: now(),
    tags: [
      ["e", target.id, "", "root"],
      ["p", target.pubkey],
    ],
    content: body,
  });
  return {
    reply: {
      id: event.id,
      pubkey: event.pubkey,
      createdAt: event.created_at,
      text: body,
      client: clientOf(event.tags),
    },
    results,
  };
}
