// Smallest possible "make this session writable again" modal.
//
// It never creates a new session and never switches identity: it only upgrades
// the signer for the pubkey that is already signed in. The nsec is handed
// straight to the in-memory signer in nostr/signers/local.ts and is never
// written to IndexedDB, localStorage, Zustand or any log line.
import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { useNostrStore } from "../state/useNostrStore";

export function PublishUnlock({
  onUnlocked,
  onClose,
}: {
  onUnlocked: () => void;
  onClose: () => void;
}) {
  const nip07Available = useNostrStore((s) => s.nip07Available);
  const unlockWithNsec = useNostrStore((s) => s.unlockWithNsec);
  const unlockWithExtension = useNostrStore((s) => s.unlockWithExtension);
  const [nsec, setNsec] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNsec("");
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock publishing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-forest-deep/80 p-3 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="max-h-[90dvh] w-full min-w-0 max-w-md overflow-y-auto rounded-2xl border border-forest-soft/60 bg-forest p-4 text-cream shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h2
            className="flex items-center gap-2 text-base font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <KeyRound className="h-4 w-4 text-leaf" aria-hidden /> Unlock publishing
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close unlock publishing"
            className="grid h-9 w-9 place-items-center rounded-full text-cream/70 hover:text-cream"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-cream/75">
          This session can read your garden but not sign events. Unlock it for this tab only — your
          key stays in memory, is never stored, and is gone when you refresh.
        </p>

        {nip07Available ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(unlockWithExtension)}
            className="mt-4 min-h-11 w-full rounded-xl bg-leaf px-4 py-2.5 text-sm font-semibold text-forest-deep disabled:opacity-60"
          >
            {busy ? "Unlocking…" : "Use browser extension"}
          </button>
        ) : null}

        <div className="mt-4">
          <label htmlFor="unlock-nsec" className="text-[0.7rem] uppercase tracking-wide text-cream/55">
            {nip07Available ? "or paste your nsec" : "paste your nsec"}
          </label>
          <input
            id="unlock-nsec"
            type="password"
            autoComplete="off"
            inputMode="text"
            value={nsec}
            onChange={(e) => setNsec(e.target.value)}
            placeholder="nsec1…"
            className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-forest-soft/60 bg-forest-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream/35 outline-none focus:border-leaf/70"
          />
        </div>

        {error ? <p className="mt-3 text-xs text-amber-300">{error}</p> : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl px-4 py-2.5 text-sm text-cream/70"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || nsec.trim().length === 0}
            onClick={() => void run(() => unlockWithNsec(nsec))}
            className="min-h-11 rounded-xl border border-leaf/50 px-5 py-2.5 text-sm font-semibold text-leaf disabled:opacity-50"
          >
            {busy ? "Unlocking…" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
