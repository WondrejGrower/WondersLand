// Per-frame input lives in a plain mutable object, never in React state.
// Written by keyboard listeners and the touch joystick, read inside useFrame.
export const input = {
  forward: 0, // -1 back .. 1 forward
  strafe: 0, // -1 left .. 1 right
  yawDelta: 0, // radians to apply this frame, consumed by the player
};

export function resetInput() {
  input.forward = 0;
  input.strafe = 0;
  input.yawDelta = 0;
}
