import { create } from "zustand";
import { fetchDiaries, getCachedDiaries } from "../nostr/diaries";
import { getNip07PublicKey, isNip07Available } from "../nostr/signers/nip07";
import { clearLocalSigner, unlockLocalSigner } from "../nostr/signers/local";
import { fetchProfile } from "../nostr/profile";
import { loadRelays } from "../nostr/relays";
import { getJson, removeKey, setJson } from "../nostr/storage";
import type { AuthMethod, Diary, Profile } from "../nostr/types";
import { useGardenStore } from "./useGardenStore";
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
  restore: () => Promise<void>;
  signInWithExtension: () => Promise<void>;
  signInWithNpub: (npub: string) => Promise<void>;
  signInWithNsec: (nsec: string) => Promise<void>;
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

    restore: async () => {
      set({ nip07Available: isNip07Available() });
      const session = await getJson<Session>(SESSION_KEY);
      if (!session?.pubkey) return;
      await start(session);
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
      set({ pubkey: null, method: null, profile: null, diaries: [], status: "idle", error: null });
    },
  };
});
