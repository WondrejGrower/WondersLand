import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTRO_DESCENT_MS,
  INTRO_PHOTO_HOLD_MS,
  INTRO_PHOTO_TIMEOUT_MS,
  startEntryIntro,
} from "./intro";

describe("automatic photographic entrance", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("automatically reaches the underground bio without any user input", async () => {
    const onPhase = vi.fn();
    startEntryIntro({ photoReady: Promise.resolve(), reducedMotion: false, onPhase });
    await vi.advanceTimersByTimeAsync(INTRO_PHOTO_HOLD_MS - 1);
    expect(onPhase).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onPhase).toHaveBeenLastCalledWith("descending");
    await vi.advanceTimersByTimeAsync(INTRO_DESCENT_MS);
    expect(onPhase.mock.calls).toEqual([["descending"], ["journey"]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for a slow photograph before moving the camera", async () => {
    let resolve!: () => void;
    const photoReady = new Promise<void>((done) => {
      resolve = done;
    });
    const onPhase = vi.fn();
    startEntryIntro({ photoReady, reducedMotion: false, onPhase });
    await vi.advanceTimersByTimeAsync(INTRO_PHOTO_HOLD_MS + 200);
    expect(onPhase).not.toHaveBeenCalled();
    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(onPhase).toHaveBeenLastCalledWith("descending");
  });

  it("still reaches the bio if image decoding never resolves", async () => {
    const onPhase = vi.fn();
    startEntryIntro({ photoReady: new Promise(() => {}), reducedMotion: false, onPhase });
    await vi.advanceTimersByTimeAsync(INTRO_PHOTO_TIMEOUT_MS + INTRO_DESCENT_MS);
    expect(onPhase.mock.calls).toEqual([["descending"], ["journey"]]);
  });

  it("does not get stuck or reject when the image fails to load", async () => {
    const onPhase = vi.fn();
    startEntryIntro({
      photoReady: Promise.reject(new Error("Image failed")),
      reducedMotion: false,
      onPhase,
    });
    await vi.advanceTimersByTimeAsync(INTRO_PHOTO_HOLD_MS + INTRO_DESCENT_MS);
    expect(onPhase).toHaveBeenLastCalledWith("journey");
  });

  it("allows skipping and cancels all remaining automatic transitions", async () => {
    const onPhase = vi.fn();
    const intro = startEntryIntro({ photoReady: Promise.resolve(), reducedMotion: false, onPhase });
    intro.skip();
    await vi.runAllTimersAsync();
    expect(onPhase.mock.calls).toEqual([["journey"]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disposes an in-flight descent without updating an unmounted page", async () => {
    const onPhase = vi.fn();
    const intro = startEntryIntro({ photoReady: Promise.resolve(), reducedMotion: false, onPhase });
    await vi.advanceTimersByTimeAsync(INTRO_PHOTO_HOLD_MS);
    intro.dispose();
    await vi.runAllTimersAsync();
    expect(onPhase.mock.calls).toEqual([["descending"]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows the bio immediately for reduced motion", () => {
    const onPhase = vi.fn();
    startEntryIntro({ photoReady: Promise.resolve(), reducedMotion: true, onPhase });
    expect(onPhase.mock.calls).toEqual([["journey"]]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
