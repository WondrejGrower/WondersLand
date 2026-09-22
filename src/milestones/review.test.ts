import { describe, expect, it } from "vitest";
import { nip19, generateSecretKey, getPublicKey } from "nostr-tools";
import { dedupeClaims } from "./nostr";
import { parseVerifierInput } from "./verifiers";
import { MILESTONE_DOCUMENT_PROJECT, MILESTONE_SCHEMA_VERSION, claimDTag } from "./types";
import { MILESTONE_TAG, KIND_DIARY } from "../nostr/kinds";
import type { NostrEvent } from "../nostr/types";

const AUTHOR = "a".repeat(64);
const OTHER = "b".repeat(64);

function claimEvent(author: string, projectId: string, createdAt: number, proofs = ["e1", "e2", "e3"]): NostrEvent {
  return {
    id: `id-${author.slice(0, 4)}-${projectId}-${createdAt}`,
    pubkey: author,
    created_at: createdAt,
    kind: KIND_DIARY,
    sig: "sig",
    tags: [
      ["d", claimDTag(MILESTONE_DOCUMENT_PROJECT, projectId)],
      ["t", MILESTONE_TAG],
      ["milestone", MILESTONE_DOCUMENT_PROJECT],
      ["project", projectId],
      ...proofs.map((p) => ["e", p]),
    ],
    content: JSON.stringify({
      v: MILESTONE_SCHEMA_VERSION,
      milestoneId: MILESTONE_DOCUMENT_PROJECT,
      projectId,
      title: `Project ${projectId}`,
      proofs: proofs.map((p) => ({ eventId: p, createdAt })),
    }),
  };
}

describe("dedupeClaims (reviewer pending list)", () => {
  it("excludes the reviewer's own claims", () => {
    const events = [claimEvent(AUTHOR, "p1", 100), claimEvent(OTHER, "p2", 100)];
    const out = dedupeClaims(events, undefined, AUTHOR);
    expect(out).toHaveLength(1);
    expect(out[0]!.authorPubkey).toBe(OTHER);
  });

  it("keeps only the newest claim per author + project", () => {
    const events = [claimEvent(AUTHOR, "p1", 100), claimEvent(AUTHOR, "p1", 200)];
    const out = dedupeClaims(events, undefined, OTHER);
    expect(out).toHaveLength(1);
    expect(out[0]!.createdAt).toBe(200);
  });

  it("keeps different authors and projects side by side", () => {
    const events = [
      claimEvent(AUTHOR, "p1", 100),
      claimEvent(AUTHOR, "p2", 100),
      claimEvent(OTHER, "p1", 100),
    ];
    expect(dedupeClaims(events)).toHaveLength(3);
  });

  it("restricts to one author when asked (author's own claims)", () => {
    const events = [claimEvent(AUTHOR, "p1", 100), claimEvent(OTHER, "p2", 100)];
    const out = dedupeClaims(events, AUTHOR);
    expect(out).toHaveLength(1);
    expect(out[0]!.authorPubkey).toBe(AUTHOR);
  });
});

describe("parseVerifierInput", () => {
  it("accepts a 64-char hex pubkey, case-insensitively", () => {
    const hex = "Ab".repeat(32);
    expect(parseVerifierInput(hex)).toBe(hex.toLowerCase());
  });

  it("decodes an npub to its hex pubkey", () => {
    const secret = generateSecretKey();
    const hex = getPublicKey(secret);
    const npub = nip19.npubEncode(hex);
    expect(parseVerifierInput(npub)).toBe(hex);
  });

  it("rejects garbage, nsec and short strings", () => {
    expect(() => parseVerifierInput("hello")).toThrow();
    expect(() => parseVerifierInput("nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq")).toThrow();
    expect(() => parseVerifierInput("ab".repeat(16))).toThrow();
    expect(() => parseVerifierInput("")).toThrow();
  });
});
