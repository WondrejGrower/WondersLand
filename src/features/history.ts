import type { ActivityLog, BoardSnapshot } from "./tasks/types";
import type { Diary, DiaryItemRef } from "../nostr/types";

export type DiaryHistoryItem = {
  id: string;
  diaryId: string;
  diaryTitle: string;
  plantName: string;
  item: DiaryItemRef;
};

export type ActivityHistoryItem = {
  id: string;
  occurredAt: number;
  action: ActivityLog["action"];
  title: string;
  detail: string;
};

export function diaryHistory(diaries: Diary[]): DiaryHistoryItem[] {
  return diaries
    .flatMap((diary) =>
      diary.items.map((item) => ({
        id: item.eventId,
        diaryId: diary.id,
        diaryTitle: diary.title,
        plantName: diary.plant || diary.title,
        item,
      })),
    )
    .sort((a, b) => b.item.createdAt - a.item.createdAt);
}

const completedActions = new Set<ActivityLog["action"]>([
  "task_completed",
  "habit_completed",
  "timer_started",
  "timer_completed",
  "timer_cancelled",
  "streak_reset",
]);

function fallbackTitle(action: ActivityLog["action"]): string {
  if (action === "task_completed") return "Removed task";
  if (action === "habit_completed") return "Removed habit";
  if (action === "timer_started" || action === "timer_completed" || action === "timer_cancelled") return "Removed timer";
  return "Journey reset";
}

export function activityHistory(board: BoardSnapshot, logs: ActivityLog[]): ActivityHistoryItem[] {
  const titles = new Map<string, string>();
  board.tasks.forEach((item) => titles.set(item.id, item.title));
  board.habits.forEach((item) => titles.set(item.id, item.title));
  board.timers.forEach((item) => titles.set(item.id, item.title));
  board.streakGoals.forEach((item) => titles.set(item.id, item.title));

  return logs
    .filter((log) => completedActions.has(log.action))
    .map((log) => {
      const metadataTitle = typeof log.metadata?.["title"] === "string" ? log.metadata["title"] : null;
      const title = metadataTitle || titles.get(log.itemId) || fallbackTitle(log.action);
      const duration = log.metadata?.["durationSeconds"];
      const detail =
        log.action === "task_completed"
          ? "Task completed"
          : log.action === "habit_completed"
            ? "Habit completed"
            : log.action === "timer_completed"
              ? typeof duration === "number"
                ? `Timer completed · ${Math.round(duration / 60)} min`
                : "Timer completed"
              : log.action === "timer_started"
                ? "Timer started"
                : log.action === "timer_cancelled"
                  ? "Timer cancelled"
              : "Journey restarted";
      return { id: log.entryId, occurredAt: log.occurredAt, action: log.action, title, detail };
    })
    .sort((a, b) => b.occurredAt - a.occurredAt || a.id.localeCompare(b.id));
}