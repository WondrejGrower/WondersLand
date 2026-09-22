/**
 * Milestone state for the dashboard.
 *
 * Everything shown here is recomputed from Nostr events, so a second device
 * restores the same state. Nothing is cached as a score.
 */
import { create } from "zustand";
import type { Signer } from "../nostr/signers";
import { fetchAttestations, fetchClaims, publishAttestation, publishClaim, type ClaimInput } from "./nostr";
import { evaluateClaim, observationXp } from "./rules";
import type { Attestation, MilestoneClaim, MilestoneStatus, Verdict } from "./types";
import { fetchVerifiers } from "./verifiers";

type Phase = "idle" | "loading" | "ready" | "error";

/** Publishing is deliberately three-valued: sending ≠ accepted ≠ fully synced. */
export type PublishState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "accepted"; accepted: number; total: number }
  | { kind: "partial"; accepted: number; total: number }
  | { kind: "error"; message: string };

type State = {
  phase: Phase;
  error: string | null;
  claims: MilestoneClaim[];
  attestations: Attestation[];
  /** null = no verifier list published yet. */
  verifiers: string[] | null;
  publishState: PublishState;
  load: (pubkey: string) => Promise<void>;
  submit: (signer: Signer, input: ClaimInput) => Promise<void>;
  attest: (signer: Signer, claim: MilestoneClaim, verdict: Verdict) => Promise<void>;
  statuses: () => MilestoneStatus[];
  xp: () => number;
};

export const useMilestonesStore = create<State>((set, get) => ({
  phase: "idle",
  error: null,
  claims: [],
  attestations: [],
  verifiers: null,
  publishState: { kind: "idle" },

  async load(pubkey) {
    set({ phase: "loading", error: null });
    try {
      const [claims, verifiers] = await Promise.all([fetchClaims(pubkey), fetchVerifiers()]);
      const attestations = await fetchAttestations(claims);
      set({ claims, attestations, verifiers, phase: "ready" });
    } catch (error) {
      set({
        phase: "error",
        error: error instanceof Error ? error.message : "Could not read milestones",
      });
    }
  },

  async submit(signer, input) {
    set({ publishState: { kind: "sending" } });
    try {
      const { claim, results } = await publishClaim(signer, input);
      const accepted = results.filter((r) => r.ok).length;
      set((state) => ({
        claims: [
          ...state.claims.filter(
            (c) => !(c.milestoneId === claim.milestoneId && c.projectId === claim.projectId),
          ),
          claim,
        ],
        publishState:
          accepted === results.length
            ? { kind: "accepted", accepted, total: results.length }
            : { kind: "partial", accepted, total: results.length },
      }));
      const attestations = await fetchAttestations(get().claims);
      set({ attestations });
    } catch (error) {
      set({
        publishState: {
          kind: "error",
          message: error instanceof Error ? error.message : "Publishing failed",
        },
      });
    }
  },

  async attest(signer, claim, verdict) {
    await publishAttestation(signer, claim, verdict);
    set({ attestations: await fetchAttestations(get().claims) });
  },

  statuses() {
    const { claims, attestations, verifiers } = get();
    return claims.map((claim) => evaluateClaim(claim, attestations, verifiers));
  },

  xp() {
    return observationXp(get().statuses());
  },
}));
