/**
 * Hidden layout editor panel (owner tool, `?edit=1` or F2).
 *
 * Everything here is device-local: it mutates the in-memory layout and exports
 * paste-ready TypeScript. Nothing is stored or published.
 */
import { useMemo, useState } from "react";
import { PLAYER_RADIUS, WORLD_COLLIDERS, resolveMove, resolved } from "../world/collision";
import { nearPath } from "../world/Plaza";
import { SPAWN } from "../world/layout";
import { serializeLayout } from "../world/editor/serialize";
import { round, useLayoutEditorStore } from "../world/editor/useLayoutEditorStore";

const STEPS = [0.1, 0.5, 1];

function spawnWarning(): string | null {
  resolveMove(SPAWN[0], SPAWN[1], WORLD_COLLIDERS, null, PLAYER_RADIUS);
  const off = Math.hypot(resolved.x - SPAWN[0], resolved.z - SPAWN[1]);
  return off > 1e-3 ? "Spawn point je uvnitř překážky." : null;
}

function pathWarning(): string | null {
  for (const c of WORLD_COLLIDERS) {
    const r = c.kind === "circle" ? c.r : Math.max(c.hw, c.hd);
    if (nearPath(c.x, c.z, r + PLAYER_RADIUS + 0.1)) return "Něco stojí na pěšině.";
  }
  return null;
}

export function LayoutEditorPanel() {
  const active = useLayoutEditorStore((s) => s.active);
  const version = useLayoutEditorStore((s) => s.version);
  const selectedId = useLayoutEditorStore((s) => s.selected);
  const step = useLayoutEditorStore((s) => s.step);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const items = useMemo(() => useLayoutEditorStore.getState().items(), [version, active]);
  const selected = items.find((it) => it.id === selectedId) ?? null;
  const warnings = useMemo(
    () => [spawnWarning(), pathWarning()].filter(Boolean) as string[],
    [version],
  );

  if (!active) return null;

  const store = useLayoutEditorStore.getState();

  const copy = async () => {
    const text = serializeLayout();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Zkopíruj rozmístění:", text);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-30 flex max-h-[85vh] w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card/95 p-3 text-sm text-card-foreground shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs uppercase tracking-wide text-muted-foreground">
          Layout editor
        </strong>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Rozbalit" : "Sbalit"}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => store.close()}
          >
            Zavřít
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Krok</span>
            {STEPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => store.setStep(s)}
                className={`rounded-md border px-2 py-1 ${
                  step === s ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <select
            value={selectedId ?? ""}
            onChange={(e) => store.select(e.target.value || null)}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="">— vyber objekt —</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.group} · {it.label}
              </option>
            ))}
          </select>

          {selected && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
              <div className="text-xs font-medium">{selected.label}</div>
              <div className="grid grid-cols-3 gap-1">
                <span />
                <button
                  type="button"
                  className="rounded-md border border-border py-1"
                  onClick={() => store.nudge(selected.id, 0, -step)}
                >
                  ↑
                </button>
                <span />
                <button
                  type="button"
                  className="rounded-md border border-border py-1"
                  onClick={() => store.nudge(selected.id, -step, 0)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border py-1"
                  onClick={() => store.nudge(selected.id, 0, step)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border py-1"
                  onClick={() => store.nudge(selected.id, step, 0)}
                >
                  →
                </button>
              </div>

              <div className="flex gap-2">
                <label className="flex-1 text-xs">
                  X
                  <input
                    type="number"
                    step={step}
                    value={round(selected.x)}
                    onChange={(e) => store.update(selected.id, { x: Number(e.target.value) })}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex-1 text-xs">
                  Z
                  <input
                    type="number"
                    step={step}
                    value={round(selected.z)}
                    onChange={(e) => store.update(selected.id, { z: Number(e.target.value) })}
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                  />
                </label>
              </div>

              {selected.rot !== null && (
                <label className="text-xs">
                  Otočení {round(selected.rot)}
                  <input
                    type="range"
                    min={-3.2}
                    max={3.2}
                    step={0.05}
                    value={selected.rot}
                    onChange={(e) => store.update(selected.id, { rot: Number(e.target.value) })}
                    className="w-full"
                  />
                </label>
              )}

              {selected.scale !== null && (
                <label className="text-xs">
                  Velikost {round(selected.scale)}
                  <input
                    type="range"
                    min={0.3}
                    max={2.5}
                    step={0.05}
                    value={selected.scale}
                    onChange={(e) => store.update(selected.id, { scale: Number(e.target.value) })}
                    className="w-full"
                  />
                </label>
              )}

              {selected.id.startsWith("tree:") && (
                <button
                  type="button"
                  className="rounded-md border border-destructive px-2 py-1 text-xs text-destructive"
                  onClick={() => store.removeSelectedTree()}
                >
                  Smazat strom
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs"
            onClick={() => store.addTree()}
          >
            + Přidat strom
          </button>

          {warnings.length > 0 && (
            <ul className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              onClick={() => void copy()}
            >
              {copied ? "Zkopírováno" : "Zkopírovat rozmístění"}
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs"
              onClick={() => store.revert()}
            >
              Vrátit vše
            </button>
          </div>

          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            Táhni objekt po zemi, nebo ho posuň šipkami. Pravé tlačítko / dvěma prsty otáčí kameru.
            Rozmístění se nikam neukládá — zkopíruj ho a pošli.
          </p>
        </>
      )}
    </div>
  );
}
