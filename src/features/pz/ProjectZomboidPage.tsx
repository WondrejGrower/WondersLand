import { useMemo, useRef, useState } from "react";
import { ALL_ITEMS, CHALLENGES, EASIEST_RUN, ROLES, SECTIONS, type Item, type Priority } from "./data";
import { PartyPanel } from "./PartyPanel";
import { useChecklist } from "./useChecklist";

const PRIORITY_LABEL: Record<Priority, string> = { critical: "Critical", high: "High", normal: "Normal" };
const KNOWN = new Set([...ALL_ITEMS, ...CHALLENGES].map((x) => x.id));

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

function Row({ item, done, onToggle }: { item: Item; done: boolean; onToggle: () => void }) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted/50">
        <input type="checkbox" checked={done} onChange={onToggle} className="mt-0.5 size-4 accent-[var(--primary)]" />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{item.title}</span>
          {item.note && <span className="mt-0.5 block text-xs text-muted-foreground">{item.note}</span>}
        </span>
        <span className="pz-mono hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{item.role}</span>
        {item.priority === "critical" && (
          <span className="shrink-0 rounded border border-accent/50 px-1.5 text-[10px] uppercase tracking-wide text-accent">crit</span>
        )}
      </label>
    </li>
  );
}

export function ProjectZomboidPage() {
  const { checked, toggle, exportJson, importJson } = useChecklist();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"" | Priority>("");
  const [role, setRole] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [deaths, setDeaths] = useState(0);
  const [io, setIo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doneCount = ALL_ITEMS.filter((x) => checked.has(x.id)).length;
  const pct = ALL_ITEMS.length ? (doneCount / ALL_ITEMS.length) * 100 : 0;

  const next = useMemo(() => {
    for (const s of SECTIONS) {
      const it = s.items.find((x) => x.priority === "critical" && !checked.has(x.id));
      if (it) return { item: it, section: s.title };
    }
    for (const s of SECTIONS) {
      const it = s.items.find((x) => !checked.has(x.id));
      if (it) return { item: it, section: s.title };
    }
    return null;
  }, [checked]);

  const match = (x: Item) =>
    (!query || x.title.toLowerCase().includes(query.toLowerCase())) &&
    (!priority || x.priority === priority) &&
    (!role || x.role === role) &&
    (!hideDone || !checked.has(x.id));

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "project-zomboid-checklist.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function upload(file: File) {
    try {
      const n = importJson(await file.text(), KNOWN);
      setIo(`Imported ${n} completed items.`);
    } catch {
      setIo("That file is not a checklist export.");
    }
  }

  const field = "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="pz min-h-screen bg-background text-foreground">
      {/* Mobile compact sticky progress */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Survival {Math.round(pct)}%</span>
          <span className="pz-mono text-muted-foreground">☠ {deaths}</span>
        </div>
        <div className="mt-1.5"><Bar value={pct} /></div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-8 space-y-6" aria-label="Sections">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Survival progress</p>
              <p className="mt-1 text-3xl font-semibold">{Math.round(pct)}%</p>
              <div className="mt-2"><Bar value={pct} /></div>
              <p className="pz-mono mt-2 text-xs text-muted-foreground">{doneCount}/{ALL_ITEMS.length} · party ☠ {deaths}</p>
            </div>
            <ul className="space-y-1 text-sm">
              {[{ id: "run", title: "Easiest run" }, { id: "party", title: "Party" }, ...SECTIONS, { id: "challenges", title: "Survivor Challenges" }].map((s) => {
                const sec = SECTIONS.find((x) => x.id === s.id);
                const d = sec ? sec.items.filter((x) => checked.has(x.id)).length : null;
                return (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex justify-between rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <span>{s.title}</span>
                      {sec && <span className="pz-mono text-[11px]">{d}/{sec.items.length}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 space-y-10">
          <header>
            <p className="pz-mono text-xs uppercase tracking-widest text-muted-foreground">Build 42.21 Stable · Multiplayer</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Project Zomboid Survival Board</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A calm checklist for a co-op run in Knox County. Progress is saved in this browser; the party and death
              counter sync over Nostr.
            </p>
          </header>

          {next && (
            <section className="rounded-lg border border-primary/40 bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-primary">What now?</p>
              <p className="mt-2 text-lg font-medium">{next.item.title}</p>
              <p className="pz-mono mt-1 text-xs text-muted-foreground">
                {next.section} · {PRIORITY_LABEL[next.item.priority]} · responsible: {next.item.role}
              </p>
              <button onClick={() => toggle(next.item.id)} className="mt-4 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
                Mark done
              </button>
            </section>
          )}

          <section id="run" className="scroll-mt-20 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Easiest Multiplayer Run</h2>
              <p className="mt-1 text-sm text-muted-foreground">Recommended beginner route. This roadmap does not count toward the survival percentage.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EASIEST_RUN.setup.map((s) => (
                  <span key={s} className="rounded-full border border-border px-3 py-1 text-xs">{s}</span>
                ))}
              </div>
            </div>
            <ol className="space-y-3">
              {EASIEST_RUN.phases.map((p) => {
                const id = `run-${p.id}`;
                const done = checked.has(id);
                return (
                  <li key={p.id} className={`rounded-lg border border-border bg-card p-4 ${done ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="pz-mono text-xs text-muted-foreground">{p.when}</p>
                        <p className="font-medium">{p.title}</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={done} onChange={() => toggle(id)} className="size-4 accent-[var(--primary)]" />
                        Gate passed
                      </label>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{p.steps.join(" · ")}</p>
                    <p className="mt-3 border-l-2 border-accent pl-3 text-xs">
                      <span className="font-semibold uppercase tracking-wide text-accent">Do not move on until</span> {p.gate}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          <div id="party" className="scroll-mt-20">
            <PartyPanel onTotal={setDeaths} />
          </div>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input className={field} placeholder="Search checklist…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
              <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as "" | Priority)} aria-label="Priority">
                <option value="">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
              <select className={field} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-[var(--primary)]" />
                Hide completed
              </label>
              <span className="flex-1" />
              <button onClick={download} className="rounded-md border border-border px-2.5 py-1">Export progress</button>
              <button onClick={() => fileRef.current?.click()} className="rounded-md border border-border px-2.5 py-1">Import</button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
            </div>
            {io && <p className="text-xs text-muted-foreground">{io}</p>}
          </section>

          {SECTIONS.map((s) => {
            const items = s.items.filter(match);
            if (items.length === 0) return null;
            const d = s.items.filter((x) => checked.has(x.id)).length;
            return (
              <section key={s.id} id={s.id} className="scroll-mt-20">
                <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                  <span className="pz-mono text-xs text-muted-foreground">{d}/{s.items.length}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.blurb}</p>
                <ul className="mt-2">
                  {items.map((it) => <Row key={it.id} item={it} done={checked.has(it.id)} onToggle={() => toggle(it.id)} />)}
                </ul>
              </section>
            );
          })}

          <section id="challenges" className="scroll-mt-20">
            <div className="border-b border-border pb-2">
              <h2 className="text-lg font-semibold">Survivor Challenges</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Optional bragging rights. Not counted in survival progress.</p>
            <ul className="mt-2">
              {CHALLENGES.filter(match).map((it) => <Row key={it.id} item={it} done={checked.has(it.id)} onToggle={() => toggle(it.id)} />)}
            </ul>
          </section>

          <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
            Unlisted private beta, not indexed by search engines. Death posts are public Nostr notes.
          </footer>
        </main>
      </div>
    </div>
  );
}
