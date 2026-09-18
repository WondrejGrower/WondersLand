/**
 * The 2D board overlay: Today, Habits, Timers, Journey.
 * Plain DOM UI — no Three.js imports, so the 3D layer can open it safely.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNostrStore } from "../../state/useNostrStore";
import { useWorldStore } from "../../state/useWorldStore";
import { useTasksStore } from "./useTasksStore";
import {
  completedToday,
  currentStreak,
  completionDays,
  elapsedLabel,
  recentDayKeys,
} from "./streaks";
import { MAX_TIMER_SECONDS, type ActiveTimer, type TimerPreset } from "./types";

function useTick(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
  return now;
}

/** Remaining seconds derived from the stored transitions only. */
function remainingSeconds(timer: ActiveTimer, now: number): number {
  const reference = timer.pausedAt ?? now;
  const elapsed = reference - timer.startedAt - timer.pausedMs;
  return Math.max(0, Math.round(timer.durationSeconds - elapsed / 1000));
}

function mmss(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const SYNC_LABEL: Record<string, string> = {
  local: "Local only",
  syncing: "Syncing…",
  synced: "Synced to Nostr",
  error: "Sync error",
  "no-encryption": "Local only · private",
};

export function TasksBoard() {
  const open = useWorldStore((s) => s.tasksOpen);
  const close = useWorldStore((s) => s.closeTasks);
  const pubkey = useNostrStore((s) => s.pubkey);
  const store = useTasksStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && pubkey) void useTasksStore.getState().init(pubkey);
  }, [open, pubkey]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/40 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-7">
          <div className="min-w-0 flex-1">
            <h2
              id="tasks-title"
              className="truncate text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Garden Board
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {SYNC_LABEL[store.status] ?? "Local only"}
              {store.pending > 0 ? ` · ${store.pending} waiting` : ""}
              {store.status === "no-encryption"
                ? " · sign in with a key that can encrypt to sync"
                : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close the board"
            className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="hidden sm:inline">Esc</span>
            <span className="sm:hidden">✕</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-5 py-6 sm:px-7">
          <TodaySection />
          <HabitsSection />
          <TimersSection />
          <JourneySection />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{children}</h3>
  );
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(value);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Add
      </button>
    </form>
  );
}

function TodaySection() {
  const tasks = useTasksStore((s) => s.board.tasks);
  const { addTask, toggleTask, archiveTask, renameTask } = useTasksStore.getState();
  const ordered = useMemo(
    () => [...tasks].filter((t) => !t.archived).sort((a, b) => a.order - b.order),
    [tasks],
  );

  return (
    <section>
      <SectionTitle>Today</SectionTitle>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on the board yet.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2"
            >
              <input
                type="checkbox"
                checked={!!task.completed}
                onChange={() => toggleTask(task.id)}
                aria-label={`Complete ${task.title}`}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              <input
                value={task.title}
                onChange={(e) => renameTask(task.id, e.target.value)}
                className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                  task.completed ? "text-muted-foreground line-through" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => archiveTask(task.id)}
                aria-label={`Remove ${task.title}`}
                className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow placeholder="Add a task for today" onAdd={addTask} />
    </section>
  );
}

function HabitsSection() {
  const habits = useTasksStore((s) => s.board.habits);
  const logs = useTasksStore((s) => s.logs);
  const { addHabit, toggleHabitToday, archiveHabit } = useTasksStore.getState();
  const now = useTick(true, 60_000) || Date.now();
  const days = useMemo(() => recentDayKeys(now), [now]);

  const ordered = useMemo(
    () => [...habits].filter((h) => !h.archived).sort((a, b) => a.order - b.order),
    [habits],
  );

  return (
    <section>
      <SectionTitle>Habits</SectionTitle>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No habits yet.</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((habit) => {
            const done = completedToday(logs, habit.id, now);
            const completed = completionDays(logs, habit.id);
            const streak = currentStreak(logs, habit.id, now);
            return (
              <li
                key={habit.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggleHabitToday(habit.id)}
                  aria-pressed={done}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    done
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {done ? "Done today" : "Mark today"}
                </button>
                <span className="min-w-0 flex-1 truncate text-sm">{habit.title}</span>
                <span className="flex shrink-0 items-center gap-1" aria-hidden>
                  {days.map((day) => (
                    <span
                      key={day}
                      className={`h-2.5 w-2.5 rounded-full ${
                        completed.has(day) ? "bg-primary" : "bg-secondary"
                      }`}
                    />
                  ))}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{streak}d streak</span>
                <button
                  type="button"
                  onClick={() => archiveHabit(habit.id)}
                  aria-label={`Remove ${habit.title}`}
                  className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <AddRow placeholder="Add a habit" onAdd={(value) => addHabit(value)} />
    </section>
  );
}

function TimersSection() {
  const presets = useTasksStore((s) => s.board.timers);
  const active = useTasksStore((s) => s.board.activeTimers);
  const { startTimer, pauseTimer, resumeTimer, cancelTimer, completeTimer } =
    useTasksStore.getState();
  const running = active.some((t) => !t.pausedAt);
  const now = useTick(running) || Date.now();

  // A timer that ran out while the page slept is completed on the next tick.
  useEffect(() => {
    for (const timer of active) {
      if (remainingSeconds(timer, Date.now()) === 0) completeTimer(timer.presetId);
    }
  }, [active, now, completeTimer]);

  return (
    <section>
      <SectionTitle>Timers</SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2">
        {[...presets]
          .sort((a, b) => a.order - b.order)
          .map((preset) => {
            const timer = active.find((t) => t.presetId === preset.id);
            const left = timer
              ? remainingSeconds(timer, now)
              : Math.round(preset.durationSeconds);
            return (
              <li
                key={preset.id}
                className="rounded-2xl border border-border bg-background px-4 py-3"
              >
                <p className="text-sm font-medium">
                  {preset.icon ? `${preset.icon} ` : ""}
                  {preset.title}
                </p>
                <p
                  className="mt-1 text-2xl tabular-nums"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {mmss(left)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {!timer ? (
                    <button
                      type="button"
                      onClick={() => startTimer(preset.id)}
                      className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
                    >
                      Start
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          timer.pausedAt ? resumeTimer(preset.id) : pauseTimer(preset.id)
                        }
                        className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:bg-secondary"
                      >
                        {timer.pausedAt ? "Resume" : "Pause"}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelTimer(preset.id)}
                        className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:bg-secondary"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

function JourneySection() {
  const goals = useTasksStore((s) => s.board.streakGoals);
  const { addStreakGoal, resetStreakGoal, archiveStreakGoal } = useTasksStore.getState();
  const now = useTick(true, 60_000) || Date.now();
  const visible = goals.filter((g) => !g.archived);

  return (
    <section>
      <SectionTitle>Journey</SectionTitle>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No journeys tracked yet.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((goal) => (
            <li
              key={goal.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{goal.title}</span>
              <span className="shrink-0 text-sm font-medium">
                Day {dayCountSince(goal.startedAt, now)}
              </span>
              <button
                type="button"
                onClick={() => resetStreakGoal(goal.id)}
                className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => archiveStreakGoal(goal.id)}
                aria-label={`Remove ${goal.title}`}
                className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow placeholder="Start a journey to count days" onAdd={addStreakGoal} />
    </section>
  );
}
