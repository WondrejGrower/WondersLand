import { create } from "zustand";
import { fetchDiaries, getCachedDiaries } from "../nostr/diaries";
import { getNip07PublicKey, isNip07Available } from "../nostr/signers/nip07";
import { clearLocalSigner, createLocalIdentity, unlockLocalSigner } from "../nostr/signers/local";
import { localSigner, setExpectedNip07Pubkey } from "../nostr/signers";
import { publish } from "../nostr/pool";

import { getEnabledRelayUrls } from "../nostr/relays";
import { KIND_PROFILE } from "../nostr/kinds";
import { fetchProfile } from "../nostr/profile";
import { loadRelays } from "../nostr/relays";
import { setJson } from "../nostr/storage";
import { clearSession, readTrustedSession, writeSession } from "../nostr/session";
import type { AuthMethod, Diary, Profile } from "../nostr/types";
import { useGardenStore } from "./useGardenStore";
import { useHiddenDiaries } from "./useHiddenDiaries";
import { nip19 } from "nostr-tools";

type Session = { pubkey: string; method: AuthMethod };

type NostrState = {
  pubkey: string | null;
  method: AuthMethod | null;
  profile: Profile | null;
  diaries: Diary[];
  status: "idle" | "connecting" | "loading" | "ready" | "error";
  error: string | null;
  nip07Available: boolean;
  /** True while a saved session is being restored, so the UI can avoid a landing-page flash. */
  restoring: boolean;
  /** A key created this session still needs to be shown to its owner for backup. */
  keyBackupPending: boolean;
  dismissKeyBackup: () => void;
  restore: () => Promise<void>;
  /** Generate a brand-new Nostr identity. Returns the nsec ONCE for backup. */
  createIdentity: (displayName?: string) => Promise<string>;
  signInWithExtension: () => Promise<void>;
  signInWithNpub: (npub: string) => Promise<void>;
  signInWithNsec: (nsec: string) => Promise<void>;
  /**
   * Upgrade the CURRENT read-only session to a writable one without switching
   * identity. Throws on a pubkey mismatch instead of silently re-logging in.
   */
  unlockWithNsec: (nsec: string) => Promise<void>;
  unlockWithExtension: () => Promise<void>;
  upsertDiary: (diary: Diary) => void;
  /** Drop a diary from local state and the local cache after a deletion. */
  removeDiary: (id: string) => Promise<void>;

  refresh: () => Promise<void>;
  signOut: () => Promise<void>;

};



/**
 * Public text sign-in (audit F1). Only bech32 npub/nprofile is accepted.
 * Raw hex is refused here even though it is a valid public-key format: a
 * secret key pasted into this field is also 64 hex characters, and accepting
 * it would persist it and send it to relays as an `authors` filter.
 * Error messages never echo the input.
 */
export function decodeNpub(input: string): string {
  const trimmed = input.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    throw new Error(
      "Paste your npub (it starts with npub1). Raw hex keys are not accepted here — a secret key looks identical.",
    );
  }
  if (!/^(npub1|nprofile1)[02-9ac-hj-np-z]{20,}$/i.test(trimmed)) {
    throw new Error("Enter a valid npub");
  }
  let decoded: ReturnType<typeof nip19.decode>;
  try {
    decoded = nip19.decode(trimmed.toLowerCase());
  } catch {
    throw new Error("Enter a valid npub");
  }
  if (decoded.type === "npub" && typeof decoded.data === "string") return decoded.data;
  if (decoded.type === "nprofile" && typeof decoded.data === "object") {
    const pubkey = (decoded.data as { pubkey?: unknown }).pubkey;
    if (typeof pubkey === "string" && /^[0-9a-f]{64}$/i.test(pubkey)) return pubkey.toLowerCase();
  }
  throw new Error("Enter a valid npub");
}


export const useNostrStore = create<NostrState>((set, get) => {
  /**
   * Audit F4: every sign-in/unlock/sign-out bumps this. A slow relay round-trip
   * from an old session can therefore never restore an identity, diaries or
   * publishing access after the user signed out or switched accounts.
   */
  let authSeq = 0;
  const stale = (seq: number) => seq !== authSeq;

  async function load(pubkey: string, seq: number) {
    set({ status: "loading", error: null });
    const method = get().method ?? "npub";
    const cached = await getCachedDiaries(pubkey);
    if (stale(seq)) return;
    // Render the cached garden immediately; the relays catch up in step two.
    set({ diaries: cached });
    await useGardenStore.getState().load(pubkey, method, cached);
    if (stale(seq)) return;
    try {
      const [profile, diaries] = await Promise.all([fetchProfile(pubkey), fetchDiaries(pubkey)]);
      if (stale(seq)) return;
      set({ profile, diaries, status: "ready" });
      useGardenStore.getState().setDiaries(diaries);
    } catch (err) {
      if (stale(seq)) return;
      set({
        status: cached.length > 0 ? "ready" : "error",
        error: err instanceof Error ? err.message : "Could not reach the relays",
      });
    }
  }


  async function start(session: Session) {
    const seq = ++authSeq;
    await loadRelays();
    if (stale(seq)) return;
    // An nsec session is memory-only: persist it as a read-only npub session so
    // a refresh can never resurrect write access without the key.
    await writeSession({
      pubkey: session.pubkey,
      method: session.method === "nsec" ? "npub" : session.method,
    });
    if (stale(seq)) return;
    set({ pubkey: session.pubkey, method: session.method });
    await load(session.pubkey, seq);
  }


  return {
    pubkey: null,
    method: null,
    profile: null,
    diaries: [],
    status: "idle",
    error: null,
    nip07Available: false,
    restoring: true,
    keyBackupPending: false,

    dismissKeyBackup: () => set({ keyBackupPending: false }),

    restore: async () => {
      set({ nip07Available: isNip07Available() });
      // Never downgrade a live session (a fresh nsec identity persists as a
      // read-only npub, so re-running restore would drop write access).
      if (get().pubkey) {
        set({ restoring: false });
        return;
      }
      try {
        // Legacy/unversioned sessions are invalidated (and their identity
        // caches purged) before any relay request touches their value.
        const session = await readTrustedSession();
        if (!session) return;
        // The identity is known here; the dashboard can paint while the relays
        // are still being read.
        set({ restoring: false });
        await start(session);
      } finally {
        set({ restoring: false });
      }
    },

    createIdentity: async (displayName) => {
      set({ status: "connecting", error: null });
      try {
        const { pubkey, nsec } = createLocalIdentity();
        set({ keyBackupPending: true });
        await start({ pubkey, method: "nsec" });
        const name = displayName?.trim();
        if (name) {
          try {
            const event = await localSigner.signEvent({
              kind: KIND_PROFILE,
              created_at: Math.floor(Date.now() / 1000),
              tags: [],
              content: JSON.stringify({ name, display_name: name }),
            });
            await publish(getEnabledRelayUrls(), event);
            set({ profile: { pubkey, name, displayName: name } });
          } catch {
            // The identity exists either way; the profile can be published later.
          }
        }
        return nsec;
      } catch (err) {
        clearLocalSigner();
        set({ status: "error", error: err instanceof Error ? err.message : "Could not create an identity" });
        throw err;
      }
    },

    signInWithExtension: async () => {
      set({ status: "connecting", error: null });
      try {
        const pubkey = await getNip07PublicKey();
        await start({ pubkey, method: "nip07" });
      } catch (err) {
        set({ status: "error", error: err instanceof Error ? err.message : "Sign-in failed" });
      }
    },

    signInWithNpub: async (npub) => {
      set({ status: "connecting", error: null });
      try {
        const pubkey = decodeNpub(npub);
        await start({ pubkey, method: "npub" });
      } catch (err) {
        set({ status: "error", error: err instanceof Error ? err.message : "Invalid npub" });
      }
    },

    signInWithNsec: async (nsec) => {
      set({ status: "connecting", error: null });
      try {
        const pubkey = unlockLocalSigner(nsec);
        await start({ pubkey, method: "nsec" });
      } catch (err) {
        clearLocalSigner();
        set({ status: "error", error: err instanceof Error ? err.message : "Invalid nsec" });
      }
    },

    // --- Unlock publishing on the identity that is already signed in ---------
    // No new session, no re-fetch, no persistence change: the persisted session
    // stays a read-only npub, the key stays in memory in signers/local.ts.
    unlockWithNsec: async (nsec) => {
      const current = get().pubkey;
      if (!current) throw new Error("Sign in first");
      let derived: string;
      try {
        derived = unlockLocalSigner(nsec);
      } catch (err) {
        clearLocalSigner();
        throw err instanceof Error ? err : new Error("Invalid nsec");
      }
      if (derived !== current) {
        clearLocalSigner();
        throw new Error(
          "That key belongs to a different Nostr account. Sign out and sign in with it instead.",
        );
      }
      set({ method: "nsec", error: null });
    },

    unlockWithExtension: async () => {
      const current = get().pubkey;
      if (!current) throw new Error("Sign in first");
      const derived = await getNip07PublicKey();
      if (derived !== current) {
        // Point the signer back at the signed-in account so a mismatched
        // extension cannot sign for this session.
        setExpectedNip07Pubkey(current);
        throw new Error(
          "Your extension holds a different Nostr account. Sign out and sign in with it instead.",
        );
      }

      set({ method: "nip07", error: null });
    },


    upsertDiary: (diary) => {
      const diaries = get().diaries.filter((d) => d.id !== diary.id);
      const next = [diary, ...diaries].sort((a, b) => b.updatedAt - a.updatedAt);
      set({ diaries: next });
      useGardenStore.getState().setDiaries(next);
      // Keep the offline cache in step so a refresh cannot show the old title.
      const { pubkey } = get();
      if (pubkey) void setJson(`diaries:${pubkey}`, next);
    },


    removeDiary: async (id) => {
      const next = get().diaries.filter((d) => d.id !== id);
      set({ diaries: next });
      useGardenStore.getState().setDiaries(next);
      const { pubkey } = get();
      // Keep the offline cache consistent so a refresh cannot resurrect it.
      if (pubkey) await setJson(`diaries:${pubkey}`, next);
    },


    refresh: async () => {
      const { pubkey } = get();
      if (pubkey) await load(pubkey, authSeq);
    },

    signOut: async () => {
      // Invalidate in-flight work FIRST, so a completion that lands after this
      // point cannot put the identity (or publishing access) back.
      authSeq += 1;
      clearLocalSigner();
      setExpectedNip07Pubkey(null);
      await removeKey(SESSION_KEY);
      useGardenStore.getState().reset();
      useHiddenDiaries.getState().reset();
      set({ pubkey: null, method: null, profile: null, diaries: [], status: "idle", error: null, keyBackupPending: false });

    },
  };
});
