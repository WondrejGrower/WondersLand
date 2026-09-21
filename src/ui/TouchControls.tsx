import { useEffect, useRef, useState } from "react";
import { clearTouchInput, setTouchAxes } from "../state/input";
import { useWorldSettingsStore } from "../state/useWorldSettingsStore";
import { useLayoutEditorStore } from "../world/editor/useLayoutEditorStore";


const RADIUS = 52;

/** On-screen joystick for touch devices. Writes to the input refs, never to state. */
export function TouchControls() {
  const [isTouch, setIsTouch] = useState(false);
  const knob = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  // The joystick is one of two mobile movement styles; tap-to-move is the other.
  const mobileMovement = useWorldSettingsStore((s) => s.controls.mobileMovement);
  const movementMode = useWorldSettingsStore((s) => s.controls.movementMode);
  const editing = useLayoutEditorStore((s) => s.active);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  if (editing || !isTouch || mobileMovement !== "joystick" || movementMode === "click") return null;

  const setKnob = (dx: number, dy: number) => {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const start = (e: React.PointerEvent) => {
    active.current = e.pointerId;
    origin.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    let dx = e.clientX - origin.current.x;
    let dy = e.clientY - origin.current.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob(dx, dy);
    setTouchAxes(-dy / RADIUS, dx / RADIUS);
  };

  const end = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    setKnob(0, 0);
    clearTouchInput();
  };


  return (
    <div
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      aria-hidden="true"
      className="absolute bottom-8 left-8 z-10 grid h-32 w-32 touch-none place-items-center rounded-full border border-border bg-card/50 backdrop-blur"
    >
      <div ref={knob} className="h-14 w-14 rounded-full bg-primary/70" />
    </div>
  );
}
