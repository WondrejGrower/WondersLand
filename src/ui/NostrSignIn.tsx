import { useEffect, useState } from "react";
import { useNostrStore } from "../state/useNostrStore";
import { profileLabel } from "../nostr/profile";

/**
 * Read-only Nostr identity: browser extension (NIP-07) or a pasted npub.
 * WondersLand never asks for, stores or handles a private key.
 */
export function NostrSignIn() {
  const [open, setOpen] = useState(false);
  const [npub, setNpub] = useState("");
  const pubkey = useNostrStore((s) => s.pubkey);
  const profile = useNostrStore((s) => s.profile);
  const status = useNostrStore((s) => s.status);
  const error = useNostrStore((s) => s.error);
  const nip07Available = useNostrStore((s) => s.nip07Available);
  const diaryCount = useNostrStore((s) => s.diaries.length);
  const restore = useNostrStore((s) => s.restore);
  const signInWithExtension = useNostrStore((s) => s.signInWithExtension);
  const signInWithNpub = useNostrStore((s) => s.signInWithNpub);
  const signOut = useNostrStore((s) => s.signOut);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    if (pubkey) setOpen(false);
  }, [pubkey]);

  const busy = status === "connecting" || status === "loading";

  if (pubkey) {
    return (
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
          {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
