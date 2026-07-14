"use client";

import { useEffect, useMemo, useState } from "react";
import {
  normalizeTaskList,
  remoteStorageKey as taskRemoteStorageKey,
  storageKey as taskStorageKey,
  type Task,
} from "@/app/tasks/task-data";
import {
  completedRemoteStorageKey,
  completedStorageKey,
  normalizeCompletedTasks,
  readCompletedTasks,
  removeCompletedTask,
  type CompletedTaskItem,
} from "@/lib/completed-data";
import { loadSyncedState, saveSyncedState } from "@/lib/synced-storage";

type ToastState = { message: string } | null;

export default function CompletedView() {
  const [items, setItems] = useState<CompletedTaskItem[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    void loadSyncedState({
      localKey: completedStorageKey,
      remoteKey: completedRemoteStorageKey,
      fallback: [],
      normalize: normalizeCompletedTasks,
      onValue: setItems,
    });
  }, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, CompletedTaskItem[]>();

    for (const item of items) {
      const list = groups.get(item.task.project) ?? [];
      list.push(item);
      groups.set(item.task.project, list);
    }

    return Array.from(groups.entries());
  }, [items]);

  function removeFromCompleted(id: string) {
    removeCompletedTask(id);
    setItems(readCompletedTasks());
  }

  function restoreTask(item: CompletedTaskItem) {
    const tasks = readTasks();
    const restoredTask: Task = {
      ...item.task,
      status: "done",
      progress: 100,
      currentBallHolder: "なし",
    };

    writeTasks([restoredTask, ...tasks.filter((task) => task.id !== restoredTask.id)]);
    removeFromCompleted(item.id);
    setToast({ message: "タスクを予定へ戻しました。" });
  }

  function forgetTask(item: CompletedTaskItem) {
    removeFromCompleted(item.id);
    setToast({ message: "完了済みの一覧から外しました。" });
  }

  return (
    <section className="min-h-screen space-y-5 text-slate-100">
      <header className="rounded-lg border border-white/10 bg-slate-950/62 p-5 shadow-xl shadow-black/25 backdrop-blur-xl">
        <p className="text-sm font-medium text-emerald-200">管理</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">完了済み</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
          完了ゾーンから保管したタスクを確認します。必要なものは予定へ戻せます。
        </p>
      </header>

      {toast ? (
        <div className="rounded-lg border border-emerald-200/20 bg-emerald-200/[0.08] px-4 py-3 text-sm text-emerald-50">
          {toast.message}
        </div>
      ) : null}

      <section className="space-y-4">
        {groupedItems.length > 0 ? (
          groupedItems.map(([project, projectItems]) => (
            <section
              key={project}
              className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{project}</h2>
                  <p className="mt-1 text-xs text-slate-500">完了タスクを保管中</p>
                </div>
                <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400">
                  {projectItems.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {projectItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-white">
                          {item.task.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.task.description || item.task.nextAction || "メモなし"}
                        </p>
                        <p className="mt-3 text-xs text-slate-400">
                          完了済みに追加: {formatDateTime(item.completedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => restoreTask(item)}
                          className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
                        >
                          予定へ戻す
                        </button>
                        <button
                          type="button"
                          onClick={() => forgetTask(item)}
                          className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
                        >
                          一覧から外す
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 px-4 py-12 text-center text-sm text-slate-500">
            完了済みに追加されたタスクはありません。
          </p>
        )}
      </section>
    </section>
  );
}

function readTasks() {
  const saved = window.localStorage.getItem(taskStorageKey);
  return saved ? normalizeTaskList(JSON.parse(saved)) : [];
}

function writeTasks(tasks: Task[]) {
  void saveSyncedState(taskStorageKey, taskRemoteStorageKey, tasks);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
