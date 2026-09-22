/**
 * The reviewer side of the "Document your project" milestone.
 *
 * Two blocks, shown only to the relevant person:
 *  - owner: edit and publish the trusted reviewer list (kind 30000,
 *    d = wondersland:verifiers:v1),
 *  - listed reviewers: pending claims from other authors with Confirm /
 *    Withdraw buttons.
 *
 * Read-only npub sessions see everything but cannot sign — buttons stay
 * disabled with an explanation.
 */
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, Loader2, Plus, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { useNostrStore } from "../state/useNostrStore";
import { useMilestonesStore } from "../milestones/useMilestonesStore";
import { parseVerifierInput } from "../milestones/verifiers";
import { isOwner } from "../nostr/owner";
import { getSigner } from "../nostr/signers";

function shortKey(pubkey: string): string {
  return `${pubkey.slice(0, 8)}…${pubkey.slice(-6)}`;
}

function OwnerListEditor() {
  const method = useNostrStore((s) => s.method);
  const verifiers = useMilestonesStore((s) => s.verifiers);
  const publishVerifiers = useMilestonesStore((s) => s.publishVerifiers);
  const listPublishState = useMilestonesStore((s) => s.listPublishState);

  const [draft, setDraft] = useState<string[] | null>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // null = not published yet → edit an empty list, never "everyone allowed".
  const list = draft ?? verifiers ?? [];

  const add = () => {
    try {
      const pubkey = parseVerifierInput(input);
      if (!list.includes(pubkey)) setDraft([...list, pubkey]);
      setInput("");
      setInputError(null);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "Invalid pubkey");
    }
  };

  const remove = (pubkey: string) => {
    setDraft(list.filter((p) => p !== pubkey));
  };

  const publish = async () => {
    const signer = getSigner(method);
    if (!signer) return;
    await publishVerifiers(signer, list);
    setDraft(null);
  };

  const dirty = draft !== null;
  const signer = getSigner(method);

  return (
    <div className="rounded-xl border border-forest-soft/40 bg-forest-deep/50 p-3">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-cream">
        <ShieldCheck className="h-4 w-4 text-leaf" aria-hidden />
        Reviewer list (owner)
      </p>
      <p className="mt-1 text-xs text-cream/60">
        {verifiers === null
          ? "No reviewer list is published yet — confirmations cannot count until you publish one."
          : `${verifiers.length} reviewer${verifiers.length === 1 ? "" : "s"} published on the relays.`}
      </p>

      <ul className="mt-3 space-y-2">
        {list.map((pubkey) => (
          <li
            key={pubkey}
            className="flex items-center gap-2 rounded-lg border border-forest-soft/40 px-3 py-2"
          >
            <span className="font-mono text-xs text-cream/85">{shortKey(pubkey)}</span>
            <button
              type="button"
              onClick={() => remove(pubkey)}
              aria-label={`Remove reviewer ${shortKey(pubkey)}`}
              className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-cream/60 hover:text-amber-200"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="text-xs text-cream/55">No reviewers yet. Add the first one below.</li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="npub1… or hex pubkey"
          className="min-h-11 flex-1 rounded-xl border border-forest-soft/60 bg-forest-deep px-3 font-mono text-xs text-cream placeholder:text-cream/40"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-forest-soft/60 px-3 text-sm text-cream/85"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
      {inputError ? <p className="mt-2 text-xs text-amber-200">{inputError}</p> : null}

      <button
        type="button"
        onClick={() => void publish()}
        disabled={!dirty || listPublishState.kind === "sending" || !signer}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf/90 px-4 text-sm font-semibold text-forest-deep disabled:opacity-60"
      >
        {listPublishState.kind === "sending" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        Publish reviewer list
      </button>
      {!signer ? (
        <p className="mt-2 text-xs text-cream/60">Sign in with a key that can publish first.</p>
      ) : null}
      {listPublishState.kind === "accepted" ? (
        <p className="mt-2 text-xs text-leaf">Accepted by all {listPublishState.total} relays.</p>
      ) : null}
      {listPublishState.kind === "partial" ? (
        <p className="mt-2 text-xs text-amber-200">
          Accepted by {listPublishState.accepted} of {listPublishState.total} relays — sync is
          incomplete.
        </p>
      ) : null}
      {listPublishState.kind === "error" ? (
        <p className="mt-2 text-xs text-amber-200">{listPublishState.message}</p>
      ) : null}
    </div>
  );
}

export function ReviewerPanel() {
  const pubkey = useNostrStore((s) => s.pubkey);
  const method = useNostrStore((s) => s.method);
  const verifiers = useMilestonesStore((s) => s.verifiers);
  const reviewClaims = useMilestonesStore((s) => s.reviewClaims);
  const reviewAttestations = useMilestonesStore((s) => s.reviewAttestations);
  const reviewPhase = useMilestonesStore((s) => s.reviewPhase);
  const loadReview = useMilestonesStore((s) => s.loadReview);
  const attest = useMilestonesStore((s) => s.attest);

  const owner = isOwner(pubkey);
  const isReviewer =
    pubkey !== null && verifiers !== null && verifiers.includes(pubkey.toLowerCase());

  useEffect(() => {
    if (pubkey && isReviewer) void loadReview(pubkey);
  }, [pubkey, isReviewer, loadReview]);

  const statuses = useMemo(
    () => useMilestonesStore.getState().reviewStatuses(),
    [reviewClaims, reviewAttestations, verifiers],
  );
  const waiting = statuses.filter((s) => s.state !== "verified");

  if (!owner && !isReviewer) return null;

  return (
    <section className="rounded-2xl border border-forest-soft/50 bg-forest-deep/60 p-5">
      <header className="flex flex-wrap items-center gap-2">
        <UserCheck className="h-4 w-4 text-leaf" aria-hidden />
        <h3
          className="text-base font-semibold text-cream"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Review milestones
        </h3>
      </header>

      {owner ? (
        <div className="mt-4">
          <OwnerListEditor />
        </div>
      ) : null}

      {isReviewer ? (
        <div className="mt-4">
          <p className="text-xs text-cream/60">
            You are a trusted reviewer. Confirm only milestones whose evidence you have actually
            checked — your confirmation is public and you can withdraw it later.
          </p>

          {reviewPhase === "loading" ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-cream/70">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading claims from the
              relays…
            </p>
          ) : null}

          {reviewPhase === "ready" && waiting.length === 0 ? (
            <p className="mt-3 text-sm text-cream/70">Nothing is waiting for review right now.</p>
          ) : null}

          <ul className="mt-3 space-y-3">
            {statuses.map((status) => {
              const mine = status.voters.includes((pubkey ?? "").toLowerCase());
              const signer = getSigner(method);
              return (
                <li
                  key={`${status.claim.authorPubkey}-${status.claim.projectId}`}
                  className="rounded-xl border border-forest-soft/40 bg-forest-deep/50 p-3"
                >
                  <p className="text-sm font-medium text-cream">{status.claim.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-cream/55">
                    by {shortKey(status.claim.authorPubkey)}
                    {status.claim.plant ? ` · ${status.claim.plant}` : ""}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-cream/85">
                    {status.state === "verified" ? (
                      <>
                        <BadgeCheck className="h-4 w-4 text-leaf" aria-hidden />
                        Confirmed by {status.votes}/{status.required}
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-cream/60" aria-hidden />
                        Waiting · {status.votes}/{status.required}
                      </>
                    )}
                  </p>

                  <ul className="mt-2 grid grid-cols-3 gap-2">
                    {status.claim.proofs.map((proof) => (
                      <li
                        key={proof.eventId}
                        className="overflow-hidden rounded-lg border border-forest-soft/40"
                      >
                        {proof.image ? (
                          <img
                            src={proof.image}
                            alt=""
                            loading="lazy"
                            className="h-20 w-full object-cover"
                          />
                        ) : (
                          <p className="p-2 text-[10px] text-cream/50">{proof.preview ?? "entry"}</p>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!mine ? (
                      <button
                        type="button"
                        disabled={!signer}
                        onClick={() => {
                          if (signer) void attest(signer, status.claim, "verified");
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf/90 px-4 text-sm font-semibold text-forest-deep disabled:opacity-60"
                      >
                        <BadgeCheck className="h-4 w-4" aria-hidden /> Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!signer}
                        onClick={() => {
                          if (signer) void attest(signer, status.claim, "revoked");
                        }}
                        className="min-h-11 rounded-xl border border-forest-soft/60 px-3 text-xs text-cream/85"
                      >
                        Withdraw my confirmation
                      </button>
                    )}
                  </div>
                  {!signer ? (
                    <p className="mt-2 text-xs text-cream/60">
                      Read-only session — sign in with a key that can publish to confirm.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
