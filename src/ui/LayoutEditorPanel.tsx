/**
 * Hidden layout editor panel (owner tool, `?edit=1` or F2).
 *
 * Everything here is device-local: it mutates the in-memory layout and exports
 * paste-ready TypeScript. Nothing is stored or published.
 */
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { PLAYER_RADIUS, WORLD_COLLIDERS, resolveMove, resolved } from "../world/collision";
import { pathPoint } from "../world/Plaza";
import { SPAWN } from "../world/layout";
import { serializeLayout } from "../world/editor/serialize";
import { focusOn, frameAll, reset as resetView, zoomBy } from "../world/editor/editorCamera";
import { round, useLayoutEditorStore } from "../world/editor/useLayoutEditorStore";
import type { PlaceableModelType } from "../world/layout";

const STEPS = [0.1, 0.5, 1];
const ADD_OPTIONS: Array<{ value: PlaceableModelType | "tree" | "plant-slot"; label: string }> = [
  { value: "tree", label: "Strom" },
  { value: "arch", label: "Brána WondersLand" },
  { value: "cottage", label: "Domek My Garden" },
  { value: "greenhouse", label: "Skleník" },
  { value: "garden-board", label: "Task cedule" },
  { value: "welcome-sign", label: "Uvítací cedule" },
  { value: "grow-beds", label: "Vyvýšené záhony" },
  { value: "plant-slot", label: "Místo pro rostlinu" },
];

function spawnWarning(): string | null {
  resolveMove(SPAWN[0], SPAWN[1], WORLD_COLLIDERS, null, PLAYER_RADIUS);
  const off = Math.hypot(resolved.x - SPAWN[0], resolved.z - SPAWN[1]);
  return off > 1e-3 ? "Spawn point je uvnitř překážky." : null;
}

/** Walk the centerline and flag any point the player would be pushed out of. */
function pathWarning(): string | null {
  // The last stretch ends at the cottage door, where being pushed back is normal.
  for (let i = 0; i <= 18; i++) {
    const p = pathPoint(i / 20);
    resolveMove(p.x, p.z, WORLD_COLLIDERS, null, PLAYER_RADIUS);
    if (Math.hypot(resolved.x - p.x, resolved.z - p.z) > 1e-3) return "Něco stojí na pěšině.";
  }
  return null;
}

export function LayoutEditorPanel() {
  const active = useLayoutEditorStore((s) => s.active);
  const version = useLayoutEditorStore((s) => s.version);
  const selectedId = useLayoutEditorStore((s) => s.selected);
  const step = useLayoutEditorStore((s) => s.step);
  const pointerMode = useLayoutEditorStore((s) => s.pointerMode);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addType, setAddType] = useState<(typeof ADD_OPTIONS)[number]["value"]>("tree");

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
    <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-30 flex max-h-[42dvh] flex-col overflow-hidden rounded-xl border border-border bg-card/95 text-sm text-card-foreground shadow-xl backdrop-blur md:inset-x-auto md:bottom-auto md:left-3 md:top-3 md:max-h-[85vh] md:w-[min(20rem,calc(100vw-1.5rem))]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2 md:border-b-0 md:pb-1 md:pt-3">
        <strong className="text-xs uppercase tracking-wide text-muted-foreground">
          Layout editor
        </strong>
        <div className="flex gap-1">
          <button
            type="button"
            className="min-h-10 rounded-md border border-border px-3 py-1 text-xs md:min-h-0 md:px-2"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "Rozbalit" : "Sbalit"}
          </button>
          <button
            type="button"
            className="min-h-10 rounded-md border border-border px-3 py-1 text-xs md:min-h-0 md:px-2"
            onClick={() => store.close()}
          >
            Zavřít
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain px-3 pb-3 pt-2 [scrollbar-gutter:stable] md:pt-1">
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

          <div className="grid grid-cols-2 gap-1 text-xs">
            {(["camera", "edit"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => store.setPointerMode(mode)}
                className={`min-h-10 rounded-md border px-2 py-1 md:min-h-0 ${
                  pointerMode === mode ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {mode === "camera" ? "Kamera" : "Úpravy"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              className="min-h-10 rounded-md border border-border px-2 py-1 md:min-h-0"
              onClick={() => zoomBy(1 / 1.25)}
            >
              Přiblížit +
            </button>
            <button
              type="button"
              className="min-h-10 rounded-md border border-border px-2 py-1 md:min-h-0"
              onClick={() => zoomBy(1.25)}
            >
              Oddálit −
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 text-xs">
            <button
              type="button"
              className="min-h-10 rounded-md border border-border px-2 py-1 disabled:opacity-40 md:min-h-0"
              disabled={!selected}
              onClick={() => selected && focusOn(selected.x, selected.z)}
            >
              Na výběr
            </button>
            <button
              type="button"
              className="min-h-10 rounded-md border border-border px-2 py-1 md:min-h-0"
              onClick={() => frameAll()}
            >
              Celá zahrada
            </button>
            <button
              type="button"
              className="min-h-10 rounded-md border border-border px-2 py-1 md:min-h-0"
              onClick={() => resetView()}
            >
              Reset pohledu
            </button>
          </div>


          <select
            value={selectedId ?? ""}
            onChange={(e) => store.select(e.target.value || null)}
            className="min-h-10 w-full rounded-md border border-border bg-background px-2 py-1 text-sm md:min-h-0"
          >
            <option value="">— vyber objekt —</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.group} · {it.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1">
            <select
              aria-label="Model k přidání"
              value={addType}
              onChange={(e) => setAddType(e.target.value as typeof addType)}
              className="min-h-10 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm md:min-h-0"
            >
              {ADD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 shrink-0 md:min-h-0"
              onClick={() => store.addItem(addType)}
              title="Přidat model doprostřed pohledu"
            >
              <Plus aria-hidden="true" /> Přidat
            </Button>
          </div>

          {selected && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
              <div className="text-xs font-medium">{selected.label}</div>
              <div className="grid grid-cols-3 gap-1">
                <span />
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-border py-1 md:min-h-0"
                  onClick={() => store.nudge(selected.id, 0, -step)}
                >
                  ↑
                </button>
                <span />
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-border py-1 md:min-h-0"
                  onClick={() => store.nudge(selected.id, -step, 0)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-border py-1 md:min-h-0"
                  onClick={() => store.nudge(selected.id, 0, step)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded-md border border-border py-1 md:min-h-0"
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
                    className="min-h-10 w-full rounded-md border border-border bg-background px-2 py-1 text-sm md:min-h-0"
                  />
                </label>
                <label className="flex-1 text-xs">
                  Z
                  <input
                    type="number"
                    step={step}
                    value={round(selected.z)}
                    onChange={(e) => store.update(selected.id, { z: Number(e.target.value) })}
                    className="min-h-10 w-full rounded-md border border-border bg-background px-2 py-1 text-sm md:min-h-0"
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

              {selected.removable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-10 border-destructive text-destructive md:min-h-0"
                  onClick={() => store.removeSelected()}
                >
                  <Trash2 aria-hidden="true" /> Odstranit
                </Button>
              )}
            </div>
          )}

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

          <p className="hidden text-[0.7rem] leading-snug text-muted-foreground md:block">
            Táhni objekt po zemi, nebo ho posuň šipkami. Pravé tlačítko / dvěma prsty otáčí kameru.
            Rozmístění se nikam neukládá — zkopíruj ho a pošli.
          </p>
        </div>
      )}
    </div>
  );
}
