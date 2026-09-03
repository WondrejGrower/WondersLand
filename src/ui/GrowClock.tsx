import { Timer } from "lucide-react";
import { useGrowTimer } from "../hooks/useGrowTimer";
import type { Diary } from "../nostr/types";

/**
 * Live grow timer chip. `compact` shows only the day count; the full form adds
 * a ticking hh:mm:ss for grows that are still running.
 */
export function GrowClock({
  diary,
  compact = false,
  className = "",
}: {
  diary: Diary;
  compact?: boolean;
  className?: string;
}) {
  const timer = useGrowTimer(diary);
  const text = compact ? timer.short : timer.label;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${
        timer.running ? "text-leaf" : "text-cream/60"
      } ${className}`}
      title={timer.running ? "Time since this diary was started" : "Total grow time"}
    >
      <Timer className="h-3.5 w-3.5" aria-hidden />
      <span className={timer.running && !compact ? "tabular-nums" : ""}>{text}</span>
    </span>
  );
}
