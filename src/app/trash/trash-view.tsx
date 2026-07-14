"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  normalizePortfolioProjects,
  portfolioRemoteStorageKey,
  portfolioStorageKey,
  type PortfolioProject,
} from "@/lib/portfolio-data";
import {
  normalizeTaskList,
  remoteStorageKey as taskRemoteStorageKey,
  storageKey as taskStorageKey,
  type Task,
} from "@/app/tasks/task-data";
import {
  pruneTrash,
  readTrash,
  removeTrashItem,
  trashRemoteStorageKey,
  trashStorageKey,
  type DeletedTrashItem,
} from "@/lib/trash-data";
import { loadSyncedState, saveSyncedState } from "@/lib/synced-storage";

type ToastState = { message: string } | null;
type DeletedProjectItem = Extract<DeletedTrashItem, { kind: "project" }>;
type DeletedTaskItem = Extract<DeletedTrashItem, { kind: "task" }>;

export default function TrashView() {
  const [items, setItems] = useState<DeletedTrashItem[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    void loadSyncedState({
      localKey: trashStorageKey,
      remoteKey: trashRemoteStorageKey,
      fallback: [],
      normalize: pruneTrash,
      onValue: setItems,
    });
  }, []);

  const groupedItems = useMemo(
    () => ({
      projects: items.filter((item): item is DeletedProjectItem => item.kind === "project"),
      tasks: items.filter((item): item is DeletedTaskItem => item.kind === "task"),
    }),
    [items],
  );

  function removeFromView(id: string) {
    removeTrashItem(id);
    setItems(readTrash());
  }

  function restoreProject(item: DeletedProjectItem) {
    const projects = readProjects();
    const tasks = readTasks();
    const connections = readProjectConnections();

    writeProjects([item.project, ...projects.filter((project) => project.id !== item.project.id)]);
    writeTasks([
      ...item.tasks,
      ...tasks.filter((task) => task.project !== item.project.name),
    ]);
    writeProjectConnections([
      ...item.connections,
      ...connections.filter(
        (connection) =>
          connection.sourceId !== item.project.id && connection.targetId !== item.project.id,
      ),
    ]);
    removeFromView(item.id);
    setToast({ message: "プロジェクトを復元しました。" });
  }

  function restoreTask(item: DeletedTaskItem) {
    const tasks = readTasks();
    writeTasks([item.task, ...tasks.filter((task) => task.id !== item.task.id)]);
    removeFromView(item.id);
    setToast({ message: "タスクを復元しました。" });
  }

  return (
    <section className="min-h-screen space-y-5 text-slate-100">
      <header className="rounded-lg border border-white/10 bg-slate-950/62 p-5 shadow-xl shadow-black/25 backdrop-blur-xl">
        <p className="text-sm font-medium text-sky-200">保管庫</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">削除済み</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
          削除したプロジェクトとタスクを30日間だけ保管します。必要なものはここから復元できます。
        </p>
      </header>

      {toast ? (
        <div className="rounded-lg border border-sky-200/20 bg-sky-200/[0.08] px-4 py-3 text-sm text-sky-50">
          {toast.message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <TrashSection title="削除したプロジェクト" count={groupedItems.projects.length}>
          {groupedItems.projects.length > 0 ? (
            groupedItems.projects.map((item) => (
              <TrashCard
                key={item.id}
                title={item.project.name}
                meta={`${item.tasks.length}件のタスクを含む`}
                expiresAt={item.expiresAt}
                onRestore={() => restoreProject(item)}
                onForget={() => removeFromView(item.id)}
              />
            ))
          ) : (
            <EmptyTrash />
          )}
        </TrashSection>

        <TrashSection title="削除したタスク" count={groupedItems.tasks.length}>
          {groupedItems.tasks.length > 0 ? (
            groupedItems.tasks.map((item) => (
              <TrashCard
                key={item.id}
                title={item.task.title}
                meta={item.task.project}
                expiresAt={item.expiresAt}
                onRestore={() => restoreTask(item)}
                onForget={() => removeFromView(item.id)}
              />
            ))
          ) : (
            <EmptyTrash />
          )}
        </TrashSection>
      </section>
    </section>
  );
}

function TrashSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400">
          {count}件
        </span>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function TrashCard({
  title,
  meta,
  expiresAt,
  onRestore,
  onForget,
}: {
  title: string;
  meta: string;
  expiresAt: string;
  onRestore: () => void;
  onForget: () => void;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{meta}</p>
          <p className="mt-3 text-xs text-slate-400">残り {daysLeft(expiresAt)} 日</p>
        </div>
        <div className="grid shrink-0 gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            復元
          </button>
          <button
            type="button"
            onClick={onForget}
            className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
          >
            保管から外す
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyTrash() {
  return (
    <p className="rounded-lg border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
      削除済みはありません。
    </p>
  );
}

function daysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function readProjects() {
  const saved = window.localStorage.getItem(portfolioStorageKey);
  return saved ? normalizePortfolioProjects(JSON.parse(saved)) : [];
}

function writeProjects(projects: PortfolioProject[]) {
  void saveSyncedState(portfolioStorageKey, portfolioRemoteStorageKey, projects);
}

function readTasks() {
  const saved = window.localStorage.getItem(taskStorageKey);
  return saved ? normalizeTaskList(JSON.parse(saved)) : [];
}

function writeTasks(tasks: Task[]) {
  void saveSyncedState(taskStorageKey, taskRemoteStorageKey, tasks);
}

function readProjectConnections(): { sourceId: string; targetId: string }[] {
  const saved = window.localStorage.getItem("ai-work-os:portfolio-connections:v1");
  const parsed = saved ? JSON.parse(saved) : [];

  return Array.isArray(parsed)
    ? parsed.filter(
        (connection): connection is { sourceId: string; targetId: string } =>
          typeof connection?.sourceId === "string" && typeof connection?.targetId === "string",
      )
    : [];
}

function writeProjectConnections(connections: { sourceId: string; targetId: string }[]) {
  void saveSyncedState(
    "ai-work-os:portfolio-connections:v1",
    "portfolio-connections",
    connections,
  );
}
