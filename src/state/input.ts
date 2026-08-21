// Per-frame input lives in a plain mutable object, never in React state.
// Keyboard and touch are kept as separate channels so a keyboard reset (focus
// loss, tab hidden, overlay opened) can never wipe an active touch joystick.

const keyboard = { forward: 0, strafe: 0 };
const touch = { forward: 0, strafe: 0 };

function clamp(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value;
}

export const input = {
  yawDelta: 0, // radians to apply this frame, consumed by the player
  get forward() {
    return clamp(keyboard.forward + touch.forward);
  },
  get strafe() {
    return clamp(keyboard.strafe + touch.strafe);
  },
};

export function setKeyboardAxes(forward: number, strafe: number) {
  keyboard.forward = clamp(forward);
  keyboard.strafe = clamp(strafe);
}

export function setTouchAxes(forward: number, strafe: number) {
  touch.forward = clamp(forward);
  touch.strafe = clamp(strafe);
}

export function clearKeyboardInput() {
  keyboard.forward = 0;
  keyboard.strafe = 0;
}

export function clearTouchInput() {
  touch.forward = 0;
  touch.strafe = 0;
}

export function resetInput() {
  clearKeyboardInput();
  clearTouchInput();
  input.yawDelta = 0;
}
