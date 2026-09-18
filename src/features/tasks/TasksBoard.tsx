/**
 * The 2D board overlay: Today, Habits, Timers, Journey.
 * Plain DOM UI — no Three.js imports, so the 3D layer can open it safely.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNostrStore } from "../../state/useNostrStore";
import { useWorldStore } from "../../state/useWorldStore";
import { useTasksStore } from "./useTasksStore";
import {
  clockLabel,
  completedToday,
  currentStreak,
  completionDays,
  elapsedLabel,
  recentDayKeys,
  remainingSeconds,
  weeklyProgress,
  weeklyStreak,
} from "./streaks";
import { MAX_TIMER_SECONDS, type Habit, type TimerPreset } from "./types";

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

const chip =
  "shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary";

/** Touch-safe reordering; a drag handle would not work reliably on mobile. */
function MoveButtons({
  label,
  first,
  last,
  onMove,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={first}
        onClick={() => onMove(-1)}
        aria-label={`Move ${label} up`}
        className={`${chip} min-h-8 min-w-8 disabled:opacity-30`}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={last}
        onClick={() => onMove(1)}
        aria-label={`Move ${label} down`}
        className={`${chip} min-h-8 min-w-8 disabled:opacity-30`}
      >
        ↓
      </button>
    </span>
  );
}

const SYNC_BADGE: Record<string, { icon: string; label: string; detail: string }> = {
  local: {
    icon: "🔒",
    label: "Local only",
    detail: "Changes are saved on this device and will sync when a connection is available.",
  },
  syncing: { icon: "↻", label: "Syncing", detail: "Sending encrypted changes." },
  synced: { icon: "✓", label: "Nostr synced", detail: "Everything is stored encrypted to you." },
  error: { icon: "!", label: "Sync error", detail: "The last sync attempt did not go through." },
  "no-encryption": {
    icon: "🔒",
    label: "Local only",
    detail: "This sign-in method cannot encrypt, so nothing is sent. The board stays on device.",
  },
};

function SyncBadge() {
  const status = useTasksStore((s) => s.status);
  const pending = useTasksStore((s) => s.pending);
  const error = useTasksStore((s) => s.error);
  const [open, setOpen] = useState(false);
  const badge = SYNC_BADGE[status] ?? SYNC_BADGE["local"]!;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-8 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
      >
        <span aria-hidden>{badge.icon}</span>
        <span className="hidden sm:inline">{badge.label}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 mt-2 w-60 rounded-2xl border border-border bg-card p-3 text-xs leading-snug text-muted-foreground shadow-xl">
          <p className="font-medium text-card-foreground">{badge.label}</p>
          <p className="mt-1">{badge.detail}</p>
          {pending > 0 ? <p className="mt-1">{pending} change(s) waiting to sync.</p> : null}
          {status === "error" && error ? <p className="mt-1 break-words">Last error: {error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function TasksBoard() {
  const open = useWorldStore((s) => s.tasksOpen);
  const close = useWorldStore((s) => s.closeTasks);
  const pubkey = useNostrStore((s) => s.pubkey);
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
        <header className="flex items-center gap-2 border-b border-border px-5 py-4 sm:gap-3 sm:px-7">
          <h2
            id="tasks-title"
            className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Garden Board
          </h2>
          <SyncBadge />
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close the board"
            className="shrink-0 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  const { addTask, toggleTask, archiveTask, renameTask, moveItem, clearCompletedTasks } =
    useTasksStore.getState();

  // Open work first, done work below; each group keeps its explicit order.
  const { open, done } = useMemo(() => {
    const live = tasks.filter((t) => !t.archived).sort((a, b) => a.order - b.order);
    return {
      open: live.filter((t) => !t.completed),
      done: live.filter((t) => t.completed),
    };
  }, [tasks]);
  const rows = [...open, ...done];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionTitle>Today</SectionTitle>
        {done.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Clear ${done.length} completed task(s) from the board?`)) {
                clearCompletedTasks();
              }
            }}
            className={`${chip} min-h-8`}
          >
            Clear completed
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on the board yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((task, index) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 sm:gap-3"
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
              <MoveButtons
                label={task.title}
                first={index === 0}
                last={index === rows.length - 1}
                onMove={(direction) => moveItem("tasks", task.id, direction)}
              />
              <button
                type="button"
                onClick={() => archiveTask(task.id)}
                aria-label={`Remove ${task.title}`}
                className={chip}
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

const numberField =
  "w-16 min-w-0 rounded-xl border border-border bg-background px-2 py-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Shared by "add habit" and "edit habit": title + cadence + weekly target. */
function HabitForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Habit;
  submitLabel: string;
  onSubmit: (value: { title: string; cadence: "daily" | "weekly"; target: number }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [cadence, setCadence] = useState<"daily" | "weekly">(initial?.cadence ?? "daily");
  const [target, setTarget] = useState(`${initial?.target ?? 3}`);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl border border-border bg-background px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        if (!clean) {
          setError("Give the habit a name.");
          return;
        }
        const parsed = Number.parseInt(target, 10);
        const value = Number.isFinite(parsed) ? Math.max(1, Math.min(7, parsed)) : 3;
        onSubmit({ title: clean, cadence, target: value });
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Habit name"
        aria-label="Habit name"
        className="w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["daily", "weekly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCadence(value)}
            aria-pressed={cadence === value}
            className={`min-h-8 rounded-full border px-3 py-1 capitalize ${
              cadence === value
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {value}
          </button>
        ))}
        {cadence === "weekly" ? (
          <label className="flex items-center gap-1 text-muted-foreground">
            <input
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Times per week"
              className={numberField}
            />
            × per week (1–7)
          </label>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function HabitsSection() {
  const habits = useTasksStore((s) => s.board.habits);
  const logs = useTasksStore((s) => s.logs);
  const { addHabit, updateHabit, toggleHabitToday, archiveHabit, moveItem } =
    useTasksStore.getState();
  const now = useTick(true, 60_000) || Date.now();
  const days = useMemo(() => recentDayKeys(now), [now]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
          {ordered.map((habit, index) => {
            if (editingId === habit.id) {
              return (
                <li key={habit.id} className="min-w-0">
                  <HabitForm
                    initial={habit}
                    submitLabel="Save habit"
                    onCancel={() => setEditingId(null)}
                    onSubmit={(value) => {
                      updateHabit(habit.id, value);
                      setEditingId(null);
                    }}
                  />
                </li>
              );
            }
            const done = completedToday(logs, habit.id, now);
            const completed = completionDays(logs, habit.id);
            const weekly = habit.cadence === "weekly";
            const target = Math.max(1, Math.min(7, habit.target ?? 3));
            const streak = weekly
              ? weeklyStreak(logs, habit.id, target, now)
              : currentStreak(logs, habit.id, now);
            const progress = weekly ? weeklyProgress(logs, habit.id, now) : 0;
            return (
              <li
                key={habit.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 sm:gap-3"
              >
                <button
                  type="button"
                  onClick={() => toggleHabitToday(habit.id)}
                  aria-pressed={done}
                  className={`min-h-8 shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    done
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {done ? "Done today" : "Mark today"}
                </button>
                <span className="min-w-0 flex-1 truncate text-sm">{habit.title}</span>
                {weekly ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {progress} / {target} this week
                  </span>
                ) : (
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
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {streak}
                  {weekly ? "w" : "d"} streak
                </span>
                <MoveButtons
                  label={habit.title}
                  first={index === 0}
                  last={index === ordered.length - 1}
                  onMove={(direction) => moveItem("habits", habit.id, direction)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditingId(habit.id);
                  }}
                  className={chip}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => archiveHabit(habit.id)}
                  aria-label={`Remove ${habit.title}`}
                  className={chip}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {adding ? (
        <HabitForm
          submitLabel="Add habit"
          onCancel={() => setAdding(false)}
          onSubmit={(value) => {
            addHabit(value.title, value.cadence, value.target);
            setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="mt-3 min-h-10 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          + Add habit
        </button>
      )}
    </section>
  );
}

/** Hours / minutes / seconds form used for both new and edited presets. */
function TimerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: TimerPreset;
  submitLabel: string;
  onSubmit: (value: { title: string; durationSeconds: number; icon: string }) => void;
  onCancel: () => void;
}) {
  const start = initial?.durationSeconds ?? 0;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [h, setH] = useState(`${Math.floor(start / 3600)}`);
  const [m, setM] = useState(`${Math.floor((start % 3600) / 60)}`);
  const [s, setS] = useState(`${start % 60}`);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  return (
    <form
      className="mt-3 space-y-3 rounded-2xl border border-border bg-background px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        const duration = num(h) * 3600 + num(m) * 60 + num(s);
        if (!clean) {
          setError("Give the timer a name.");
          return;
        }
        if (duration <= 0) {
          setError("Set a duration longer than zero.");
          return;
        }
        if (duration > MAX_TIMER_SECONDS) {
          setError("Keep the timer under 12 hours.");
          return;
        }
        onSubmit({ title: clean, durationSeconds: duration, icon: icon.trim().slice(0, 4) });
      }}
    >
      <div className="flex gap-2">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🌿"
          aria-label="Timer icon"
          className="w-12 shrink-0 rounded-xl border border-border bg-background px-2 py-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Timer name"
          aria-label="Timer name"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={h}
            onChange={(e) => setH(e.target.value)}
            aria-label="Hours"
            className={numberField}
          />
          h
        </label>
        <label className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={m}
            onChange={(e) => setM(e.target.value)}
            aria-label="Minutes"
            className={numberField}
          />
          m
        </label>
        <label className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={s}
            onChange={(e) => setS(e.target.value)}
            aria-label="Seconds"
            className={numberField}
          />
          s
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TimersSection() {
  const presets = useTasksStore((s) => s.board.timers);
  const active = useTasksStore((s) => s.board.activeTimers);
  const {
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    completeTimer,
    addTimerPreset,
    updateTimerPreset,
    removeTimerPreset,
    moveItem,
  } = useTasksStore.getState();
  const running = active.some((t) => !t.pausedAt);
  const now = useTick(running) || Date.now();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const ordered = useMemo(() => [...presets].sort((a, b) => a.order - b.order), [presets]);

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
        {ordered.map((preset, index) => {
          const timer = active.find((t) => t.presetId === preset.id);
          const left = timer ? remainingSeconds(timer, now) : Math.round(preset.durationSeconds);
          if (editingId === preset.id) {
            return (
              <li key={preset.id} className="min-w-0">
                <TimerForm
                  initial={preset}
                  submitLabel="Save timer"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(value) => {
                    updateTimerPreset(preset.id, value);
                    setEditingId(null);
                  }}
                />
              </li>
            );
          }
          return (
            <li
              key={preset.id}
              className="min-w-0 rounded-2xl border border-border bg-background px-4 py-3"
            >
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {preset.icon ? `${preset.icon} ` : ""}
                  {preset.title}
                </p>
                <MoveButtons
                  label={preset.title}
                  first={index === 0}
                  last={index === ordered.length - 1}
                  onMove={(direction) => moveItem("timers", preset.id, direction)}
                />
              </div>
              <p className="mt-1 text-2xl tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                {clockLabel(left)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {!timer ? (
                  <button
                    type="button"
                    onClick={() => startTimer(preset.id)}
                    className="min-h-8 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
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
                      className={`${chip} min-h-8`}
                    >
                      {timer.pausedAt ? "Resume" : "Pause"}
                    </button>
                    <button
                      type="button"
                      onClick={() => completeTimer(preset.id)}
                      className={`${chip} min-h-8`}
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelTimer(preset.id)}
                      className={`${chip} min-h-8`}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setEditingId(preset.id);
                  }}
                  className={`${chip} min-h-8`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (timer && !window.confirm(`Stop and delete "${preset.title}"?`)) return;
                    removeTimerPreset(preset.id);
                  }}
                  aria-label={`Delete ${preset.title}`}
                  className={`${chip} min-h-8`}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {adding ? (
        <TimerForm
          submitLabel="Add timer"
          onCancel={() => setAdding(false)}
          onSubmit={(value) => {
            addTimerPreset(value.title, value.durationSeconds, value.icon);
            setAdding(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="mt-3 min-h-10 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
        >
          + Add timer
        </button>
      )}
    </section>
  );
}

function JourneySection() {
  const goals = useTasksStore((s) => s.board.streakGoals);
  const { addStreakGoal, renameStreakGoal, resetStreakGoal, archiveStreakGoal } =
    useTasksStore.getState();
  const visible = goals.filter((g) => !g.archived);
  // One second tick only while a journey is on screen; nothing is published.
  const now = useTick(visible.length > 0, 1000) || Date.now();

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
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 sm:gap-3"
            >
              <input
                value={goal.title}
                onChange={(e) => renameStreakGoal(goal.id, e.target.value)}
                aria-label={`Rename ${goal.title}`}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {elapsedLabel(goal.startedAt ?? goal.createdAt ?? now, now)}
              </span>
              <button
                type="button"
                onClick={() => resetStreakGoal(goal.id)}
                className={chip}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => archiveStreakGoal(goal.id)}
                aria-label={`Remove ${goal.title}`}
                className={chip}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <AddRow placeholder="Start a journey to track time" onAdd={addStreakGoal} />
    </section>
  );
}
