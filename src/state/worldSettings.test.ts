import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  sanitizeSettings,
} from "./useWorldSettingsStore";

describe("world settings persistence", () => {
  it("falls back to defaults for junk", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("discards a stored snapshot from another schema version", () => {
    const stored = {
      schemaVersion: SETTINGS_SCHEMA_VERSION + 1,
      controls: { movementMode: "wasd" },
    };
    expect(sanitizeSettings(stored).controls.movementMode).toBe(
      DEFAULT_SETTINGS.controls.movementMode,
    );
  });

  it("keeps known values and ignores unknown or mistyped ones", () => {
    const restored = sanitizeSettings({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      controls: { movementMode: "click", autoInteract: false, bogus: 1 },
      camera: { distance: 1.4, sensitivity: "fast" },
      nonsense: true,
    });
    expect(restored.controls.movementMode).toBe("click");
    expect(restored.controls.autoInteract).toBe(false);
    expect(restored.camera.distance).toBe(1.4);
    // A mistyped value must not overwrite a good default.
    expect(restored.camera.sensitivity).toBe(DEFAULT_SETTINGS.camera.sensitivity);
    expect(restored).not.toHaveProperty("nonsense");
  });

  it("defaults to hybrid movement during the migration", () => {
    expect(DEFAULT_SETTINGS.controls.movementMode).toBe("hybrid");
  });
});
