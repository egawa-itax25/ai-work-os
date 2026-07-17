"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent } from "react";
import {
  Task,
  TaskPriority,
  TaskStatus,
  initialTasks,
  isOverdue,
  normalizeTaskList,
  remoteStorageKey,
  priorityMeta,
  statusMeta,
  storageKey,
} from "../task-data";
import {
  normalizePortfolioProjects,
  portfolioRemoteStorageKey,
  portfolioStorageKey,
  type PortfolioProject,
} from "@/lib/portfolio-data";
import { addTrashItem, createTrashDates } from "@/lib/trash-data";
import { loadSyncedState, saveSyncedState } from "@/lib/synced-storage";

export default function TaskProjects() {
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project") ?? "";
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [editingProject, setEditingProject] = useState("");
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: "title" | "description";
  } | null>(null);
  const [cellDraft, setCellDraft] = useState("");
  const [draggedProject, setDraggedProject] = useState("");
  const [projectDropTarget, setProjectDropTarget] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [taskDropTarget, setTaskDropTarget] = useState("");

  useEffect(() => {
    void Promise.all([
      loadSyncedState({
        localKey: storageKey,
        remoteKey: remoteStorageKey,
        fallback: initialTasks,
        normalize: normalizeTaskList,
        onValue: setTasks,
      }),
      loadSyncedState({
        localKey: portfolioStorageKey,
        remoteKey: portfolioRemoteStorageKey,
        fallback: [],
        normalize: (value) =>
          Array.isArray(value) ? normalizePortfolioProjects(value) : [],
        onValue: setPortfolioProjects,
      }),
    ]);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.closest("input, textarea, select, button, a") ||
        target?.getAttribute("contenteditable") === "true";

      if (event.key !== "Delete" || !selectedTaskId || isTyping) {
        return;
      }

      const task = tasks.find((current) => current.id === selectedTaskId);

      if (!task) {
        return;
      }

      event.preventDefault();
      addTrashItem({
        id: `task-${task.id}-${Date.now()}`,
        kind: "task",
        ...createTrashDates(),
        task,
      });
      const nextTasks = tasks.filter((current) => current.id !== task.id);

      setTasks(nextTasks);
      void saveSyncedState(storageKey, remoteStorageKey, nextTasks);
      setSelectedTaskId("");
      setEditingCell(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskId, tasks]);

  const ownerCandidates = useMemo(() => {
    const values = new Set(["未設定", "あなた"]);

    for (const task of tasks) {
      if (task.owner && task.owner !== "AI") {
        values.add(task.owner);
      }
      if (
        task.currentBallHolder &&
        !["AI", "なし", "顧客", "あなた"].includes(task.currentBallHolder)
      ) {
        values.add(task.currentBallHolder);
      }
    }

    for (const project of portfolioProjects) {
      if (project.owner && project.owner !== "AI") {
        values.add(project.owner);
      }
    }

    return Array.from(values);
  }, [portfolioProjects, tasks]);

  function commitTasks(nextTasks: Task[]) {
    setTasks(nextTasks);
    void saveSyncedState(storageKey, remoteStorageKey, nextTasks);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    commitTasks(
      tasks.map((task) => (task.id === id ? applyTaskPatch(task, patch) : task)),
    );
  }

  function deleteTask(task: Task) {
    addTrashItem({
      id: `task-${task.id}-${Date.now()}`,
      kind: "task",
      ...createTrashDates(),
      task,
    });
    commitTasks(tasks.filter((current) => current.id !== task.id));
  }

  function beginCellEdit(task: Task, field: "title" | "description") {
    setSelectedTaskId(task.id);
    setEditingCell({ taskId: task.id, field });
    setCellDraft(field === "title" ? task.title : task.description);
  }

  function commitCellEdit() {
    if (!editingCell) {
      return;
    }

    const value = cellDraft.trim();
    updateTask(editingCell.taskId, {
      [editingCell.field]: editingCell.field === "title" ? value || "無題のタスク" : cellDraft,
    } as Partial<Task>);
    setEditingCell(null);
  }

  function cancelCellEdit() {
    setEditingCell(null);
    setCellDraft("");
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commitCellEdit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelCellEdit();
    }
  }

  function handleDescriptionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      commitCellEdit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelCellEdit();
    }
  }

  function addTask(project: string) {
    const projectTasks = tasks.filter((task) => task.project === project);
    const newTask: Task = {
      id: `task-${crypto.randomUUID()}`,
      title: "新しいタスク",
      description: "",
      owner: "未設定",
      currentBallHolder: "あなた",
      ballHoldingStartedAt: new Date().toISOString().slice(0, 10),
      project,
      dueDate: new Date().toISOString().slice(0, 10),
      status: "todo",
      priority: "medium",
      progress: 0,
      nextAction: "",
      x: 90 + ((projectTasks.length * 220) % 760),
      y: 120 + ((projectTasks.length * 120) % 420),
      links: [],
      createdAt: new Date().toISOString(),
    };

    const insertIndex = tasks.reduce(
      (lastIndex, task, index) => (task.project === project ? index : lastIndex),
      -1,
    );
    const nextTasks = [...tasks];

    nextTasks.splice(insertIndex + 1, 0, newTask);
    commitTasks(nextTasks);
    setSelectedTaskId(newTask.id);
    setEditingCell({ taskId: newTask.id, field: "title" });
    setCellDraft(newTask.title);
  }

  function startProjectDrag(event: DragEvent<HTMLElement>, project: string) {
    event.stopPropagation();
    setDraggedProject(project);
    setProjectDropTarget("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", project);
  }

  function reorderProject(sourceProject: string, targetProject: string) {
    if (!sourceProject || sourceProject === targetProject) {
      return;
    }

    const sourceTasks = tasks.filter((task) => task.project === sourceProject);

    if (sourceTasks.length === 0) {
      return;
    }

    const remainingTasks = tasks.filter((task) => task.project !== sourceProject);
    const targetIndex = remainingTasks.findIndex(
      (task) => task.project === targetProject,
    );
    const nextTasks = [...remainingTasks];

    nextTasks.splice(
      targetIndex === -1 ? nextTasks.length : targetIndex,
      0,
      ...sourceTasks,
    );
    commitTasks(nextTasks);
    setProjectDropTarget("");
  }

  function startTaskDrag(event: DragEvent<HTMLElement>, taskId: string) {
    event.stopPropagation();
    setDraggedTaskId(taskId);
    setTaskDropTarget("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }

  function reorderTask(sourceTaskId: string, targetTaskId: string) {
    if (!sourceTaskId || sourceTaskId === targetTaskId) {
      return;
    }

    const sourceTask = tasks.find((task) => task.id === sourceTaskId);
    const targetTask = tasks.find((task) => task.id === targetTaskId);

    if (!sourceTask || !targetTask || sourceTask.project !== targetTask.project) {
      return;
    }

    const nextTasks = tasks.filter((task) => task.id !== sourceTaskId);
    const targetIndex = nextTasks.findIndex((task) => task.id === targetTaskId);

    nextTasks.splice(
      targetIndex === -1 ? nextTasks.length : targetIndex,
      0,
      sourceTask,
    );
    commitTasks(nextTasks);
    setTaskDropTarget("");
  }

  function startProjectEdit(project: string) {
    setEditingProject(project);
    setProjectNameDraft(project);
  }

  function renameProject(project: string) {
    const nextName = projectNameDraft.trim();

    if (!nextName || nextName === project) {
      setEditingProject("");
      return;
    }

    commitTasks(
      tasks.map((task) =>
        task.project === project ? { ...task, project: nextName } : task,
      ),
    );
    renamePortfolioProject(project, nextName);
    setPortfolioProjects((current) =>
      current.map((item) =>
        item.name === project ? { ...item, name: nextName } : item,
      ),
    );
    setEditingProject("");
  }

  function deleteProject(project: string) {
    const projectTasks = tasks.filter((task) => task.project === project);
    const portfolioProject = readPortfolioProject(project);

    if (portfolioProject) {
      addTrashItem({
        id: `project-${portfolioProject.id}-${Date.now()}`,
        kind: "project",
        ...createTrashDates(),
        project: portfolioProject,
        tasks: projectTasks,
        connections: [],
      });
    }

    for (const task of projectTasks) {
      addTrashItem({
        id: `task-${task.id}-${Date.now()}`,
        kind: "task",
        ...createTrashDates(),
        task,
      });
    }

    commitTasks(tasks.filter((task) => task.project !== project));
    removePortfolioProject(project);
    setPortfolioProjects((current) =>
      current.filter((item) => item.name !== project),
    );
  }

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        [task.title, task.description, task.owner, task.project]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesProject = !projectFilter || task.project === projectFilter;

      return matchesQuery && matchesStatus && matchesProject;
    });
  }, [projectFilter, query, statusFilter, tasks]);

  const projectGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const groups = new Map<string, Task[]>();

    if (statusFilter === "all") {
      for (const project of [...portfolioProjects].sort((a, b) => a.rank - b.rank)) {
        const matchesProject = !projectFilter || project.name === projectFilter;
        const matchesQuery =
          !normalizedQuery ||
          [
            project.name,
            project.objective,
            project.owner,
            project.currentBallHolder,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        if (matchesProject && matchesQuery) {
          groups.set(project.name, []);
        }
      }
    }

    for (const task of filteredTasks) {
      const list = groups.get(task.project) ?? [];
      list.push(task);
      groups.set(task.project, list);
    }

    return Array.from(groups.entries()).map(([project, projectTasks]) => ({
      project,
      tasks: projectTasks,
      todo: projectTasks.filter((task) => task.status === "todo").length,
      doing: projectTasks.filter((task) => task.status === "doing").length,
      done: projectTasks.filter((task) => task.status === "done").length,
      overdue: projectTasks.filter(
        (task) => task.status !== "done" && isOverdue(task.dueDate),
      ).length,
    }));
  }, [filteredTasks, portfolioProjects, projectFilter, query, statusFilter]);

  return (
    <div className="neo-shell space-y-5 text-zinc-100">
      <datalist id="schedule-owner-candidates">
        {ownerCandidates.map((owner) => (
          <option key={owner} value={owner} />
        ))}
      </datalist>

      <section className="grid gap-4 2xl:grid-cols-[minmax(22rem,0.75fr)_minmax(42rem,1.25fr)]">
        <div>
          <p className="neo-accent text-sm font-medium">プロジェクト別の仕事</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-white">
            {projectFilter ? `${projectFilter} のタスク` : "プロジェクトごとにタスクを見る"}
          </h1>
          {projectFilter ? (
            <p className="mt-2 text-sm text-zinc-500">
              ポートフォリオで選んだプロジェクトだけを表示しています。
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,auto)]">
          <TaskTabs active="projects" />
          <div className="grid grid-cols-3 gap-3 xl:min-w-80">
            <SummaryTile label="プロジェクト" value={projectGroups.length} />
            <SummaryTile label="タスク" value={filteredTasks.length} />
            <SummaryTile
              label="期限超過"
              value={
                filteredTasks.filter(
                  (task) => task.status !== "done" && isOverdue(task.dueDate),
                ).length
              }
              urgent
            />
          </div>
        </div>
      </section>

      <section className="neo-surface rounded-md border p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="neo-input min-w-0 rounded-md border border-zinc-700 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
            placeholder="プロジェクト、タスク、担当で検索"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | TaskStatus)
            }
            className="neo-input rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          >
            <option value="all">すべての状態</option>
            <option value="todo">未着手</option>
            <option value="doing">進行中</option>
            <option value="done">完了</option>
          </select>
          <Link
            href="/portfolio"
            className="rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-center text-sm font-semibold text-violet-100 hover:bg-violet-400/20"
          >
            全体マップを見る
          </Link>
        </div>
        {projectFilter ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/tasks/projects"
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              すべてのプロジェクトを表示
            </Link>
            <Link
              href={`/tasks/projects/${encodeURIComponent(projectFilter)}/map?view=map`}
              className="rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/20"
            >
              このプロジェクトをマップで見る
            </Link>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {projectGroups.map((group) => {
          const showProjectDropLine =
            Boolean(draggedProject) &&
            draggedProject !== group.project &&
            projectDropTarget === group.project;

          return (
          <article
            key={group.project}
            onDragOver={(event) => {
              if (draggedProject && draggedProject !== group.project) {
                event.preventDefault();
                setProjectDropTarget(group.project);
              }
            }}
            onDrop={(event) => {
              if (!draggedProject) {
                return;
              }

              event.preventDefault();
              reorderProject(draggedProject, group.project);
              setDraggedProject("");
              setProjectDropTarget("");
            }}
            className={`neo-surface group/project relative rounded-md border transition ${
              draggedProject === group.project ? "scale-[0.995] opacity-55" : ""
            } ${showProjectDropLine ? "border-sky-200/45" : ""}`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute -top-3 left-4 right-4 h-1 rounded-full bg-sky-200 shadow-[0_0_18px_rgba(125,211,252,0.55)] transition ${
                showProjectDropLine ? "opacity-90" : "opacity-0"
              }`}
            />
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 transition group-hover/project:bg-sky-300/[0.035]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => startProjectDrag(event, group.project)}
                    onDragEnd={() => {
                      setDraggedProject("");
                      setProjectDropTarget("");
                    }}
                    className="grid h-11 w-8 cursor-grab place-items-center rounded-md border border-white/0 text-lg leading-none text-zinc-500 transition hover:border-sky-200/30 hover:bg-sky-200/10 hover:text-sky-100 active:cursor-grabbing group-hover/project:border-sky-200/20 group-hover/project:bg-sky-200/5"
                    aria-label={`${group.project} をドラッグして並び替え`}
                    title="ドラッグしてプロジェクトを並び替え"
                  >
                    ⋮⋮
                  </button>
                  <div className="min-w-0">
                    {editingProject === group.project ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={projectNameDraft}
                          onChange={(event) => setProjectNameDraft(event.target.value)}
                          className="neo-input min-h-10 min-w-[18rem] rounded-md border border-sky-300/40 px-3 text-base font-semibold text-white outline-none focus:border-sky-200"
                          aria-label="プロジェクト名"
                        />
                        <button
                          type="button"
                          onClick={() => renameProject(group.project)}
                          className="min-h-10 rounded-md border border-sky-300/40 bg-sky-300/10 px-3 text-sm font-semibold text-sky-100"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProject("")}
                          className="min-h-10 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-300"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <h2 className="truncate text-lg font-semibold text-white">
                        {group.project}
                      </h2>
                    )}
                    <p className="mt-1 text-sm text-zinc-500">
                      未着手 {group.todo} / 進行中 {group.doing} / 完了 {group.done}
                    </p>
                  </div>
                  <Link
                    href={`/tasks/projects/${encodeURIComponent(group.project)}/map?view=map`}
                    className="flex min-h-12 min-w-[220px] items-center justify-center rounded-md border border-sky-300/45 bg-sky-300/10 px-7 text-sm font-semibold text-sky-50 shadow-lg shadow-sky-950/20 transition hover:bg-sky-300/16"
                  >
                    タスクフローマップ
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => addTask(group.project)}
                  className="rounded-md border border-sky-300/45 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-300/16"
                >
                  ＋ タスク
                </button>
                <button
                  type="button"
                  onClick={() => startProjectEdit(group.project)}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => deleteProject(group.project)}
                  className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/15"
                >
                  削除
                </button>
                {group.overdue > 0 ? (
                  <span className="rounded-md border border-red-400/40 bg-red-400/10 px-2 py-1 text-xs font-semibold text-red-200">
                    期限超過 {group.overdue}
                  </span>
                ) : null}
                <span className="flex min-h-11 items-center rounded-md border border-zinc-700 bg-zinc-950/60 px-3 text-sm font-semibold text-zinc-300">
                  {group.tasks.length}件
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                  <col className="w-[5%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">タスク</th>
                    <th className="px-4 py-3 align-middle">ボール</th>
                    <th className="px-4 py-3 align-middle">状態</th>
                    <th className="px-4 py-3 align-middle">優先度</th>
                    <th className="px-4 py-3 align-middle">担当</th>
                    <th className="px-4 py-3 align-middle">期限</th>
                    <th className="px-4 py-3 align-middle">関連</th>
                    <th className="px-4 py-3 align-middle">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {group.tasks.map((task) => {
                    const isSelected = selectedTaskId === task.id;
                    const isTitleEditing =
                      editingCell?.taskId === task.id && editingCell.field === "title";
                    const isDescriptionEditing =
                      editingCell?.taskId === task.id && editingCell.field === "description";
                    const showTaskDropLine =
                      Boolean(draggedTaskId) &&
                      draggedTaskId !== task.id &&
                      taskDropTarget === task.id;

                    return (
                      <tr
                        key={task.id}
                        tabIndex={0}
                        onClick={() => setSelectedTaskId(task.id)}
                        onDragOver={(event) => {
                          if (draggedTaskId && draggedTaskId !== task.id) {
                            event.preventDefault();
                            setTaskDropTarget(task.id);
                          }
                        }}
                        onDrop={(event) => {
                          if (!draggedTaskId) {
                            return;
                          }

                          event.preventDefault();
                          reorderTask(draggedTaskId, task.id);
                          setDraggedTaskId("");
                          setTaskDropTarget("");
                        }}
                        className={`group relative transition hover:bg-sky-300/[0.035] ${
                          isSelected ? "bg-sky-300/[0.055] outline outline-1 outline-sky-200/20" : ""
                        } ${
                          draggedTaskId === task.id ? "opacity-55" : ""
                        } ${
                          showTaskDropLine ? "shadow-[inset_0_2px_0_rgba(125,211,252,0.95)]" : ""
                        }`}
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => startTaskDrag(event, task.id)}
                              onDragEnd={() => {
                                setDraggedTaskId("");
                                setTaskDropTarget("");
                              }}
                              className="mt-0.5 grid h-8 w-6 shrink-0 cursor-grab place-items-center rounded-md border border-transparent text-base leading-none text-zinc-500 transition hover:border-sky-200/30 hover:bg-sky-200/10 hover:text-sky-100 active:cursor-grabbing group-hover:border-sky-200/20 group-hover:bg-sky-200/5"
                              aria-label={`${task.title} をドラッグして並び替え`}
                              title="ドラッグしてタスクを並び替え"
                            >
                              ⋮⋮
                            </button>
                            <div className="min-w-0 flex-1">
                              {isTitleEditing ? (
                              <input
                                autoFocus
                                value={cellDraft}
                                onChange={(event) => setCellDraft(event.target.value)}
                                onBlur={commitCellEdit}
                                onKeyDown={handleTitleKeyDown}
                                className="neo-input w-full rounded-md border border-sky-300/40 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-sky-200"
                                aria-label="タスク名"
                              />
                              ) : (
                                <button
                                  type="button"
                                  onDoubleClick={() => beginCellEdit(task, "title")}
                                  className="block w-full rounded-md px-2 py-1 text-left font-semibold text-white transition hover:bg-sky-300/10 hover:text-sky-50"
                                  title="ダブルクリックで編集"
                                >
                                  {task.title}
                                </button>
                              )}
                              {isDescriptionEditing ? (
                              <textarea
                                autoFocus
                                value={cellDraft}
                                onChange={(event) => setCellDraft(event.target.value)}
                                onBlur={commitCellEdit}
                                onKeyDown={handleDescriptionKeyDown}
                                className="neo-input mt-1 min-h-16 w-full resize-y rounded-md border border-sky-300/40 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-sky-200"
                                aria-label="タスク説明"
                              />
                              ) : (
                                <button
                                  type="button"
                                  onDoubleClick={() => beginCellEdit(task, "description")}
                                  className="mt-1 block w-full rounded-md px-2 py-1 text-left text-xs text-zinc-500 transition hover:bg-sky-300/10 hover:text-zinc-300"
                                  title="ダブルクリックで編集"
                                >
                                  {task.description || "メモなし"}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <BallSelect task={task} onChange={(value) => updateTask(task.id, { currentBallHolder: value })} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <select
                            value={task.status}
                            onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}
                            className={`inline-flex min-h-8 rounded-md border px-3 py-1 text-sm font-semibold outline-none transition hover:brightness-110 focus:ring-2 focus:ring-sky-200/30 ${statusMeta[task.status].tone}`}
                            aria-label="状態"
                          >
                            <option value="todo">未着手</option>
                            <option value="doing">進行中</option>
                            <option value="done">完了</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <select
                            value={task.priority}
                            onChange={(event) => updateTask(task.id, { priority: event.target.value as TaskPriority })}
                            className={`inline-flex min-h-8 rounded-md border px-3 py-1 text-sm font-semibold outline-none transition hover:brightness-110 focus:ring-2 focus:ring-sky-200/30 ${priorityMeta[task.priority].badge}`}
                            aria-label="優先度"
                          >
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 align-middle font-medium text-zinc-200">
                          <input
                            value={task.owner}
                            list="schedule-owner-candidates"
                            onChange={(event) => updateTask(task.id, { owner: event.target.value || "未設定" })}
                            className="neo-input min-h-8 w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-white outline-none transition hover:border-sky-300/30 hover:bg-sky-300/10 focus:border-sky-200"
                            aria-label="担当"
                          />
                        </td>
                        <td
                          className={
                            task.status !== "done" && isOverdue(task.dueDate)
                              ? "px-4 py-3 align-middle font-semibold text-red-200"
                              : "px-4 py-3 align-middle text-zinc-300"
                          }
                        >
                          <DeadlineControl
                            value={task.dueDate}
                            onChange={(value) => updateTask(task.id, { dueDate: value })}
                          />
                        </td>
                        <td className="px-4 py-3 align-middle text-zinc-300">
                          {task.links.length}件
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => deleteTask(task)}
                              className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/15"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
          );
        })}

        {projectGroups.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-700 px-4 py-10 text-center text-sm text-zinc-500">
            条件に一致するタスクはありません。
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TaskTabs({ active }: { active: "map" | "projects" }) {
  return (
    <div className="neo-surface grid grid-cols-2 gap-3 rounded-md border p-3">
      <Link
        href="/portfolio"
        className={`min-w-0 rounded-md border px-5 py-4 text-center text-base font-semibold ${
          active === "map"
            ? "border-violet-400 bg-violet-500/20 text-violet-50 shadow-lg shadow-violet-950/30"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white"
        }`}
      >
        全体マップ
      </Link>
      <Link
        href="/tasks/projects"
        className={`min-w-0 rounded-md border px-5 py-4 text-center text-base font-semibold ${
          active === "projects"
            ? "border-violet-400 bg-violet-500/20 text-violet-50 shadow-lg shadow-violet-950/30"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white"
        }`}
      >
        プロジェクト一覧
      </Link>
    </div>
  );
}

function BallSelect({
  task,
  onChange,
}: {
  task: Task;
  onChange: (value: string) => void;
}) {
  const value =
    task.status === "done" || task.currentBallHolder === "なし"
      ? "なし"
      : task.currentBallHolder === "あなた"
        ? "あなた"
        : "相手";

  const tone =
    value === "なし"
      ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
      : value === "あなた"
        ? "border-sky-300/45 bg-sky-300/10 text-sky-100"
        : "border-amber-300/45 bg-amber-300/10 text-amber-100";

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`inline-flex min-h-8 rounded-md border px-3 py-1 text-sm font-semibold outline-none transition hover:brightness-110 focus:ring-2 focus:ring-sky-200/30 ${tone}`}
      aria-label="ボール"
    >
      <option value="あなた">自分</option>
      <option value="相手">相手</option>
      <option value="なし">完了</option>
    </select>
  );
}

function DeadlineControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const mode = value === "monthly" ? "monthly" : value ? "date" : "none";

  return (
    <div className="flex min-w-[9rem] flex-col gap-1">
      <select
        value={mode}
        onChange={(event) => {
          const nextMode = event.target.value;

          if (nextMode === "monthly") {
            onChange("monthly");
            return;
          }

          if (nextMode === "none") {
            onChange("");
            return;
          }

          onChange(value && value !== "monthly" ? value : new Date().toISOString().slice(0, 10));
        }}
        className="neo-input min-h-8 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-zinc-100 outline-none transition hover:border-sky-300/30 hover:bg-sky-300/10 focus:border-sky-200"
        aria-label="期限種別"
      >
        <option value="date">日付</option>
        <option value="monthly">毎月</option>
        <option value="none">なし</option>
      </select>
      {mode === "date" ? (
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="neo-input min-h-8 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-zinc-100 outline-none transition hover:border-sky-300/30 hover:bg-sky-300/10 focus:border-sky-200"
          aria-label="期限日"
        />
      ) : null}
    </div>
  );
}

function applyTaskPatch(task: Task, patch: Partial<Task>): Task {
  const next: Task = { ...task, ...patch };
  const isCompleting = patch.status === "done" || patch.currentBallHolder === "なし";
  const isLeavingDone =
    task.status === "done" &&
    ((patch.status && patch.status !== "done") ||
      (patch.currentBallHolder && patch.currentBallHolder !== "なし"));

  if (isCompleting && task.status !== "done") {
    next.status = "done";
    next.currentBallHolder = "なし";
    next.progress = 100;
    next.previousStatus = task.status;
    next.previousBallHolder = task.currentBallHolder;
    next.previousProgress = task.progress;
    return next;
  }

  if (isLeavingDone) {
    const restoredStatus =
      patch.status && patch.status !== "done"
        ? patch.status
        : task.previousStatus && task.previousStatus !== "done"
          ? task.previousStatus
          : "doing";
    const restoredBall =
      patch.currentBallHolder && patch.currentBallHolder !== "なし"
        ? patch.currentBallHolder
        : task.previousBallHolder && task.previousBallHolder !== "なし"
          ? task.previousBallHolder
          : "あなた";

    next.status = restoredStatus;
    next.currentBallHolder = restoredBall;
    next.progress =
      typeof patch.progress === "number"
        ? patch.progress
        : typeof task.previousProgress === "number"
          ? task.previousProgress
          : Math.min(task.progress, 99);
    next.previousStatus = undefined;
    next.previousBallHolder = undefined;
    next.previousProgress = undefined;
    return next;
  }

  if (patch.status === "done") {
    next.currentBallHolder = "なし";
    next.progress = 100;
  }

  if (patch.currentBallHolder === "なし") {
    next.status = "done";
    next.progress = 100;
  }

  return next;
}

function SummaryTile({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: number;
  urgent?: boolean;
}) {
  return (
    <div className="neo-surface rounded-md border p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p
        className={
          urgent
            ? "mt-1 text-2xl font-semibold text-red-300"
            : "mt-1 text-2xl font-semibold text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}

function readPortfolioProjects() {
  const saved = window.localStorage.getItem(portfolioStorageKey);

  if (!saved) {
    return [];
  }

  try {
    return normalizePortfolioProjects(JSON.parse(saved));
  } catch {
    window.localStorage.removeItem(portfolioStorageKey);
    return [];
  }
}

function writePortfolioProjects(projects: PortfolioProject[]) {
  void saveSyncedState(portfolioStorageKey, portfolioRemoteStorageKey, projects);
}

function readPortfolioProject(projectName: string) {
  return readPortfolioProjects().find((project) => project.name === projectName);
}

function renamePortfolioProject(previousName: string, nextName: string) {
  const projects = readPortfolioProjects();

  if (projects.length === 0) {
    return;
  }

  writePortfolioProjects(
    projects.map((project) =>
      project.name === previousName ? { ...project, name: nextName } : project,
    ),
  );
}

function removePortfolioProject(projectName: string) {
  const projects = readPortfolioProjects();

  if (projects.length === 0) {
    return;
  }

  writePortfolioProjects(projects.filter((project) => project.name !== projectName));
}


