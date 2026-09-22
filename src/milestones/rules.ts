/**
 * Milestone rules — pure, deterministic TypeScript.
 *
 * Given the same claims, attestations and verifier list, this always returns
 * the same result. XP is computed here from the rules; a number written by a
 * player into an event or into local storage is never read.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  MILESTONE_XP,
  REQUIRED_VOTES,
  claimAddress,
  claimDTag,
  type Attestation,
  type MilestoneClaim,
  type MilestoneStatus,
} from "./types";

/** Stable hash of the exact evidence set a claim points at. */
export function proofHash(eventIds: string[]): string {
  const sorted = [...new Set(eventIds.map((id) => id.trim().toLowerCase()).filter(Boolean))].sort();
  return bytesToHex(sha256(new TextEncoder().encode(sorted.join(",")))).slice(0, 32);
}

/** Newest wins; a tie is broken by the lower event id so every client agrees. */
function newer(a: Attestation, b: Attestation | undefined): boolean {
  if (!b) return true;
  if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt;
  return a.eventId < b.eventId;
}

/**
 * One vote per verifier, only from the authorised list, only for this exact
 * claim version, never from the author. Delivery order does not matter.
 */
export function evaluateClaim(
  claim: MilestoneClaim,
  attestations: Attestation[],
  /** null = no verifier list configured yet. Nothing is auto-allowed. */
  verifiers: readonly string[] | null,
): MilestoneStatus {
  const address = claimAddress(claim.authorPubkey, claimDTag(claim.milestoneId, claim.projectId));
  const allowed = verifiers ? new Set(verifiers.map((v) => v.toLowerCase())) : null;

  const latest = new Map<string, Attestation>();
  for (const attestation of attestations) {
    const verifier = attestation.verifierPubkey.toLowerCase();
    if (verifier === claim.authorPubkey.toLowerCase()) continue; // no self-verification
    if (attestation.claimAddress !== address) continue;
    if (attestation.proofHash !== claim.proofHash) continue; // votes on an older version
    if (allowed && !allowed.has(verifier)) continue;
    if (newer(attestation, latest.get(verifier))) latest.set(verifier, attestation);
  }

  const voters: string[] = [];
  const revokedBy: string[] = [];
  for (const [verifier, attestation] of latest) {
    if (attestation.verdict === "verified") voters.push(verifier);
    else revokedBy.push(verifier);
  }
  voters.sort();
  revokedBy.sort();

  if (!verifiers) {
    return {
      claim,
      state: "unconfigured",
      votes: 0,
      required: REQUIRED_VOTES,
      voters: [],
      revokedBy: [],
      xp: 0,
    };
  }

  const verified = voters.length >= REQUIRED_VOTES;
  return {
    claim,
    state: verified ? "verified" : "pending",
    votes: voters.length,
    required: REQUIRED_VOTES,
    voters,
    revokedBy,
    xp: verified ? MILESTONE_XP : 0,
  };
}

/**
 * Total Observation XP. One author + project + milestone combination can be
 * rewarded only once, however many claim versions exist.
 */
export function observationXp(statuses: MilestoneStatus[]): number {
  const rewarded = new Set<string>();
  let total = 0;
  for (const status of statuses) {
    if (status.state !== "verified") continue;
    const key = `${status.claim.authorPubkey}|${status.claim.projectId}|${status.claim.milestoneId}`;
    if (rewarded.has(key)) continue;
    rewarded.add(key);
    total += status.xp;
  }
  return total;
}
