export type IntroPhase = "photo" | "descending" | "journey";

export const INTRO_PHOTO_HOLD_MS = 650;
export const INTRO_PHOTO_TIMEOUT_MS = 1800;
export const INTRO_DESCENT_MS = 2800;

/** A single automatic entrance. Loading failures must never trap the visitor. */
export function startEntryIntro({
  photoReady,
  reducedMotion,
  onPhase,
}: {
  photoReady: Promise<unknown>;
  reducedMotion: boolean;
  onPhase: (phase: IntroPhase) => void;
}) {
  let active = true;
  let held = false;
  let loaded = false;
  let descending = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  function dispose() {
    active = false;
    timers.forEach(clearTimeout);
    timers.clear();
  }
  function finish() {
    if (!active) return;
    dispose();
    onPhase("journey");
  }
  function later(callback: () => void, delay: number) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (active) callback();
    }, delay);
    timers.add(id);
    return id;
  }
  function descendWhenReady() {
    if (!active || !held || !loaded || descending) return;
    descending = true;
    onPhase("descending");
    later(finish, INTRO_DESCENT_MS);
  }
  function ready() {
    if (!active) return;
    loaded = true;
    descendWhenReady();
  }
  // Handle rejection too: the intro remains optional even with a missing photo.
  void photoReady.then(ready, ready);
  if (reducedMotion) {
    finish();
  } else {
    later(() => {
      held = true;
      descendWhenReady();
    }, INTRO_PHOTO_HOLD_MS);
    later(ready, INTRO_PHOTO_TIMEOUT_MS);
  }
  return { skip: finish, dispose };
}
