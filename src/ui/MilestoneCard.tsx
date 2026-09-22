import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { useNostrStore } from "../state/useNostrStore";
import { useMilestonesStore } from "../milestones/useMilestonesStore";
import { MILESTONE_DOCUMENT_PROJECT, REQUIRED_PROOFS, type MilestoneStatus } from "../milestones/types";
import { getSigner } from "../nostr/signers";
import { firstImage } from "../nostr/media";
import type { Diary, DiaryItemRef } from "../nostr/types";

/** Entries that carry a photo — the only ones that can back a claim. */
function photoEntries(diary: Diary): DiaryItemRef[] {
  return [...diary.items]
    .filter((item) => Boolean(firstImage(item)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function StatusLine({ status }: { status: MilestoneStatus }) {
  if (status.state === "unconfigured") {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-cream/80">
        <ShieldAlert className="h-4 w-4 text-amber-300" aria-hidden />
        Verification is not configured yet — no reviewer list has been published.
      </p>
    );
  }
  if (status.state === "verified") {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-leaf">
        <BadgeCheck className="h-4 w-4" aria-hidden />
        Confirmed by {status.votes} reviewers · +100 Observation XP · “Documented” marker unlocked
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-2 text-sm text-cream/85">
      <Clock className="h-4 w-4 text-cream/60" aria-hidden />
      Waiting for confirmation · {status.votes}/{status.required}
      {status.revokedBy.length > 0 ? ` · ${status.revokedBy.length} withdrawn` : ""}
    </p>
  );
}

export function MilestoneCard({ diaries }: { diaries: Diary[] }) {
  const pubkey = useNostrStore((s) => s.pubkey);
  const method = useNostrStore((s) => s.method);
  const load = useMilestonesStore((s) => s.load);
  const submit = useMilestonesStore((s) => s.submit);
  const attest = useMilestonesStore((s) => s.attest);
  const phase = useMilestonesStore((s) => s.phase);
  const publishState = useMilestonesStore((s) => s.publishState);
  const claims = useMilestonesStore((s) => s.claims);
  const attestations = useMilestonesStore((s) => s.attestations);
  const verifiers = useMilestonesStore((s) => s.verifiers);

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (pubkey) void load(pubkey);
  }, [pubkey, load]);

  const statuses = useMemo(
    () => useMilestonesStore.getState().statuses(),
    // Recomputed only when the underlying data changes, never per frame.
    [claims, attestations, verifiers],
  );
  const xp = useMemo(() => useMilestonesStore.getState().xp(), [statuses]);

  const eligible = useMemo(
    () => diaries.filter((d) => photoEntries(d).length >= REQUIRED_PROOFS),
    [diaries],
  );
  const claimed = new Set(
    claims.filter((c) => c.milestoneId === MILESTONE_DOCUMENT_PROJECT).map((c) => c.projectId),
  );
  const open = eligible.filter((d) => !claimed.has(d.id));
  const chosen = open.find((d) => d.id === selected) ?? open[0] ?? null;
  const proofs = chosen ? photoEntries(chosen).slice(0, REQUIRED_PROOFS) : [];

  const send = async () => {
    const signer = getSigner(method);
    if (!signer || !chosen) return;
    await submit(signer, {
      milestoneId: MILESTONE_DOCUMENT_PROJECT,
      projectId: chosen.id,
      title: chosen.title,
      plant: chosen.plant,
      proofs: proofs.map((p) => ({
        eventId: p.eventId,
        createdAt: p.createdAt,
        image: firstImage(p),
        preview: p.contentPreview?.slice(0, 160),
      })),
    });
  };

  return (
    <section className="rounded-2xl border border-forest-soft/50 bg-forest-deep/60 p-5">
      <header className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-leaf" aria-hidden />
        <h3 className="text-base font-semibold text-cream" style={{ fontFamily: "var(--font-display)" }}>
          Document your project
        </h3>
        <span className="ml-auto rounded-full border border-leaf/30 bg-leaf/10 px-3 py-1 text-xs text-cream/85">
          Community verified · {xp} Observation XP
        </span>
      </header>

      <p className="mt-2 text-sm text-cream/75">
        Personal Garden Growth keeps counting your own documentation. This milestone is different:
        three independent reviewers confirm it before any XP is granted, and it can go back to
        waiting if evidence or a confirmation is withdrawn.
      </p>

      {phase === "loading" ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-cream/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading milestones from the relays…
        </p>
      ) : null}

      {verifiers === null && phase === "ready" ? (
        <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-cream/85">
          The reviewer list is not published yet, so confirmations cannot be counted. You can still
          submit a milestone; it will be counted once the list exists.
        </p>
      ) : null}

      {statuses.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {statuses.map((status) => {
            const mine = status.voters.includes((pubkey ?? "").toLowerCase());
            return (
              <li
                key={`${status.claim.projectId}-${status.claim.claimEventId}`}
                className="rounded-xl border border-forest-soft/40 bg-forest-deep/50 p-3"
              >
                <p className="text-sm font-medium text-cream">{status.claim.title}</p>
                <div className="mt-1">
                  <StatusLine status={status} />
                </div>
                <p className="mt-1 text-xs text-cream/55">
                  {status.claim.proofs.length} public entries as evidence
                </p>
                {mine ? (
                  <button
                    type="button"
                    onClick={() => {
                      const signer = getSigner(method);
                      if (signer) void attest(signer, status.claim, "revoked");
                    }}
                    className="mt-2 min-h-11 rounded-xl border border-forest-soft/60 px-3 text-xs text-cream/85"
                  >
                    Withdraw my confirmation
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {chosen ? (
        <div className="mt-5 rounded-xl border border-forest-soft/40 bg-forest-deep/50 p-3">
          <label className="block text-xs uppercase tracking-wide text-cream/60" htmlFor="ms-diary">
            Diary to submit
          </label>
          <select
            id="ms-diary"
            value={chosen.id}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-forest-soft/60 bg-forest-deep px-3 text-sm text-cream"
          >
            {open.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>

          <p className="mt-3 text-xs text-cream/60">
            These three entries and their photos are already public on Nostr and will be linked as
            evidence:
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {proofs.map((proof) => {
              const image = firstImage(proof);
              return (
                <li key={proof.eventId} className="overflow-hidden rounded-lg border border-forest-soft/40">
                  {image ? (
                    <img src={image} alt="" loading="lazy" className="h-20 w-full object-cover" />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => void send()}
            disabled={publishState.kind === "sending" || !getSigner(method)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf/90 px-4 text-sm font-semibold text-forest-deep disabled:opacity-60"
          >
            {publishState.kind === "sending" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Submit for verification
          </button>
          {!getSigner(method) ? (
            <p className="mt-2 text-xs text-cream/60">Sign in with a key that can publish first.</p>
          ) : null}
          {publishState.kind === "accepted" ? (
            <p className="mt-2 text-xs text-leaf">
              Accepted by all {publishState.total} relays.
            </p>
          ) : null}
          {publishState.kind === "partial" ? (
            <p className="mt-2 text-xs text-amber-200">
              Accepted by {publishState.accepted} of {publishState.total} relays — sync is
              incomplete.
            </p>
          ) : null}
          {publishState.kind === "error" ? (
            <p className="mt-2 text-xs text-amber-200">{publishState.message}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-xs text-cream/60">
          Add a diary with at least {REQUIRED_PROOFS} entries that include a photo to submit this
          milestone.
        </p>
      )}
    </section>
  );
}
