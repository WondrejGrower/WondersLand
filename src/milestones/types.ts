/**
 * Community-verified milestones — data model.
 *
 * Plain data only: no React, no Three, no network. Everything here is derived
 * from public Nostr events; nothing is trusted because a client wrote it.
 */

export const MILESTONE_SCHEMA_VERSION = 1;

/** The single milestone shipped in this first pass. */
export const MILESTONE_DOCUMENT_PROJECT = "document-project";

/** How many distinct authorised verifiers must confirm a claim. */
export const REQUIRED_VOTES = 3;

/** How many documented entries with a photo a claim must reference. */
export const REQUIRED_PROOFS = 3;

/** Observation XP granted by an accepted "Document your project" milestone. */
export const MILESTONE_XP = 100;

export type ProofRef = {
  /** kind:1 note id that carries the documented entry. */
  eventId: string;
  createdAt: number;
  image?: string | undefined;
  preview?: string | undefined;
};

export type MilestoneClaim = {
  milestoneId: string;
  /** Stable project identity — the diary id the claim documents. */
  projectId: string;
  authorPubkey: string;
  /** Event id of the claim event this state was parsed from. */
  claimEventId: string;
  createdAt: number;
  title: string;
  plant?: string | undefined;
  proofs: ProofRef[];
  /** sha256 over the sorted proof ids — binds votes to this exact version. */
  proofHash: string;
};

export type Verdict = "verified" | "revoked";

export type Attestation = {
  eventId: string;
  verifierPubkey: string;
  createdAt: number;
  /** Addressable coordinate of the claim, `30078:<author>:<d>`. */
  claimAddress: string;
  claimEventId: string;
  proofHash: string;
  verdict: Verdict;
};

export type MilestoneState =
  /** No verifier list is configured, so nothing can be counted yet. */
  | "unconfigured"
  | "pending"
  | "verified";

export type MilestoneStatus = {
  claim: MilestoneClaim;
  state: MilestoneState;
  votes: number;
  required: number;
  /** Pubkeys whose confirmation currently counts. */
  voters: string[];
  /** Authorised verifiers who explicitly revoked their confirmation. */
  revokedBy: string[];
  /** Deterministic reward. Never read from an event or from local storage. */
  xp: number;
};

/** `30078:<pubkey>:<d>` */
export function claimAddress(authorPubkey: string, dTag: string): string {
  return `30078:${authorPubkey}:${dTag}`;
}

export function claimDTag(milestoneId: string, projectId: string): string {
  return `wondersland:milestone:${milestoneId}:${projectId}`;
}
