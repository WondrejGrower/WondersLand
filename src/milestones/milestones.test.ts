import { describe, expect, it } from "vitest";
import { evaluateClaim, observationXp, proofHash } from "./rules";
import { claimAddress, claimDTag, MILESTONE_DOCUMENT_PROJECT, type Attestation, type MilestoneClaim } from "./types";

const AUTHOR = "a".repeat(64);
const V1 = "1".repeat(64);
const V2 = "2".repeat(64);
const V3 = "3".repeat(64);
const V4 = "4".repeat(64);

const PROOFS = ["e1", "e2", "e3"];

function claim(ids = PROOFS): MilestoneClaim {
  return {
    milestoneId: MILESTONE_DOCUMENT_PROJECT,
    projectId: "project-1",
    authorPubkey: AUTHOR,
    claimEventId: "claim-1",
    createdAt: 100,
    title: "My grow",
    proofs: ids.map((eventId, i) => ({ eventId, createdAt: 10 + i })),
    proofHash: proofHash(ids),
  };
}

function vote(
  verifier: string,
  c: MilestoneClaim,
  verdict: "verified" | "revoked" = "verified",
  createdAt = 200,
  eventId = `${verifier}-${createdAt}-${verdict}`,
): Attestation {
  return {
    eventId,
    verifierPubkey: verifier,
    createdAt,
    claimAddress: claimAddress(c.authorPubkey, claimDTag(c.milestoneId, c.projectId)),
    claimEventId: c.claimEventId,
    proofHash: c.proofHash,
    verdict,
  };
}

describe("milestone rules", () => {
  it("is unconfigured while no verifier list exists", () => {
    const c = claim();
    const status = evaluateClaim(c, [vote(V1, c), vote(V2, c), vote(V3, c)], null);
    expect(status.state).toBe("unconfigured");
    expect(status.xp).toBe(0);
  });

  it("needs three distinct authorised verifiers", () => {
    const c = claim();
    const verifiers = [V1, V2, V3];
    expect(evaluateClaim(c, [vote(V1, c)], verifiers).votes).toBe(1);
    expect(evaluateClaim(c, [vote(V1, c), vote(V2, c)], verifiers).state).toBe("pending");
    const done = evaluateClaim(c, [vote(V1, c), vote(V2, c), vote(V3, c)], verifiers);
    expect(done.state).toBe("verified");
    expect(done.xp).toBe(100);
  });

  it("counts duplicate votes from one account only once", () => {
    const c = claim();
    const votes = [vote(V1, c, "verified", 200), vote(V1, c, "verified", 260), vote(V2, c)];
    expect(evaluateClaim(c, votes, [V1, V2, V3]).votes).toBe(2);
  });

  it("ignores self-verification and unauthorised signatures", () => {
    const c = claim();
    const votes = [vote(AUTHOR, c), vote(V4, c), vote(V1, c)];
    const status = evaluateClaim(c, votes, [V1, V2, V3]);
    expect(status.votes).toBe(1);
    expect(status.voters).toEqual([V1]);
  });

  it("honours a later revocation whatever the delivery order", () => {
    const c = claim();
    const verifiers = [V1, V2, V3];
    const votes = [
      vote(V3, c, "revoked", 300),
      vote(V1, c, "verified", 200),
      vote(V3, c, "verified", 200),
      vote(V2, c, "verified", 210),
    ];
    const status = evaluateClaim(c, votes, verifiers);
    expect(status.state).toBe("pending");
    expect(status.votes).toBe(2);
    expect(status.revokedBy).toEqual([V3]);
    expect([...votes].reverse().length).toBe(4);
    expect(evaluateClaim(c, [...votes].reverse(), verifiers).votes).toBe(2);
  });

  it("drops votes cast on a different evidence set", () => {
    const old = claim();
    const updated = claim(["e1", "e2", "e9"]);
    const votes = [vote(V1, old), vote(V2, old), vote(V3, old)];
    expect(evaluateClaim(updated, votes, [V1, V2, V3]).votes).toBe(0);
    expect(evaluateClaim(updated, votes, [V1, V2, V3]).state).toBe("pending");
  });

  it("loses verification when a verifier leaves the list", () => {
    const c = claim();
    const votes = [vote(V1, c), vote(V2, c), vote(V3, c)];
    expect(evaluateClaim(c, votes, [V1, V2, V3]).state).toBe("verified");
    expect(evaluateClaim(c, votes, [V1, V2]).state).toBe("pending");
  });

  it("rewards one author + project + milestone only once", () => {
    const c = claim();
    const other = { ...claim(["x1", "x2", "x3"]), projectId: "project-2" };
    other.proofHash = proofHash(["x1", "x2", "x3"]);
    const verifiers = [V1, V2, V3];
    const a = evaluateClaim(c, [vote(V1, c), vote(V2, c), vote(V3, c)], verifiers);
    const b = evaluateClaim(other, [vote(V1, other), vote(V2, other), vote(V3, other)], verifiers);
    expect(observationXp([a, a, a])).toBe(100);
    expect(observationXp([a, b])).toBe(200);
  });

  it("hashes the evidence set independently of order", () => {
    expect(proofHash(["b", "a"])).toBe(proofHash(["a", "b", "a"]));
    expect(proofHash(["a", "b"])).not.toBe(proofHash(["a", "c"]));
  });
});
