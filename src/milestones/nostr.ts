/**
 * Nostr transport for community-verified milestones.
 *
 * Public by design: a claim is only published after the user consciously
 * submits it. The private Garden Board stays encrypted and is never touched
 * here.
 *
 *   claim       kind 30078, d = wondersland:milestone:<milestone>:<project>
 *   attestation kind 1985  (NIP-32 label), L = wondersland.milestone
 */
import { KIND_DIARY, KIND_LABEL, MILESTONE_LABEL_NAMESPACE, MILESTONE_TAG } from "../nostr/kinds";
import { withClientTag } from "../nostr/clientTag";
import { publish, query, type PublishResult } from "../nostr/pool";
import { getEnabledRelayUrls } from "../nostr/relays";
import type { Signer } from "../nostr/signers";
import type { NostrEvent } from "../nostr/types";
import { proofHash } from "./rules";
import {
  MILESTONE_SCHEMA_VERSION,
  claimAddress,
  claimDTag,
  type Attestation,
  type MilestoneClaim,
  type ProofRef,
  type Verdict,
} from "./types";

export type ClaimInput = {
  milestoneId: string;
  projectId: string;
  title: string;
  plant?: string | undefined;
  proofs: ProofRef[];
};

function tag(event: NostrEvent, key: string): string | undefined {
  return event.tags.find((t) => t[0] === key)?.[1]?.trim() || undefined;
}

export function buildClaim(input: ClaimInput, authorPubkey: string, createdAt: number): MilestoneClaim {
  return {
    milestoneId: input.milestoneId,
    projectId: input.projectId,
    authorPubkey,
    claimEventId: "",
    createdAt,
    title: input.title,
    plant: input.plant,
    proofs: input.proofs,
    proofHash: proofHash(input.proofs.map((p) => p.eventId)),
  };
}

export async function publishClaim(
  signer: Signer,
  input: ClaimInput,
): Promise<{ claim: MilestoneClaim; results: PublishResult[] }> {
  const pubkey = await signer.getPublicKey();
  const createdAt = Math.floor(Date.now() / 1000);
  const claim = buildClaim(input, pubkey, createdAt);
  const d = claimDTag(claim.milestoneId, claim.projectId);

  const template = withClientTag({
    kind: KIND_DIARY,
    created_at: createdAt,
    tags: [
      ["d", d],
      ["t", MILESTONE_TAG],
      ["milestone", claim.milestoneId],
      ["project", claim.projectId],
      ["proof-hash", claim.proofHash],
      ...claim.proofs.map((p) => ["e", p.eventId]),
    ],
    content: JSON.stringify({
      v: MILESTONE_SCHEMA_VERSION,
      milestoneId: claim.milestoneId,
      projectId: claim.projectId,
      title: claim.title,
      plant: claim.plant,
      proofHash: claim.proofHash,
      proofs: claim.proofs,
    }),
  });

  const event = await signer.signEvent(template);
  const results = await publish(getEnabledRelayUrls(), event);
  if (results.length > 0 && !results.some((r) => r.ok)) {
    throw new Error("No relay accepted the milestone — nothing was published");
  }
  return { claim: { ...claim, claimEventId: event.id }, results };
}

/** A verifier's signed confirmation, or the signed withdrawal of one. */
export async function publishAttestation(
  signer: Signer,
  claim: MilestoneClaim,
  verdict: Verdict,
): Promise<PublishResult[]> {
  const address = claimAddress(claim.authorPubkey, claimDTag(claim.milestoneId, claim.projectId));
  const template = withClientTag({
    kind: KIND_LABEL,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["L", MILESTONE_LABEL_NAMESPACE],
      ["l", verdict, MILESTONE_LABEL_NAMESPACE],
      ["a", address],
      ["e", claim.claimEventId],
      ["p", claim.authorPubkey],
      ["proof-hash", claim.proofHash],
      ...claim.proofs.map((p) => ["e", p.eventId, "", "proof"]),
    ],
    content: "",
  });
  const event = await signer.signEvent(template);
  return publish(getEnabledRelayUrls(), event);
}

function parseClaim(event: NostrEvent): MilestoneClaim | null {
  const d = tag(event, "d") ?? "";
  if (!d.startsWith("wondersland:milestone:")) return null;
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(event.content || "{}") as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const milestoneId = tag(event, "milestone") ?? String(parsed["milestoneId"] ?? "");
  const projectId = tag(event, "project") ?? String(parsed["projectId"] ?? "");
  if (!milestoneId || !projectId) return null;

  const rawProofs = Array.isArray(parsed["proofs"]) ? (parsed["proofs"] as ProofRef[]) : [];
  const proofs: ProofRef[] = rawProofs
    .filter((p) => p && typeof p.eventId === "string" && p.eventId.length > 0)
    .map((p) => ({
      eventId: p.eventId,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : event.created_at,
      image: typeof p.image === "string" ? p.image : undefined,
      preview: typeof p.preview === "string" ? p.preview : undefined,
    }));

  return {
    milestoneId,
    projectId,
    authorPubkey: event.pubkey,
    claimEventId: event.id,
    createdAt: event.created_at,
    title: typeof parsed["title"] === "string" ? (parsed["title"] as string) : projectId,
    plant: typeof parsed["plant"] === "string" ? (parsed["plant"] as string) : undefined,
    proofs,
    // Recomputed locally: the hash written into the event is never trusted.
    proofHash: proofHash(proofs.map((p) => p.eventId)),
  };
}

/** Newest claim per (milestone, project) for one author. */
export async function fetchClaims(authorPubkey: string): Promise<MilestoneClaim[]> {
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [KIND_DIARY], authors: [authorPubkey], "#t": [MILESTONE_TAG], limit: 100 },
    6000,
  );
  return dedupeClaims(events, authorPubkey);
}

/**
 * Claims waiting for review, across every author, newest per
 * (author, milestone, project). The viewer's own claims are excluded —
 * self-verification is never offered.
 */
export async function fetchPendingClaims(excludeAuthor: string): Promise<MilestoneClaim[]> {
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [KIND_DIARY], "#t": [MILESTONE_TAG], limit: 300 },
    6000,
  );
  return dedupeClaims(events, undefined, excludeAuthor);
}

function dedupeClaims(
  events: NostrEvent[],
  onlyAuthor?: string,
  excludeAuthor?: string,
): MilestoneClaim[] {
  const best = new Map<string, { event: NostrEvent; claim: MilestoneClaim }>();
  for (const event of events) {
    if (onlyAuthor && event.pubkey !== onlyAuthor) continue;
    if (excludeAuthor && event.pubkey === excludeAuthor) continue;
    const claim = parseClaim(event);
    if (!claim) continue;
    const key = `${claim.authorPubkey}|${claim.milestoneId}|${claim.projectId}`;
    const current = best.get(key);
    if (!current || event.created_at > current.event.created_at) best.set(key, { event, claim });
  }
  return [...best.values()].map((entry) => entry.claim);
}

function parseAttestation(event: NostrEvent): Attestation | null {
  const namespace = event.tags.find((t) => t[0] === "L")?.[1];
  if (namespace !== MILESTONE_LABEL_NAMESPACE) return null;
  const label = event.tags.find((t) => t[0] === "l" && t[2] === MILESTONE_LABEL_NAMESPACE)?.[1];
  if (label !== "verified" && label !== "revoked") return null;
  const address = tag(event, "a");
  const hash = tag(event, "proof-hash");
  if (!address || !hash) return null;
  return {
    eventId: event.id,
    verifierPubkey: event.pubkey,
    createdAt: event.created_at,
    claimAddress: address,
    claimEventId: tag(event, "e") ?? "",
    proofHash: hash,
    verdict: label,
  };
}

/** One merged request for every claim the dashboard shows. */
export async function fetchAttestations(claims: MilestoneClaim[]): Promise<Attestation[]> {
  if (claims.length === 0) return [];
  const addresses = claims.map((c) =>
    claimAddress(c.authorPubkey, claimDTag(c.milestoneId, c.projectId)),
  );
  const events = await query(
    getEnabledRelayUrls(),
    { kinds: [KIND_LABEL], "#a": addresses, limit: 300 },
    6000,
  );
  const out: Attestation[] = [];
  for (const event of events) {
    const attestation = parseAttestation(event);
    if (attestation) out.push(attestation);
  }
  return out;
}
