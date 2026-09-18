import { useEffect } from "react";
import { X } from "lucide-react";
import { useWorldStore } from "../state/useWorldStore";
import { useWorldSettingsStore } from "../state/useWorldSettingsStore";
import { character, stop } from "../world/controller/CharacterController";
import { SPAWN } from "../world/interactables";

/**
 * World Settings — device-local preferences only. Nothing here is published to
 * Nostr. Controls that could not be made genuinely functional yet are simply
 * not shown, rather than offered as dead switches.
 */
export function WorldSettings() {
  const open = useWorldStore((s) => s.settingsOpen);
  const s = useWorldSettingsStore();

  // Read persisted values once the browser is available.
  useEffect(() => {
    useWorldSettingsStore.getState().hydrate();
  }, []);

  // Opening settings must stop whatever the avatar was autonomously doing.
  useEffect(() => {
    if (open) stop();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        useWorldStore.getState().closeSettings();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (!open) return null;

  const close = () => useWorldStore.getState().closeSettings();

  return (
    <div
      className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto overscroll-contain bg-background/70 p-4 backdrop-blur-sm"
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="World settings panel"
        className="my-4 w-full max-w-md rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:p-5"
      >
        <header className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">World settings</h2>
            <p className="text-xs text-muted-foreground">
              Saved on this device only — never published.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={close}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <Section title="Controls">
          <Seg
            label="Movement"
            value={s.controls.movementMode}
            options={[
              ["click", "Click to move"],
              ["wasd", "WASD"],
              ["hybrid", "Hybrid"],
            ]}
            onChange={(v) => s.setControls({ movementMode: v as typeof s.controls.movementMode })}
          />
          <Seg
            label="Mobile movement"
            value={s.controls.mobileMovement}
            options={[
              ["tap", "Tap to move"],
              ["joystick", "Joystick"],
            ]}
            onChange={(v) =>
              s.setControls({ mobileMovement: v as typeof s.controls.mobileMovement })
            }
          />
          <Seg
            label="Run"
            value={s.controls.runMode}
            options={[
              ["walk", "Walk"],
              ["auto", "Auto"],
              ["run", "Run"],
            ]}
            onChange={(v) => s.setControls({ runMode: v as typeof s.controls.runMode })}
          />
          <Toggle
            label="Walk to objects automatically"
            checked={s.controls.autoInteract}
            onChange={(v) => s.setControls({ autoInteract: v })}
          />
          <Toggle
            label="Show movement marker"
            checked={s.controls.movementMarker}
            onChange={(v) => s.setControls({ movementMarker: v })}
          />
          <Toggle
            label="Highlight clicked objects"
            checked={s.controls.objectHighlight}
            onChange={(v) => s.setControls({ objectHighlight: v })}
          />
        </Section>

        <Section title="Camera">
          <Slide
            label="Sensitivity"
            value={s.camera.sensitivity}
            min={0.4}
            max={2}
            step={0.1}
            onChange={(v) => s.setCamera({ sensitivity: v })}
          />
          <Slide
            label="Zoom sensitivity"
            value={s.camera.zoomSensitivity}
            min={0.4}
            max={2}
            step={0.1}
            onChange={(v) => s.setCamera({ zoomSensitivity: v })}
          />
          <Slide
            label="Distance"
            value={s.camera.distance}
            min={0.7}
            max={1.6}
            step={0.05}
            onChange={(v) => s.setCamera({ distance: v })}
          />
          <Toggle
            label="Follow character"
            checked={s.camera.followCharacter}
            onChange={(v) => s.setCamera({ followCharacter: v })}
          />
          <Toggle
            label="Turn character toward movement"
            checked={s.camera.rotateTowardMovement}
            onChange={(v) => s.setCamera({ rotateTowardMovement: v })}
          />
          <Toggle
            label="Invert camera"
            checked={s.camera.invert}
            onChange={(v) => s.setCamera({ invert: v })}
          />
        </Section>

        <Section title="Graphics">
          <Seg
            label="Render scale"
            value={String(s.graphics.renderScale)}
            options={[
              ["0.75", "75%"],
              ["1", "100%"],
            ]}
            onChange={(v) => s.setGraphics({ renderScale: Number(v) })}
          />
          <Seg
            label="FPS cap"
            value={String(s.graphics.fpsLimit)}
            options={[
              ["30", "30"],
              ["60", "60"],
            ]}
            onChange={(v) => s.setGraphics({ fpsLimit: Number(v) })}
          />
        </Section>

        <Section title="Interface">
          <Seg
            label="HUD size"
            value={s.interface.hudScale}
            options={[
              ["small", "Small"],
              ["normal", "Normal"],
              ["large", "Large"],
            ]}
            onChange={(v) => s.setInterface({ hudScale: v as typeof s.interface.hudScale })}
          />
          <Toggle
            label="Interaction prompts"
            checked={s.interface.prompts}
            onChange={(v) => s.setInterface({ prompts: v })}
          />
          <Toggle
            label="Tutorial hints"
            checked={s.interface.tutorialHints}
            onChange={(v) => s.setInterface({ tutorialHints: v })}
          />
        </Section>

        <Section title="Accessibility">
          <Toggle
            label="Reduced motion"
            checked={s.accessibility.reducedMotion}
            onChange={(v) => s.setAccessibility({ reducedMotion: v })}
          />
          <Toggle
            label="Reduce camera movement"
            checked={s.accessibility.reduceCameraMotion}
            onChange={(v) => s.setAccessibility({ reduceCameraMotion: v })}
          />
          <Toggle
            label="Larger text"
            checked={s.accessibility.largeText}
            onChange={(v) => s.setAccessibility({ largeText: v })}
          />
        </Section>

        <Section title="World">
          <div className="flex flex-wrap gap-2">
            <Action
              label="Reset camera"
              onClick={() => {
                character.camYaw = character.charYaw;
                character.zoom = 1;
              }}
            />
            <Action
              label="Respawn at My Garden"
              onClick={() => {
                stop();
                character.pos.set(SPAWN[0], 0, SPAWN[1]);
                character.charYaw = 0;
                character.camYaw = 0;
                close();
              }}
            />
            <Action label="Reset controls" onClick={() => s.resetControls()} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-border bg-background/40 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              value === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-primary"
      />
    </label>
  );
}

function Slide({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="flex items-center justify-between">
        {label}
        <span className="text-xs text-muted-foreground">{value.toFixed(2)}×</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-full border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-muted"
    >
      {label}
    </button>
  );
}
