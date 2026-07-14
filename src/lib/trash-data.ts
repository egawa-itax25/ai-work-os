import type { Task } from "@/app/tasks/task-data";
import type { PortfolioProject } from "@/lib/portfolio-data";
import { saveSyncedState } from "@/lib/synced-storage";

export type DeletedProjectConnection = {
  sourceId: string;
  targetId: string;
};

export type DeletedTrashItem =
  | {
      id: string;
      kind: "project";
      deletedAt: string;
      expiresAt: string;
      project: PortfolioProject;
      tasks: Task[];
      connections: DeletedProjectConnection[];
    }
  | {
      id: string;
      kind: "task";
      deletedAt: string;
      expiresAt: string;
      task: Task;
    };

export const trashStorageKey = "ai-work-os:trash:v1";
export const trashRemoteStorageKey = "trash";
const trashRetentionDays = 30;

export function createTrashDates(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + trashRetentionDays);

  return {
    deletedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function readTrash() {
  if (typeof window === "undefined") {
    return [];
  }

  const saved = window.localStorage.getItem(trashStorageKey);

  if (!saved) {
    return [];
  }

  try {
    return pruneTrash(JSON.parse(saved));
  } catch {
    window.localStorage.removeItem(trashStorageKey);
    return [];
  }
}

export function writeTrash(items: DeletedTrashItem[]) {
  void saveSyncedState(trashStorageKey, trashRemoteStorageKey, pruneTrash(items));
}

export function addTrashItem(item: DeletedTrashItem) {
  writeTrash([item, ...readTrash().filter((stored) => stored.id !== item.id)]);
}

export function removeTrashItem(id: string) {
  writeTrash(readTrash().filter((item) => item.id !== id));
}

export function pruneTrash(value: unknown): DeletedTrashItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const now = Date.now();

  return value.filter((item): item is DeletedTrashItem => {
    if (!item || typeof item !== "object" || !("id" in item) || !("expiresAt" in item)) {
      return false;
    }

    if (typeof item.id !== "string" || typeof item.expiresAt !== "string") {
      return false;
    }

    const expiresAt = new Date(item.expiresAt).getTime();

    if (Number.isNaN(expiresAt) || expiresAt <= now) {
      return false;
    }

    if (
      "kind" in item &&
      item.kind === "project" &&
      "project" in item &&
      item.project &&
      typeof item.project === "object"
    ) {
      return true;
    }

    return (
      "kind" in item &&
      item.kind === "task" &&
      "task" in item &&
      item.task &&
      typeof item.task === "object"
    );
  });
}
