/**
 * Device-local world preferences.
 *
 * These are DEVICE settings, not identity: they are never published to Nostr,
 * never leave the browser and carry a schemaVersion so a future shape change
 * can migrate (or safely discard) old values.
 */
import { create } from "zustand";

const KEY = "wondersland:world-settings";
export const SETTINGS_SCHEMA_VERSION = 1;

export type MovementMode = "click" | "wasd" | "hybrid";
export type RunMode = "walk" | "auto" | "run";
export type MobileMovement = "tap" | "joystick";
export type HudScale = "small" | "normal" | "large";

export type WorldSettings = {
  schemaVersion: number;
  controls: {
    movementMode: MovementMode;
    autoInteract: boolean;
    movementMarker: boolean;
    objectHighlight: boolean;
    runMode: RunMode;
    mobileMovement: MobileMovement;
  };
  camera: {
    sensitivity: number;
    zoomSensitivity: number;
    followCharacter: boolean;
    rotateTowardMovement: boolean;
    invert: boolean;
    distance: number;
  };
  graphics: {
    renderScale: number;
    fpsLimit: number;
  };
  interface: {
    hudScale: HudScale;
    prompts: boolean;
    tutorialHints: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    reduceCameraMotion: boolean;
    largeText: boolean;
  };
};

export const DEFAULT_SETTINGS: WorldSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  controls: {
    movementMode: "hybrid",
    autoInteract: true,
    movementMarker: true,
    objectHighlight: true,
    runMode: "auto",
    mobileMovement: "tap",
  },
  camera: {
    sensitivity: 1,
    zoomSensitivity: 1,
    followCharacter: true,
    rotateTowardMovement: true,
    invert: false,
    distance: 1,
  },
  graphics: {
    renderScale: 1,
    fpsLimit: 60,
  },
  interface: {
    hudScale: "normal",
    prompts: true,
    tutorialHints: true,
  },
  accessibility: {
    reducedMotion: false,
    reduceCameraMotion: false,
    largeText: false,
  },
};

function clone(s: WorldSettings): WorldSettings {
  return {
    schemaVersion: s.schemaVersion,
    controls: { ...s.controls },
    camera: { ...s.camera },
    graphics: { ...s.graphics },
    interface: { ...s.interface },
    accessibility: { ...s.accessibility },
  };
}

/** Merge unknown stored data over the defaults, keeping only known keys. */
export function sanitizeSettings(raw: unknown): WorldSettings {
  const out = clone(DEFAULT_SETTINGS);
  if (!raw || typeof raw !== "object") return out;
  const data = raw as Record<string, unknown>;
  if (data["schemaVersion"] !== SETTINGS_SCHEMA_VERSION) return out;
  for (const section of ["controls", "camera", "graphics", "interface", "accessibility"] as const) {
    const value = data[section];
    if (!value || typeof value !== "object") continue;
    const target = out[section] as Record<string, unknown>;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!(k in target)) continue;
      if (typeof v === typeof target[k]) target[k] = v;
    }
  }
  return out;
}

function load(): WorldSettings {
  if (typeof localStorage === "undefined") return clone(DEFAULT_SETTINGS);
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : clone(DEFAULT_SETTINGS);
  } catch {
    return clone(DEFAULT_SETTINGS);
  }
}

function persist(settings: WorldSettings) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode / quota — settings simply stay for this session */
  }
}

type Store = WorldSettings & {
  setControls: (patch: Partial<WorldSettings["controls"]>) => void;
  setCamera: (patch: Partial<WorldSettings["camera"]>) => void;
  setGraphics: (patch: Partial<WorldSettings["graphics"]>) => void;
  setInterface: (patch: Partial<WorldSettings["interface"]>) => void;
  setAccessibility: (patch: Partial<WorldSettings["accessibility"]>) => void;
  resetControls: () => void;
  resetAll: () => void;
  /** Re-read persisted values after hydration (SSR renders the defaults). */
  hydrate: () => void;
};

function section<K extends keyof WorldSettings>(
  key: K,
  set: (fn: (s: Store) => Partial<Store>) => void,
) {
  return (patch: Partial<WorldSettings[K]>) =>
    set((s) => {
      const next = { ...(s[key] as object), ...patch } as WorldSettings[K];
      const merged = { ...clone(s as unknown as WorldSettings), [key]: next } as WorldSettings;
      persist(merged);
      return { [key]: next } as Partial<Store>;
    });
}

export const useWorldSettingsStore = create<Store>((set) => ({
  ...clone(DEFAULT_SETTINGS),
  setControls: section("controls", set),
  setCamera: section("camera", set),
  setGraphics: section("graphics", set),
  setInterface: section("interface", set),
  setAccessibility: section("accessibility", set),
  resetControls: () =>
    set(() => {
      const controls = { ...DEFAULT_SETTINGS.controls };
      persist({ ...clone(DEFAULT_SETTINGS), controls });
      return { controls };
    }),
  resetAll: () =>
    set(() => {
      const fresh = clone(DEFAULT_SETTINGS);
      persist(fresh);
      return fresh;
    }),
  hydrate: () => set(() => load()),
}));

/** Non-reactive read for per-frame code. */
export function worldSettings(): WorldSettings {
  return useWorldSettingsStore.getState();
}
