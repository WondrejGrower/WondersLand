import { useEffect, useState } from "react";
import { forgetFreshNsec, peekFreshNsec } from "../nostr/signers/local";
import { useNostrStore } from "../state/useNostrStore";
import { profileLabel } from "../nostr/profile";
import { SaveGarden } from "./SaveGarden";

/**
 * Read-only Nostr identity: browser extension (NIP-07) or a pasted npub.
 * WondersLand never asks for, stores or handles a private key.
 */
export function NostrSignIn() {
  const [open, setOpen] = useState(false);
  const [npub, setNpub] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const [nsec, setNsec] = useState("");
  const pubkey = useNostrStore((s) => s.pubkey);
  const profile = useNostrStore((s) => s.profile);
  const status = useNostrStore((s) => s.status);
  const error = useNostrStore((s) => s.error);
  const nip07Available = useNostrStore((s) => s.nip07Available);
  const diaryCount = useNostrStore((s) => s.diaries.length);
  const restore = useNostrStore((s) => s.restore);
  const signInWithExtension = useNostrStore((s) => s.signInWithExtension);
  const signInWithNpub = useNostrStore((s) => s.signInWithNpub);
  const signInWithNsec = useNostrStore((s) => s.signInWithNsec);
  const createIdentity = useNostrStore((s) => s.createIdentity);
  const keyBackupPending = useNostrStore((s) => s.keyBackupPending);
  const dismissKeyBackup = useNostrStore((s) => s.dismissKeyBackup);
  const signOut = useNostrStore((s) => s.signOut);

  useEffect(() => {
    void restore();
  }, [restore]);

  const newKey = keyBackupPending ? peekFreshNsec() : null;

  useEffect(() => {
    if (pubkey && !keyBackupPending) {
      setOpen(false);
      setNsec("");
    }
  }, [pubkey, keyBackupPending]);

  const busy = status === "connecting" || status === "loading";

  if (pubkey) {
    return (
      <div className="relative flex items-center gap-2">
      {newKey ? <KeyBackup nsec={newKey} copied={copied} setCopied={setCopied} onDone={() => {
        forgetFreshNsec();
        dismissKeyBackup();
      }} /> : null}
      <SaveGarden />
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex items-center gap-2 rounded-full bg-leaf px-3 py-2 text-xs font-semibold text-forest-deep shadow-lg shadow-leaf/20 sm:px-4 sm:py-2.5 sm:text-sm"
        title="Sign out"
      >
        {profile?.picture ? (
          <img src={profile.picture} alt="" className="h-5 w-5 rounded-full object-cover" />
        ) : (
          <span aria-hidden>✦</span>
        )}
        <span className="max-w-[9rem] truncate">{profileLabel(profile, pubkey)}</span>
        <span className="hidden text-forest-deep/70 sm:inline">
          {busy ? "syncing…" : `${diaryCount} diaries`}
        </span>
      </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full bg-leaf px-3 py-2 text-xs font-semibold text-forest-deep shadow-lg shadow-leaf/20 sm:px-4 sm:py-2.5 sm:text-sm"
      >
        ✦ <span className="hidden min-[420px]:inline">Sign in with Nostr</span>
        <span className="min-[420px]:hidden">Sign in</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-forest-deep/95 p-4 text-left shadow-2xl backdrop-blur">
          <p className="text-xs text-white/70">
            Connect your Nostr identity to grow your existing diaries in WondersLand. Read-only — no
            keys are stored.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signInWithExtension()}
            className="mt-3 w-full rounded-xl bg-leaf px-3 py-2 text-sm font-semibold text-forest-deep disabled:opacity-60"
          >
            {nip07Available ? "Use browser extension" : "Check for extension"}
          </button>
          <div className="mt-3">
            <label htmlFor="npub-input" className="text-[0.7rem] uppercase tracking-wide text-white/50">
              or paste an npub
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="npub-input"
                value={npub}
                onChange={(e) => setNpub(e.target.value)}
                placeholder="npub1…"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1.5 text-sm text-white placeholder:text-white/30"
              />
              <button
                type="button"
                disabled={busy || npub.trim().length === 0}
                onClick={() => void signInWithNpub(npub)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                Go
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            {creating ? (
              <div>
                <p className="text-[0.7rem] leading-snug text-white/60">
                  WondersLand generates a Nostr key in your browser. It is yours alone — we cannot
                  see it and cannot recover it.
                </p>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-2 py-1.5 text-sm text-white placeholder:text-white/30"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        try {
                          await createIdentity(newName);
                          setNewName("");
                          setCreating(false);
                        } catch {
                          // error surfaces through the store
                        }
                      })();
                    }}
                    className="flex-1 rounded-lg bg-leaf px-3 py-1.5 text-sm font-semibold text-forest-deep disabled:opacity-60"
                  >
                    Create my identity
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-xl border border-leaf/50 px-3 py-2 text-sm font-semibold text-leaf"
              >
                New to Nostr? Create an identity
              </button>
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              aria-expanded={advanced}
              className="text-[0.7rem] uppercase tracking-wide text-white/50"
            >
              Advanced: use nsec {advanced ? "▴" : "▾"}
            </button>
            {advanced ? (
              <div className="mt-2">
                <p className="text-[0.7rem] leading-snug text-white/50">
                  Alpha owner login. Your key is kept in memory for this tab only — never stored,
                  never sent anywhere. Refreshing signs you out.
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    id="nsec-input"
                    type="password"
                    autoComplete="off"
                    value={nsec}
                    onChange={(e) => setNsec(e.target.value)}
                    placeholder="nsec1…"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1.5 text-sm text-white placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    disabled={busy || nsec.trim().length === 0}
                    onClick={() => {
                      void signInWithNsec(nsec);
                      setNsec("");
                    }}
                    className="rounded-lg border border-leaf/50 px-3 py-1.5 text-sm text-leaf disabled:opacity-50"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shown exactly once, right after an identity is generated. The nsec lives in
 * component state for this moment only — never persisted, never logged.
 */
function KeyBackup({
  nsec,
  copied,
  setCopied,
  onDone,
}: {
  nsec: string;
  copied: boolean;
  setCopied: (v: boolean) => void;
  onDone: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Save your secret key"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
    >

      <div className="w-full max-w-md rounded-2xl border border-leaf/30 bg-forest-deep/95 p-6 text-left shadow-2xl">
      <p className="text-lg font-semibold text-leaf">Save your secret key</p>

      <p className="mt-1 text-xs leading-snug text-white/70">
        This is the only copy of your key. Anyone who has it controls your account, and nobody —
        including WondersLand — can recover it for you. Store it in a password manager.
      </p>
      <code className="mt-3 block break-all rounded-lg border border-white/15 bg-black/30 p-2 text-[0.7rem] text-white/90">
        {nsec}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(nsec).then(() => setCopied(true));
        }}
        className="mt-2 w-full rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white"
      >
        {copied ? "Copied" : "Copy key"}
      </button>
      <label className="mt-3 flex items-start gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        I saved my key somewhere safe.
      </label>
      <p className="mt-2 text-[0.7rem] leading-snug text-white/50">
        Refreshing this tab signs you out. For everyday use, install a Nostr extension such as Alby
        or nos2x and add this key there.
      </p>
      <button
        type="button"
        disabled={!confirmed}
        onClick={onDone}
        className="mt-4 w-full rounded-xl bg-leaf px-3 py-3 text-sm font-semibold text-forest-deep disabled:opacity-50"
      >
        Continue to my garden
      </button>
      </div>
    </div>
  );
}

