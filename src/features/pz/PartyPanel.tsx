import { useCallback, useEffect, useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ROLES } from "./data";
import { copyGameKeyBackup, forgetGameIdentity, loadGameIdentity, saveGameProfile, type GameProfile } from "./identity";
import {
  cleanNick,
  cleanRole,
  deathFromEvent,
  fetchParty,
  normalizeParty,
  publishDeath,
  publishPlayerProfile,
  type Death,
  type PartyPlayer,
} from "./party";

const shortNpub = (pk: string) => {
  const n = nip19.npubEncode(pk);
  return `${n.slice(0, 10)}…${n.slice(-4)}`;
};

export function PartyPanel({ onTotal }: { onTotal: (n: number) => void }) {
  const [me, setMe] = useState<GameProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState("");
  const [role, setRole] = useState("");
  const [party, setParty] = useState("");
  const [players, setPlayers] = useState<PartyPlayer[]>([]);
  const [deaths, setDeaths] = useState<Record<string, Death>>({});
  const [busy, setBusy] = useState<"" | "join" | "death" | "sync">("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const p = loadGameIdentity();
    if (p) {
      setMe(p);
      setNick(p.nick);
      setRole(p.role);
      setParty(p.party);
    } else setEditing(true);
  }, []);

  const refresh = useCallback(async (code: string) => {
    if (!code) return;
    setBusy((b) => b || "sync");
    try {
      const r = await fetchParty(code);
      setPlayers(r.players);
      // Union by event id: relays can lag behind a death we just published.
      setDeaths((prev) => {
        const next: Record<string, Death> = {};
        for (const d of Object.values(prev)) next[d.id] = d;
        for (const d of r.deaths) next[d.id] = d;
        return next;
      });
      setError(null);
    } catch {
      setError("Could not reach the relays. Retrying shortly.");
    } finally {
      setBusy((b) => (b === "sync" ? "" : b));
    }
  }, []);

  useEffect(() => {
    if (!me?.party) return;
    setDeaths({});
    void refresh(me.party);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(me.party);
    }, 30000);
    return () => window.clearInterval(id);
  }, [me?.party, refresh]);

  const rows = useMemo(() => {
    const map = new Map(players.map((p) => [p.pubkey, p]));
    if (me && !map.has(me.pubkey)) map.set(me.pubkey, { pubkey: me.pubkey, nick: me.nick, role: me.role, at: 0 });
    const all = Object.values(deaths);
    return [...map.values()]
      .map((p) => {
        const mine = all.filter((d) => d.pubkey === p.pubkey).sort((a, b) => b.at - a.at);
        return { ...p, count: mine.length, last: mine[0]?.line };
      })
      .sort((a, b) => (a.pubkey === me?.pubkey ? -1 : b.pubkey === me?.pubkey ? 1 : a.nick.localeCompare(b.nick)));
  }, [players, deaths, me]);

  const total = useMemo(() => {
    const members = new Set(rows.map((r) => r.pubkey));
    return Object.values(deaths).filter((d) => members.has(d.pubkey)).length;
  }, [rows, deaths]);
  useEffect(() => onTotal(total), [total, onTotal]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const n = cleanNick(nick);
    const code = normalizeParty(party);
    if (!n) return setError("Pick a nickname.");
    if (code.length < 3) return setError("Party code needs at least 3 letters or numbers.");
    setBusy("join");
    setError(null);
    try {
      const p = saveGameProfile({ nick: n, role: cleanRole(role), party: code });
      setMe(p);
      setParty(code);
      setEditing(false);
      await publishPlayerProfile(p);
      setNotice(null);
      void refresh(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the party.");
    } finally {
      setBusy("");
    }
  }

  async function die() {
    if (!me) return;
    setConfirm(false);
    setBusy("death");
    setError(null);
    try {
      const event = await publishDeath(me);
      const d = deathFromEvent(event, me.party);
      if (d) setDeaths((prev) => ({ ...prev, [d.id]: d }));
      void refresh(me.party);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the death.");
    } finally {
      setBusy("");
    }
  }

  async function backup() {
    try {
      await copyGameKeyBackup();
      setNotice("Game key copied. Paste it somewhere safe. Anyone with it can post as this survivor.");
    } catch {
      setError("Clipboard is blocked in this browser.");
    }
  }

  const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <section aria-labelledby="party-title" className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="party-title" className="text-base font-semibold">Party</h2>
        {me?.party && !editing && (
          <span className="pz-mono text-xs text-muted-foreground">
            code {me.party} · ☠ {total} total
          </span>
        )}
      </div>

      {editing || !me ? (
        <form onSubmit={join} className="mt-4 grid gap-3">
          <p className="text-sm text-muted-foreground">Make your survivor profile. Use the same party code as your friends.</p>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Nickname
            <input className={field} value={nick} onChange={(e) => setNick(e.target.value)} maxLength={32} placeholder="Ondrej" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Role (optional)
            <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">No role</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Party code
            <input className={`${field} pz-mono`} value={party} onChange={(e) => setParty(e.target.value)} maxLength={40} placeholder="riverside-crew" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy === "join"} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy === "join" ? "Joining…" : me ? "Save" : "Join party"}
            </button>
            {me && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-4 py-2 text-sm">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border">
            {rows.map((r) => {
              const mine = r.pubkey === me.pubkey;
              return (
                <li key={r.pubkey} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.nick} {mine && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="pz-mono text-xs text-muted-foreground">
                      {r.role ? `${r.role} · ` : ""}{shortNpub(r.pubkey)}
                    </p>
                    {r.last && <p className="mt-1 text-xs italic text-muted-foreground">{r.last}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="pz-mono text-sm" aria-label={`${r.count} deaths`}>☠ {r.count}</span>
                    {mine && (
                      <button
                        onClick={() => setConfirm(true)}
                        disabled={busy === "death"}
                        className="rounded-md border border-destructive/60 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {busy === "death" ? "Posting…" : "+ Death"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button onClick={() => void refresh(me.party)} className="rounded-md border border-border px-2.5 py-1">
              {busy === "sync" ? "Syncing…" : "Refresh"}
            </button>
            <button onClick={() => setEditing(true)} className="rounded-md border border-border px-2.5 py-1">Edit profile</button>
            <button onClick={() => void backup()} className="rounded-md border border-border px-2.5 py-1">Backup game key</button>
            <button
              onClick={() => {
                if (window.confirm("Forget this game identity on this device? Without a backup it cannot be restored.")) {
                  forgetGameIdentity();
                  setMe(null);
                  setEditing(true);
                  setPlayers([]);
                  setDeaths({});
                }
              }}
              className="rounded-md border border-border px-2.5 py-1 text-muted-foreground"
            >
              Forget
            </button>
          </div>
          <p className="pz-mono mt-3 break-all text-[11px] text-muted-foreground">Game identity: {me.npub}</p>
        </>
      )}

      {notice && <p className="mt-3 text-xs text-primary">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        This uses a separate game-only key, not your WondersLand account. The page is unlisted, but death posts are
        public Nostr notes by design.
      </p>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="pz">
          <AlertDialogHeader>
            <AlertDialogTitle>Post a death?</AlertDialogTitle>
            <AlertDialogDescription>
              This publishes a public, permanent Nostr note. There is no undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void die()}>Yes, I died</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
