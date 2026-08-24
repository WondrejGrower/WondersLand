import { create } from "zustand";
import { fetchDiaries, getCachedDiaries } from "../nostr/diaries";
import { getNip07PublicKey, isNip07Available } from "../nostr/signers/nip07";
import { clearLocalSigner, createLocalIdentity, unlockLocalSigner } from "../nostr/signers/local";
import { localSigner } from "../nostr/signers";
import { publish } from "../nostr/pool";
import { getEnabledRelayUrls } from "../nostr/relays";
import { KIND_PROFILE } from "../nostr/kinds";
import { fetchProfile } from "../nostr/profile";
import { loadRelays } from "../nostr/relays";
import { getJson, removeKey, setJson } from "../nostr/storage";
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
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;

};

const SESSION_KEY = "session";

function decodeNpub(input: string): string {
  const trimmed = input.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  const decoded = nip19.decode(trimmed);
  if (decoded.type === "npub" && typeof decoded.data === "string") return decoded.data;
  if (decoded.type === "nprofile" && typeof decoded.data === "object") {
    return (decoded.data as { pubkey: string }).pubkey;
  }
  throw new Error("Enter a valid npub");
}

export const useNostrStore = create<NostrState>((set, get) => {
  async function load(pubkey: string) {
    set({ status: "loading", error: null });
    const method = get().method ?? "npub";
    const cached = await getCachedDiaries(pubkey);
    // Render the cached garden immediately; the relays catch up in step two.
    set({ diaries: cached });
    await useGardenStore.getState().load(pubkey, method, cached);
    try {
      const [profile, diaries] = await Promise.all([fetchProfile(pubkey), fetchDiaries(pubkey)]);
      set({ profile, diaries, status: "ready" });
      useGardenStore.getState().setDiaries(diaries);
    } catch (err) {
      set({
        status: cached.length > 0 ? "ready" : "error",
        error: err instanceof Error ? err.message : "Could not reach the relays",
      });
    }
  }


  async function start(session: Session) {
    await loadRelays();
    // An nsec session is memory-only: persist it as a read-only npub session so
    // a refresh can never resurrect write access without the key.
    await setJson(SESSION_KEY, {
      pubkey: session.pubkey,
      method: session.method === "nsec" ? "npub" : session.method,
    });
    set({ pubkey: session.pubkey, method: session.method });
    await load(session.pubkey);
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
        const session = await getJson<Session>(SESSION_KEY);
        if (!session?.pubkey) return;
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
    },

    refresh: async () => {
      const { pubkey } = get();
      if (pubkey) await load(pubkey);
    },

    signOut: async () => {
      clearLocalSigner();
      await removeKey(SESSION_KEY);
      useGardenStore.getState().reset();
      useHiddenDiaries.getState().reset();
      set({ pubkey: null, method: null, profile: null, diaries: [], status: "idle", error: null, keyBackupPending: false });
    },
  };
});
