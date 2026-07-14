import type { Task } from "@/app/tasks/task-data";
import { saveSyncedState } from "@/lib/synced-storage";

export type CompletedTaskItem = {
  id: string;
  completedAt: string;
  task: Task;
};

export const completedStorageKey = "ai-work-os:completed-tasks:v1";
export const completedRemoteStorageKey = "completed-tasks";

export function readCompletedTasks() {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(completedStorageKey);

  if (!saved) {
    return [];
  }

  try {
    return normalizeCompletedTasks(JSON.parse(saved));
  } catch {
    window.localStorage.removeItem(completedStorageKey);
    return [];
  }
}

export function writeCompletedTasks(items: CompletedTaskItem[]) {
  void saveSyncedState(
    completedStorageKey,
    completedRemoteStorageKey,
    normalizeCompletedTasks(items),
  );
}

export function addCompletedTasks(tasks: Task[], now = new Date()) {
  const completedAt = now.toISOString();
  const nextItems = tasks.map((task) => ({
    id: `completed-${task.id}-${now.getTime()}`,
    completedAt,
    task: {
      ...task,
      status: "done" as const,
      progress: 100,
      currentBallHolder: "なし",
    },
  }));
  const existing = readCompletedTasks();
  const nextTaskIds = new Set(tasks.map((task) => task.id));

  writeCompletedTasks([
    ...nextItems,
    ...existing.filter((item) => !nextTaskIds.has(item.task.id)),
  ]);

  return nextItems;
}

export function removeCompletedTask(id: string) {
  writeCompletedTasks(readCompletedTasks().filter((item) => item.id !== id));
}

export function normalizeCompletedTasks(value: unknown): CompletedTaskItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is CompletedTaskItem => {
    return (
      item &&
      typeof item === "object" &&
      "id" in item &&
      "completedAt" in item &&
      "task" in item &&
      typeof item.id === "string" &&
      typeof item.completedAt === "string" &&
      Boolean(item.task)
    );
  });
}
