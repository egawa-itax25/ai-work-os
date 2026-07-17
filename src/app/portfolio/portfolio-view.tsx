"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  filterPortfolioProjects,
  getPortfolioStatusLabel,
  getPriorityBreakdown,
  getPriorityScore,
  normalizePortfolioProjectList,
  portfolioFilters,
  portfolioRemoteStorageKey,
  portfolioProjects,
  portfolioStorageKey,
  type BallHolderType,
  type PortfolioFilter,
  type PortfolioProject,
} from "@/lib/portfolio-data";
import {
  initialTasks,
  isOverdue,
  normalizeTaskList,
  remoteStorageKey as taskRemoteStorageKey,
  storageKey as taskStorageKey,
  todayOffset,
  type Task,
  type TaskPriority,
} from "@/app/tasks/task-data";
import { addTrashItem, createTrashDates, removeTrashItem } from "@/lib/trash-data";
import { loadSyncedState, saveSyncedState, type SyncResult } from "@/lib/synced-storage";

type DrawerState =
  | { type: "project" }
  | { type: "task"; projectName?: string }
  | null;
type ToastState = { message: string; undo?: () => void } | null;
type ProjectConnection = { sourceId: string; targetId: string };

const viewStorageKey = "ai-work-os:portfolio-view-state:v1";
const connectionStorageKey = "ai-work-os:portfolio-connections:v1";
const connectionRemoteStorageKey = "portfolio-connections";
const defaultProjectConnections: ProjectConnection[] = portfolioProjects
  .slice(0, -1)
  .map((project, index) => ({
    sourceId: project.id,
    targetId: portfolioProjects[index + 1].id,
  }));

export default function PortfolioView({
  initialFilter,
}: {
  initialFilter: PortfolioFilter;
}) {
  const filter = initialFilter;
  const [projects, setProjects] = useState<PortfolioProject[]>(portfolioProjects);
  const [selectedId, setSelectedId] = useState(portfolioProjects[0]?.id ?? "");
  const [expandedScoreId, setExpandedScoreId] = useState(portfolioProjects[0]?.id ?? "");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [syncResult, setSyncResult] = useState<SyncResult>({
    status: "idle",
    message: "同期状態を確認しています。",
  });
  const [highlightId, setHighlightId] = useState("");
  const [menuProjectId, setMenuProjectId] = useState("");
  const [projectConnections, setProjectConnections] = useState<ProjectConnection[]>(defaultProjectConnections);
  const [portfolioTasks, setPortfolioTasks] = useState<Task[]>(initialTasks);
  const [syncReady, setSyncReady] = useState(false);
  const skipInitialProjectSaveRef = useRef(true);
  const skipInitialConnectionSaveRef = useRef(true);

  useEffect(() => {
    const savedView = window.localStorage.getItem(viewStorageKey);

    if (savedView) {
      try {
        const parsed = JSON.parse(savedView) as {
          selectedId?: string;
          scrollY?: number;
        };

        if (parsed.selectedId) {
          setSelectedId(parsed.selectedId);
        }

        if (typeof parsed.scrollY === "number") {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: parsed.scrollY });
          });
        }
      } catch {
        window.localStorage.removeItem(viewStorageKey);
      }
    }

    Promise.all([
      loadSyncedState({
        localKey: portfolioStorageKey,
        remoteKey: portfolioRemoteStorageKey,
        fallback: portfolioProjects,
        normalize: normalizePortfolioProjectList,
        onValue: setProjects,
        onStatus: setSyncResult,
      }),
      loadSyncedState({
        localKey: taskStorageKey,
        remoteKey: taskRemoteStorageKey,
        fallback: initialTasks,
        normalize: normalizeTaskList,
        onValue: setPortfolioTasks,
        onStatus: setSyncResult,
      }),
      loadSyncedState({
        localKey: connectionStorageKey,
        remoteKey: connectionRemoteStorageKey,
        fallback: defaultProjectConnections,
        normalize: normalizeProjectConnections,
        onValue: setProjectConnections,
        onStatus: setSyncResult,
      }),
    ]).finally(() => setSyncReady(true));
  }, []);

  useEffect(() => {
    function handleGlobalCreate(event: Event) {
      const detail = (event as CustomEvent<{ type?: string }>).detail;

      if (detail?.type === "project") {
        setDrawer({ type: "project" });
      }

      if (detail?.type === "task") {
        setDrawer({ type: "task", projectName: selectedProject?.name });
      }
    }

    window.addEventListener("ai-work-os:create", handleGlobalCreate);

    return () => window.removeEventListener("ai-work-os:create", handleGlobalCreate);
  });

  useEffect(() => {
    if (!syncReady) {
      return;
    }

    if (skipInitialProjectSaveRef.current) {
      skipInitialProjectSaveRef.current = false;
      return;
    }

    setSyncResult({
      status: "saving",
      message: "保存中です。",
    });
    const timeout = window.setTimeout(() => {
      void saveSyncedState(portfolioStorageKey, portfolioRemoteStorageKey, projects).then(setSyncResult);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [projects, syncReady]);

  useEffect(() => {
    if (!syncReady) {
      return;
    }

    if (skipInitialConnectionSaveRef.current) {
      skipInitialConnectionSaveRef.current = false;
      return;
    }

    void saveSyncedState(
      connectionStorageKey,
      connectionRemoteStorageKey,
      projectConnections,
    );
  }, [projectConnections, syncReady]);

  useEffect(() => {
    const saveView = () => {
      window.localStorage.setItem(
        viewStorageKey,
        JSON.stringify({ selectedId, scrollY: window.scrollY }),
      );
    };

    saveView();
    window.addEventListener("beforeunload", saveView);
    window.addEventListener("scroll", saveView, { passive: true });

    return () => {
      window.removeEventListener("beforeunload", saveView);
      window.removeEventListener("scroll", saveView);
    };
  }, [selectedId]);

  useEffect(() => {
    if (!highlightId) {
      return;
    }

    const timeout = window.setTimeout(() => setHighlightId(""), 1800);

    return () => window.clearTimeout(timeout);
  }, [highlightId]);

  useEffect(() => {
    if (!syncReady) {
      return;
    }

    setProjects((current) => {
      const syncedProjects = syncPortfolioProjectsWithTasks(current, portfolioTasks);

      return haveSameProjects(current, syncedProjects) ? current : syncedProjects;
    });
  }, [portfolioTasks, syncReady]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 5200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!menuProjectId) {
      return;
    }

    function closeProjectMenu(event: PointerEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-project-menu-root], [data-project-menu-trigger]")
      ) {
        return;
      }

      setMenuProjectId("");
    }

    function closeProjectMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuProjectId("");
      }
    }

    window.addEventListener("pointerdown", closeProjectMenu);
    window.addEventListener("keydown", closeProjectMenuWithEscape);

    return () => {
      window.removeEventListener("pointerdown", closeProjectMenu);
      window.removeEventListener("keydown", closeProjectMenuWithEscape);
    };
  }, [menuProjectId]);

  const rankedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => getPriorityScore(b) - getPriorityScore(a)),
    [projects],
  );
  const visibleProjects = useMemo(
    () => filterPortfolioProjects(rankedProjects, filter),
    [filter, rankedProjects],
  );
  const selectedProject =
    visibleProjects.find((project) => project.id === selectedId) ??
    rankedProjects.find((project) => project.id === selectedId) ??
    visibleProjects[0] ??
    rankedProjects[0];
  const selectedProjectTasks = useMemo(
    () =>
      selectedProject
        ? portfolioTasks.filter((task) => task.project === selectedProject.name)
        : [],
    [portfolioTasks, selectedProject],
  );
  const actionableProjects = rankedProjects.filter(
    (project) => project.ballHolderType === "self" && project.status !== "done",
  );
  const stalledProjects = rankedProjects.filter(
    (project) => project.status === "stalled",
  );
  const weeklyProgress = Math.round(
    rankedProjects.reduce((total, project) => total + project.progress, 0) /
      Math.max(rankedProjects.length, 1),
  );

  function notify(message: string, undo?: () => void) {
    setToast({ message, undo });
  }

  function updateProject(id: string, patch: Partial<PortfolioProject>) {
    const beforeProjects = projects;
    const beforeTasks = portfolioTasks;
    const targetProject = projects.find((project) => project.id === id);
    const nextProgress =
      typeof patch.progress === "number" ? clamp(patch.progress, 0, 100) : undefined;
    const nextName =
      typeof patch.name === "string" ? patch.name.trim() || undefined : undefined;

    if (targetProject) {
      let tasksChanged = false;
      const nextTasks = portfolioTasks.map((task) => {
        if (task.project !== targetProject.name) {
          return task;
        }

        const renamedTask =
          nextName && nextName !== targetProject.name
            ? { ...task, project: nextName }
            : task;
        const progressedTask =
          nextProgress === 100 ? { ...renamedTask, progress: 100 } : renamedTask;

        if (progressedTask !== task) {
          tasksChanged = true;
        }

        return progressedTask;
      });

      if (tasksChanged) {
        writeTasks(nextTasks);
        setPortfolioTasks(nextTasks);
      }
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === id
          ? {
              ...project,
              ...patch,
              name: nextName ?? project.name,
              progress: nextProgress ?? project.progress,
            }
          : project,
      ),
    );
    notify("変更を保存しました。", () => {
      writeTasks(beforeTasks);
      setPortfolioTasks(beforeTasks);
      setProjects(beforeProjects);
    });
  }

  function createProject(input: CreateProjectInput) {
    const before = projects;
    const nextProject: PortfolioProject = {
      id: `project-${crypto.randomUUID()}`,
      origin: "manual",
      rank: projects.length + 1,
      name: input.name,
      objective: input.objective,
      owner: input.owner,
      dueDate: input.dueDate,
      currentBallHolder: input.owner || "未設定",
      ballHolderType: input.owner === "あなた" ? "self" : "member",
      ballHoldingDays: 0,
      progress: 0,
      status: "healthy",
      stalledCount: 0,
      deadlineRisk: "none",
      businessImportance: 8,
      downstreamImpact: 8,
      dueImpact: 8,
      nextMilestone: "最初のタスクを決める",
      aiSuggestion: "最初のタスクを追加すると流れを作れます。",
      x: 140 + ((projects.length * 180) % 800),
      y: 150 + ((projects.length * 130) % 380),
    };

    setProjects((current) => [nextProject, ...current]);
    setSelectedId(nextProject.id);
    setHighlightId(nextProject.id);
    setDrawer(null);
    notify("プロジェクトを作成しました。", () => setProjects(before));
  }

  function createTask(input: CreateTaskInput) {
    const beforeTasks = readTasks();
    const projectTasks = beforeTasks.filter((task) => task.project === input.project);
    const nextTask: Task = {
      id: `task-${crypto.randomUUID()}`,
      title: input.title,
      description: input.nextAction,
      owner: input.owner,
      currentBallHolder: input.currentBallHolder,
      ballHoldingStartedAt: todayOffset(0),
      project: input.project,
      dueDate: input.dueDate,
      status: "todo",
      priority: input.priority,
      progress: 0,
      nextAction: input.nextAction,
      x: 90 + ((projectTasks.length * 220) % 760),
      y: 120 + ((projectTasks.length * 120) % 420),
      links: [],
      createdAt: new Date().toISOString(),
    };

    const nextTasks = [nextTask, ...beforeTasks];
    writeTasks(nextTasks);
    setPortfolioTasks(nextTasks);
    setDrawer(null);
    notify("タスクを作成しました。", () => {
      writeTasks(beforeTasks);
      setPortfolioTasks(beforeTasks);
    });
  }

  function duplicateProject(project: PortfolioProject) {
    createProject({
      name: `${project.name} の複製`,
      objective: project.objective,
      dueDate: project.dueDate,
      owner: project.owner,
    });
  }

  function deleteProject(project: PortfolioProject) {
    const beforeProjects = projects;
    const beforeTasks = portfolioTasks;
    const beforeConnections = projectConnections;
    const trashId = `trash-project-${project.id}-${Date.now()}`;
    const projectTasks = portfolioTasks.filter((task) => task.project === project.name);
    const projectConnectionsToKeep = projectConnections.filter(
      (connection) =>
        connection.sourceId === project.id || connection.targetId === project.id,
    );
    const nextProjects = projects.filter((item) => item.id !== project.id);
    const nextTasks = portfolioTasks.filter((task) => task.project !== project.name);
    const nextConnections = projectConnections.filter(
      (connection) =>
        connection.sourceId !== project.id && connection.targetId !== project.id,
    );

    addTrashItem({
      id: trashId,
      kind: "project",
      ...createTrashDates(),
      project,
      tasks: projectTasks,
      connections: projectConnectionsToKeep,
    });
    setProjects(nextProjects);
    setPortfolioTasks(nextTasks);
    setProjectConnections(nextConnections);
    writeTasks(nextTasks);

    if (selectedId === project.id) {
      setSelectedId(nextProjects[0]?.id ?? "");
    }

    notify("プロジェクトを削除しました。", () => {
      removeTrashItem(trashId);
      setProjects(beforeProjects);
      setPortfolioTasks(beforeTasks);
      setProjectConnections(beforeConnections);
      writeTasks(beforeTasks);
    });
  }

  return (
    <section className="min-h-screen space-y-5 text-slate-100">
      <header className="grid gap-4 2xl:grid-cols-[minmax(22rem,0.75fr)_minmax(48rem,1.25fr)]">
        <div>
          <p className="text-sm font-medium text-sky-200">ポートフォリオ</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
            プロジェクトの流れを俯瞰
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            状況を見た場所から、そのままプロジェクトとタスクを動かします。
          </p>
        </div>
        <div className="grid gap-3">
          <FilterBar active={filter} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="最優先" value={rankedProjects[0]?.name ?? "なし"} />
            <Metric label="自分のボール" value={`${actionableProjects.length}件`} />
            <Metric label="平均進捗" value={`${weeklyProgress}%`} />
            <button
              type="button"
              onClick={() => setDrawer({ type: "project" })}
              className="rounded-lg border border-sky-200/35 bg-sky-200/[0.08] p-4 text-left text-sm font-semibold text-sky-50 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:bg-sky-200/[0.14]"
            >
              ＋ プロジェクトを追加
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ProjectList
            expandedScoreId={expandedScoreId}
            highlightId={highlightId}
            menuProjectId={menuProjectId}
            projects={visibleProjects}
            selectedId={selectedProject?.id}
            onCreateProject={() => setDrawer({ type: "project" })}
            onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
            onDelete={deleteProject}
            onDuplicate={duplicateProject}
            onExpandScore={setExpandedScoreId}
            onMenuToggle={(id) => setMenuProjectId((current) => (current === id ? "" : id))}
            onSelect={setSelectedId}
            onUpdate={updateProject}
          />

          <SelectedProjectWorkspace
            project={selectedProject}
            tasks={selectedProjectTasks}
            onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
          />

          <BottomSummary
            actionableProjects={actionableProjects}
            stalledProjects={stalledProjects}
            weeklyProgress={weeklyProgress}
          />
        </div>

        <ProjectInspector
          project={selectedProject}
          projects={visibleProjects}
          syncResult={syncResult}
          onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
          onSelect={setSelectedId}
          onUpdate={updateProject}
        />
      </div>

      {drawer?.type === "project" ? (
        <CreateProjectDrawer onClose={() => setDrawer(null)} onCreate={createProject} />
      ) : null}

      {drawer?.type === "task" ? (
        <CreateTaskDrawer
          initialProjectName={drawer.projectName}
          projects={projects}
          onClose={() => setDrawer(null)}
          onCreate={createTask}
        />
      ) : null}

      {toast ? <UndoToast toast={toast} onClose={() => setToast(null)} /> : null}
    </section>
  );
}

function FilterBar({ active }: { active: PortfolioFilter }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/56 p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex flex-wrap gap-2">
        {portfolioFilters.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/portfolio" : `/portfolio?filter=${item.id}`}
            className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-2 text-center text-sm transition duration-200 ${
              active === item.id
                ? "border-sky-200/60 bg-sky-200/12 text-sky-50"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProjectList({
  projects,
  selectedId,
  expandedScoreId,
  highlightId,
  menuProjectId,
  onSelect,
  onExpandScore,
  onMenuToggle,
  onCreateProject,
  onCreateTask,
  onDelete,
  onDuplicate,
  onUpdate,
}: {
  projects: PortfolioProject[];
  selectedId?: string;
  expandedScoreId: string;
  highlightId: string;
  menuProjectId: string;
  onSelect: (id: string) => void;
  onExpandScore: (id: string) => void;
  onMenuToggle: (id: string) => void;
  onCreateProject: () => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDelete: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
  onUpdate: (id: string, patch: Partial<PortfolioProject>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/62 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">プロジェクト一覧</h2>
          <p className="mt-1 text-sm text-slate-500">プロジェクトを選択して、下の作業領域と右側のInspectorで確認できます。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100">
            一覧
          </button>
          <button type="button" className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100">
            カード
          </button>
          <select className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-200/60">
            <option>優先度順</option>
            <option>更新日順</option>
          </select>
          <input
            type="search"
            placeholder="検索..."
            className="w-40 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-sky-200/60"
          />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3 p-3">
        <button
          type="button"
          onClick={onCreateProject}
          className="flex min-h-[230px] min-w-0 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-4 text-center transition duration-200 hover:border-sky-200/40 hover:bg-sky-200/[0.06]"
        >
          <span className="text-3xl font-light text-slate-300">＋</span>
          <span className="mt-3 text-sm font-semibold text-white">新しいプロジェクト</span>
          <span className="mt-2 text-xs text-slate-500">プロジェクトを追加</span>
        </button>
        {projects.map((project, index) => {
          const score = getPriorityScore(project);
          const isSelected = project.id === selectedId;
          const isExpanded = project.id === expandedScoreId;
          const menuOpen = project.id === menuProjectId;

          return (
            <article
              key={project.id}
              onContextMenu={(event) => {
                event.preventDefault();
                onMenuToggle(project.id);
              }}
              className={`relative min-h-[230px] min-w-0 rounded-lg border p-4 transition duration-200 ${
                project.id === highlightId
                  ? "border-sky-200/75 bg-sky-200/[0.12]"
                  : isSelected
                    ? "border-sky-200/55 bg-sky-200/[0.08]"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                className="w-full text-left"
                onClick={() => onSelect(project.id)}
                onKeyDown={(event) => {
                  const target = event.target;

                  if (
                    target instanceof HTMLInputElement ||
                    target instanceof HTMLSelectElement ||
                    target instanceof HTMLButtonElement ||
                    target instanceof HTMLAnchorElement
                  ) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(project.id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <input
                      value={project.name}
                      onChange={(event) => onUpdate(project.id, { name: event.target.value })}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="mt-1 w-full rounded-md border border-transparent bg-white/[0.035] px-2 py-1 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 hover:border-white/10 focus:border-sky-200/55 focus:bg-sky-200/[0.06]"
                      aria-label={`${project.name} のタイトル`}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">優先スコア</p>
                    <p className="text-lg font-semibold text-sky-100">{score}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-2">
                  <label className="min-w-0 text-xs text-slate-500">
                    優先度
                    <select
                      value={getProjectPriorityLevel(project)}
                      onChange={(event) =>
                        onUpdate(project.id, {
                          businessImportance:
                            event.target.value === "high"
                              ? 15
                              : event.target.value === "medium"
                                ? 8
                                : 4,
                        })
                      }
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/80 px-2 py-1.5 text-xs font-semibold text-slate-100 outline-none focus:border-sky-200/60"
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </label>
                  <StatusPill project={project} />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>進捗 {project.progress}%</span>
                    <span className="text-slate-500">バーで変更</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-sky-200 transition-all duration-300" style={{ width: `${project.progress}%` }} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={project.progress}
                    onChange={(event) => onUpdate(project.id, { progress: Number(event.target.value) })}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    className="mt-2 h-2 w-full cursor-pointer accent-sky-200"
                    aria-label={`${project.name} の進捗`}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Info label="担当者" value={project.owner} />
                  <Info label="現在のボール" value={`${project.currentBallHolder} / ${project.ballHoldingDays}日`} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[minmax(3rem,auto)_minmax(0,1fr)_auto] gap-2">
                <Link href={projectScheduleHref(project)} className="min-w-0 whitespace-nowrap rounded-md border border-white/10 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition hover:border-sky-200/50 hover:text-sky-100">
                  開く
                </Link>
                <Link href={projectTaskMapHref(project)} className="min-w-0 rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-center text-xs font-semibold leading-5 text-sky-50 transition hover:bg-sky-200/[0.14]">
                  タスクフローマップ
                </Link>
                <button type="button" data-project-menu-trigger onClick={() => onMenuToggle(project.id)} className="min-w-0 whitespace-nowrap rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100" title="操作メニュー">
                  …
                </button>
                <button type="button" onClick={() => onExpandScore(isExpanded ? "" : project.id)} className="col-span-3 min-w-0 rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100">
                  内訳を見る
                </button>
              </div>

              {menuOpen ? (
                <ProjectContextMenu
                  project={project}
                  onCreateTask={onCreateTask}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onEdit={() => onSelect(project.id)}
                  onClose={() => onMenuToggle(project.id)}
                />
              ) : null}

              {isExpanded ? <ScoreBreakdown project={project} /> : null}
            </article>
          );
        })}
        {projects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
            条件に一致するプロジェクトはありません。
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SelectedProjectWorkspace({
  project,
  tasks,
  onCreateTask,
}: {
  project?: PortfolioProject;
  tasks: Task[];
  onCreateTask: (project: PortfolioProject) => void;
}) {
  if (!project) {
    return null;
  }

  const activeTasks = tasks.filter((task) => task.status !== "archived");
  const selfTasks = activeTasks.filter(
    (task) =>
      task.status !== "done" &&
      (task.currentBallHolder === "あなた" ||
        task.currentBallHolder === project.owner ||
        task.currentBallHolder === "自分"),
  );
  const doneTasks = activeTasks.filter((task) => task.status === "done");
  const otherTasks = activeTasks.filter(
    (task) => task.status !== "done" && !selfTasks.includes(task),
  );

  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/62 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold text-white">{project.name}</h2>
            <span className="rounded-md border border-sky-200/25 bg-sky-200/[0.08] px-2 py-1 text-xs font-semibold text-sky-100">
              進捗 {project.progress}%
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>自分ボール {selfTasks.length}</span>
            <span>相手ボール {otherTasks.length}</span>
            <span>完了 {doneTasks.length}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["フローマップ", "タスク一覧", "ドキュメント", "メモ", "履歴"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md border px-3 py-2 text-sm transition ${
                index === 0
                  ? "border-sky-200/50 bg-sky-200/[0.08] text-sky-50"
                  : "border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onCreateTask(project)}
            className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            ＋ タスクを追加
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <TaskLane title="自分ボール" description="あなたが対応するタスク" tasks={selfTasks} tone="self" />
        <TaskLane title="相手ボール" description="相手の回答や作業待ち" tasks={otherTasks} tone="other" />
        <TaskLane title="完了" description="流れ終わったタスク" tasks={doneTasks} tone="done" />
      </div>
    </section>
  );
}

function TaskLane({
  title,
  description,
  tasks,
  tone,
}: {
  title: string;
  description: string;
  tasks: Task[];
  tone: "self" | "other" | "done";
}) {
  const toneClass =
    tone === "self"
      ? "border-sky-200/45 bg-sky-200/[0.055]"
      : tone === "other"
        ? "border-amber-300/35 bg-amber-300/[0.045]"
        : "border-emerald-300/30 bg-emerald-300/[0.045]";
  const dotClass =
    tone === "self"
      ? "bg-sky-300"
      : tone === "other"
        ? "bg-amber-300"
        : "bg-emerald-300";

  return (
    <div className={`min-h-[260px] rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/18 px-2 py-1 text-xs font-semibold text-slate-300">
          {tasks.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.slice(0, 4).map((task) => (
          <div key={task.id} className="rounded-md border border-white/10 bg-slate-950/55 p-3 shadow-lg shadow-black/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.nextAction || task.description}</p>
              </div>
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span className="truncate">{task.owner}</span>
              <span>{formatDateLabel(task.dueDate)}</span>
            </div>
          </div>
        ))}
        {tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 px-3 py-8 text-center text-sm text-slate-500">
            タスクはありません
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const label = priority === "high" ? "高" : priority === "medium" ? "中" : "低";
  const tone =
    priority === "high"
      ? "border-red-300/35 bg-red-300/10 text-red-100"
      : priority === "medium"
        ? "border-violet-300/30 bg-violet-300/10 text-violet-100"
        : "border-white/10 bg-white/[0.045] text-slate-300";

  return <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function getProjectPriorityLevel(project: PortfolioProject) {
  if (project.businessImportance >= 13) {
    return "high";
  }

  if (project.businessImportance >= 8) {
    return "medium";
  }

  return "low";
}

function formatDateLabel(value: string) {
  if (isMonthlyProjectDueDate(value)) {
    return "毎月";
  }

  if (!value) {
    return "期限なし";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const monthlyProjectDueDate = "monthly";

function isMonthlyProjectDueDate(value: string) {
  return value === monthlyProjectDueDate;
}

function getSyncStatusLabel(status: SyncResult["status"]) {
  switch (status) {
    case "saving":
      return "保存中…";
    case "synced":
      return "クラウド同期済み";
    case "signed-out":
      return "ログインで同期";
    case "error":
      return "同期エラー";
    case "local":
      return "この端末のみ";
    case "loading":
      return "同期確認中";
    default:
      return "同期待機中";
  }
}

function getSyncStatusClassName(status: SyncResult["status"]) {
  switch (status) {
    case "synced":
      return "border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100";
    case "signed-out":
    case "local":
      return "border-amber-300/35 bg-amber-300/[0.08] text-amber-100";
    case "error":
      return "border-rose-300/35 bg-rose-300/[0.08] text-rose-100";
    case "saving":
    case "loading":
      return "border-sky-300/30 bg-sky-300/[0.08] text-sky-100";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-400";
  }
}

function ProjectInspector({
  project,
  projects,
  syncResult,
  onSelect,
  onUpdate,
  onCreateTask,
}: {
  project?: PortfolioProject;
  projects: PortfolioProject[];
  syncResult: SyncResult;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PortfolioProject>) => void;
  onCreateTask: (project: PortfolioProject) => void;
}) {
  if (!project) {
    return null;
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">プロジェクト切替</p>
          <span
            className={`rounded-full border px-2 py-1 text-xs font-semibold ${getSyncStatusClassName(syncResult.status)}`}
            title={syncResult.message}
          >
            {getSyncStatusLabel(syncResult.status)}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {projects.slice(0, 4).map((item, index) => (
            <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition duration-200 ${item.id === project.id ? "border-sky-200/50 bg-sky-200/[0.08]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"}`}>
              <span className="min-w-0 truncate text-sm text-slate-200">{String(index + 1).padStart(2, "0")} {item.name}</span>
              <span className="font-semibold text-sky-100">{getPriorityScore(item)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-sm font-semibold text-white">プロジェクト編集</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">枠内の項目をクリックして、その場で直接編集できます。</p>
          </div>
          <span className="shrink-0 rounded-md border border-sky-200/25 bg-sky-200/[0.08] px-2 py-1 text-[11px] font-semibold text-sky-100">
            自動保存
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <EditableText value={project.name} label="プロジェクト名" onChange={(value) => onUpdate(project.id, { name: value })} className="text-lg font-semibold text-white" />
          <StatusPill project={project} />
        </div>

        <EditableTextarea value={project.objective} label="詳細" onChange={(value) => onUpdate(project.id, { objective: value })} />

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">優先スコア</p>
            <p className="mt-1 text-4xl font-semibold text-sky-100">{getPriorityScore(project)}</p>
          </div>
          <div className="w-28">
            <label className="text-xs text-slate-500" htmlFor={`progress-${project.id}`}>進捗</label>
            <input id={`progress-${project.id}`} type="number" min="0" max="100" value={project.progress} onChange={(event) => onUpdate(project.id, { progress: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-right text-sm text-slate-100 outline-none focus:border-sky-200/60" />
          </div>
        </div>

        <ScoreBreakdown project={project} />

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <EditableInfo label="責任者" value={project.owner} onChange={(value) => onUpdate(project.id, { owner: value })} />
          <ProjectDueDateEditor value={project.dueDate} onChange={(value) => onUpdate(project.id, { dueDate: value })} />
          <EditableInfo label="現在のボール" value={project.currentBallHolder} onChange={(value) => onUpdate(project.id, { currentBallHolder: value, ballHolderType: inferBallHolderType(value) })} />
          <EditableInfo label="保持時間" value={String(project.ballHoldingDays)} type="number" suffix="日" onChange={(value) => onUpdate(project.id, { ballHoldingDays: Number(value) })} />
        </div>

        <div className="mt-4">
          <EditableText value={project.nextMilestone} label="次のマイルストーン" onChange={(value) => onUpdate(project.id, { nextMilestone: value })} className="text-sm text-slate-200" />
        </div>

        <div className="mt-4 grid gap-2">
          <Link href={projectScheduleHref(project)} className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-4 py-3 text-center text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]">
            タスクを見る
          </Link>
          <Link href={projectTaskMapHref(project)} className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] hover:text-sky-100">
            タスクフローマップ
          </Link>
          <button type="button" onClick={() => onCreateTask(project)} className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
            ＋ タスクを追加
          </button>
        </div>
      </section>

    </aside>
  );
}

function CreateProjectDrawer({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreateProjectInput) => void;
}) {
  const [input, setInput] = useState<CreateProjectInput>({
    name: "",
    objective: "",
    dueDate: todayOffset(7),
    owner: "あなた",
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!input.name.trim()) {
      return;
    }

    onCreate({ ...input, name: input.name.trim() });
  }

  return (
    <Drawer title="プロジェクトを作成" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="プロジェクト名" value={input.name} onChange={(value) => setInput((current) => ({ ...current, name: value }))} autoFocus />
        <Field label="詳細" value={input.objective} onChange={(value) => setInput((current) => ({ ...current, objective: value }))} textarea />
        <ProjectDueDateField value={input.dueDate} onChange={(value) => setInput((current) => ({ ...current, dueDate: value }))} />
        <Field label="責任者" value={input.owner} onChange={(value) => setInput((current) => ({ ...current, owner: value }))} />
        <button type="submit" className="w-full rounded-md border border-sky-200/35 bg-sky-200/[0.1] px-4 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.16]">
          作成する
        </button>
      </form>
    </Drawer>
  );
}

function CreateTaskDrawer({
  projects,
  initialProjectName,
  onClose,
  onCreate,
}: {
  projects: PortfolioProject[];
  initialProjectName?: string;
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void;
}) {
  const [input, setInput] = useState<CreateTaskInput>({
    title: "",
    project: initialProjectName ?? projects[0]?.name ?? "",
    owner: "あなた",
    currentBallHolder: "あなた",
    dueDate: todayOffset(1),
    priority: "medium",
    nextAction: "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!input.title.trim() || !input.project) {
      return;
    }

    onCreate({ ...input, title: input.title.trim() });
  }

  return (
    <Drawer title="タスクを作成" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="タスク名" value={input.title} onChange={(value) => setInput((current) => ({ ...current, title: value }))} autoFocus />
        <label className="block text-sm text-slate-300">
          所属プロジェクト
          <select value={input.project} onChange={(event) => setInput((current) => ({ ...current, project: event.target.value }))} className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-200/60">
            {projects.map((project) => (
              <option key={project.id} value={project.name}>{project.name}</option>
            ))}
          </select>
        </label>
        <Field label="担当者" value={input.owner} onChange={(value) => setInput((current) => ({ ...current, owner: value }))} />
        <Field label="現在のボール" value={input.currentBallHolder} onChange={(value) => setInput((current) => ({ ...current, currentBallHolder: value }))} />
        <Field label="期限" type="date" value={input.dueDate} onChange={(value) => setInput((current) => ({ ...current, dueDate: value }))} />
        <label className="block text-sm text-slate-300">
          優先順位
          <select value={input.priority} onChange={(event) => setInput((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className="mt-2 w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-200/60">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        <Field label="次のアクション" value={input.nextAction} onChange={(value) => setInput((current) => ({ ...current, nextAction: value }))} textarea />
        <button type="submit" className="w-full rounded-md border border-sky-200/35 bg-sky-200/[0.1] px-4 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.16]">
          作成する
        </button>
      </form>
    </Drawer>
  );
}

function ProjectContextMenu({
  project,
  onEdit,
  onCreateTask,
  onDelete,
  onDuplicate,
  onClose,
}: {
  project: PortfolioProject;
  onEdit: () => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDelete: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
  onClose: () => void;
}) {
  return (
    <div data-project-menu-root className="absolute right-3 top-12 z-50 w-40 rounded-lg border border-white/10 bg-slate-950/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <Link href={projectTaskMapHref(project)} className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]">タスクフローマップ</Link>
      <button type="button" onClick={() => { onEdit(); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">編集</button>
      <button type="button" onClick={() => { onCreateTask(project); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">タスクを追加</button>
      <button type="button" onClick={() => { onDuplicate(project); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">複製</button>
      <button type="button" onClick={() => { onDelete(project); onClose(); }} className="mt-1 block w-full rounded-md border-t border-white/10 px-3 py-2 text-left text-sm text-red-200 hover:bg-red-400/10">削除</button>
    </div>
  );
}

function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <aside
        className="w-full max-w-xl rounded-xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-black/50 md:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]" title="閉じる">
            ×
          </button>
        </div>
        <div className="mt-7">{children}</div>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  type = "text",
  textarea = false,
  autoFocus = false,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  textarea?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      {textarea ? (
        <textarea autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-32 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-100 outline-none focus:border-sky-200/60" />
      ) : (
        <input autoFocus={autoFocus} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-slate-100 outline-none focus:border-sky-200/60" />
      )}
    </label>
  );
}

function ProjectDueDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const mode = isMonthlyProjectDueDate(value) ? "monthly" : "date";

  return (
    <div className="block text-sm text-slate-300">
      <span>期限</span>
      <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr]">
        <select
          value={mode}
          onChange={(event) => {
            onChange(event.target.value === "monthly" ? monthlyProjectDueDate : todayOffset(7));
          }}
          className="min-h-11 rounded-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-slate-100 outline-none focus:border-sky-200/60"
        >
          <option value="date">日付</option>
          <option value="monthly">毎月</option>
        </select>
        {mode === "monthly" ? (
          <div className="flex min-h-11 items-center rounded-md border border-sky-200/25 bg-sky-200/[0.08] px-4 py-2.5 text-sm font-semibold text-sky-100">
            毎月の業務として扱います
          </div>
        ) : (
          <input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-11 w-full rounded-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-slate-100 outline-none focus:border-sky-200/60"
          />
        )}
      </div>
    </div>
  );
}

function ProjectDueDateEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const mode = isMonthlyProjectDueDate(value) ? "monthly" : "date";

  return (
    <label className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] px-2 py-2 transition hover:border-sky-200/35 hover:bg-white/[0.06] focus-within:border-sky-200/70 focus-within:bg-sky-200/[0.06]">
      <span className="text-[10px] text-slate-500">期限</span>
      <span className="mt-1 grid gap-1">
        <select
          value={mode}
          onChange={(event) => {
            onChange(event.target.value === "monthly" ? monthlyProjectDueDate : todayOffset(7));
          }}
          className="min-w-0 rounded-md border border-white/10 bg-slate-950/70 px-2 py-1.5 text-xs font-semibold text-slate-100 outline-none focus:border-sky-200/60"
        >
          <option value="date">日付</option>
          <option value="monthly">毎月</option>
        </select>
        {mode === "monthly" ? (
          <span className="rounded-md border border-sky-200/25 bg-sky-200/[0.08] px-2 py-1.5 text-sm font-semibold text-sky-100">
            毎月
          </span>
        ) : (
          <input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 bg-transparent text-sm font-medium text-slate-200 outline-none focus:text-white"
          />
        )}
      </span>
    </label>
  );
}

function EditableText({
  label,
  value,
  className,
  onChange,
}: {
  label: string;
  value: string;
  className: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block w-full">
      <span className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{label}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">編集可</span>
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 w-full rounded-md border border-white/10 bg-white/[0.045] px-3 py-2 outline-none transition hover:border-sky-200/35 hover:bg-white/[0.06] focus:border-sky-200/70 focus:bg-sky-200/[0.06] ${className}`} />
    </label>
  );
}

function EditableTextarea({
  label,
  value,
  compact = false,
  onChange,
}: {
  label: string;
  value: string;
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{label}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">編集可</span>
      </span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="未設定" className={`${compact ? "min-h-20" : "min-h-24"} mt-2 w-full resize-none rounded-md border border-white/10 bg-white/[0.045] px-3 py-2 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 hover:border-sky-200/35 hover:bg-white/[0.06] focus:border-sky-200/70 focus:bg-sky-200/[0.06]`} />
    </label>
  );
}

function EditableInfo({
  label,
  value,
  type = "text",
  suffix = "",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] px-2 py-2 transition hover:border-sky-200/35 hover:bg-white/[0.06] focus-within:border-sky-200/70 focus-within:bg-sky-200/[0.06]">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="mt-1 flex items-center gap-1">
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-200 outline-none focus:text-white" />
        {suffix ? <span className="text-xs text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

function UndoToast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-200 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <span>{toast.message}</span>
      {toast.undo ? (
        <button type="button" onClick={() => { toast.undo?.(); onClose(); }} className="rounded-md border border-sky-200/30 px-3 py-1 text-sky-100 transition hover:bg-sky-200/[0.12]">
          元に戻す
        </button>
      ) : null}
      <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-200" title="閉じる">×</button>
    </div>
  );
}

function BottomSummary({
  actionableProjects,
  stalledProjects,
  weeklyProgress,
}: {
  actionableProjects: PortfolioProject[];
  stalledProjects: PortfolioProject[];
  weeklyProgress: number;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <SummaryBlock title="今日のフォーカス">
        {actionableProjects.length > 0 ? actionableProjects.slice(0, 2).map((project) => <SummaryLine key={project.id} project={project} />) : <p className="text-sm text-slate-500">今すぐ自分が動くプロジェクトはありません。</p>}
      </SummaryBlock>
      <SummaryBlock title="停滞しているプロジェクト">
        {stalledProjects.length > 0 ? stalledProjects.map((project) => <SummaryLine key={project.id} project={project} />) : <p className="text-sm text-slate-500">停滞中のプロジェクトはありません。</p>}
      </SummaryBlock>
      <SummaryBlock title="今週の進捗サマリー">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-semibold text-white">{weeklyProgress}%</p>
            <p className="mt-1 text-sm text-slate-500">平均進捗</p>
          </div>
          <p className="max-w-[12rem] text-sm leading-6 text-slate-400">自分のボールを先に返すと、全体の流れが最も早く改善します。</p>
        </div>
      </SummaryBlock>
    </section>
  );
}

function ScoreBreakdown({ project }: { project: PortfolioProject }) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-black/18 p-3">
      {getPriorityBreakdown(project).map((part) => (
        <div key={part.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">{part.label}</span>
          <span className={part.value > 0 ? "font-semibold text-slate-100" : "text-slate-600"}>+{part.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ project }: { project: PortfolioProject }) {
  const tone =
    project.status === "stalled"
      ? "border-red-300/30 bg-red-300/10 text-red-100"
      : project.status === "waiting" || project.status === "attention"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
        : project.status === "done"
          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          : project.status === "ai-processing"
            ? "border-violet-300/25 bg-violet-300/10 text-violet-100"
            : "border-white/10 bg-white/[0.045] text-slate-300";

  return <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${tone}`}>{getPortfolioStatusLabel(project.status)}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/56 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/[0.035] px-2 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-slate-200">{value}</p>
    </div>
  );
}

function SummaryBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/56 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function SummaryLine({ project }: { project: PortfolioProject }) {
  return (
    <Link href={projectScheduleHref(project)} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm transition hover:border-sky-200/40 hover:bg-white/[0.06]">
      <span className="truncate text-slate-200">{project.name}</span>
      <span className="shrink-0 text-xs text-slate-500">{project.currentBallHolder} / {project.ballHoldingDays}日</span>
    </Link>
  );
}

type CreateProjectInput = {
  name: string;
  objective: string;
  dueDate: string;
  owner: string;
};

type CreateTaskInput = {
  title: string;
  project: string;
  owner: string;
  currentBallHolder: string;
  dueDate: string;
  priority: TaskPriority;
  nextAction: string;
};

function projectScheduleHref(project: PortfolioProject) {
  return `/tasks/projects?project=${encodeURIComponent(project.name)}`;
}

function projectTaskMapHref(project: PortfolioProject) {
  return `/tasks/projects/${encodeURIComponent(project.name)}/map?view=map`;
}

function normalizeProjectConnections(value: unknown): ProjectConnection[] {
  if (!Array.isArray(value)) {
    return defaultProjectConnections;
  }

  const seen = new Set<string>();

  return value
    .filter((connection): connection is ProjectConnection => {
      if (
        !connection ||
        typeof connection !== "object" ||
        !("sourceId" in connection) ||
        !("targetId" in connection) ||
        typeof connection.sourceId !== "string" ||
        typeof connection.targetId !== "string" ||
        connection.sourceId === connection.targetId
      ) {
        return false;
      }

      const key = `${connection.sourceId}:${connection.targetId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function readTasks() {
  const saved = window.localStorage.getItem(taskStorageKey);
  return saved ? normalizeTaskList(JSON.parse(saved)) : initialTasks;
}

function writeTasks(tasks: Task[]) {
  void saveSyncedState(taskStorageKey, taskRemoteStorageKey, tasks);
}

function syncPortfolioProjectsWithTasks(
  currentProjects: PortfolioProject[],
  tasks: Task[],
) {
  const activeTasks = tasks.filter((task) => task.status !== "archived");
  const taskGroups = new Map<string, Task[]>();

  for (const task of activeTasks) {
    const projectName = task.project.trim();

    if (!projectName) {
      continue;
    }

    const group = taskGroups.get(projectName) ?? [];
    group.push(task);
    taskGroups.set(projectName, group);
  }

  const projectsByName = new Map(
    currentProjects.map((project) => [project.name, project]),
  );
  const syncedProjects: PortfolioProject[] = [];
  Array.from(taskGroups.entries())
    .forEach(([projectName, projectTasks], index) => {
      const baseProject = projectsByName.get(projectName);
      const syncedProject = deriveProjectFromTasks(
        projectName,
        projectTasks,
        baseProject,
        index,
      );

      syncedProjects.push(syncedProject);
    });

  const taskProjectNames = new Set(taskGroups.keys());
  const manualProjectsWithoutTasks = currentProjects.filter(
    (project) => project.origin === "manual" && !taskProjectNames.has(project.name),
  );

  return [...syncedProjects, ...manualProjectsWithoutTasks].map((project, index) => ({
    ...project,
    rank: index + 1,
  }));
}

function deriveProjectFromTasks(
  projectName: string,
  projectTasks: Task[],
  baseProject: PortfolioProject | undefined,
  index: number,
): PortfolioProject {
  const sortedTasks = [...projectTasks].sort((left, right) => {
    const leftOverdue = left.status !== "done" && isOverdue(left.dueDate) ? -1 : 0;
    const rightOverdue = right.status !== "done" && isOverdue(right.dueDate) ? -1 : 0;

    if (leftOverdue !== rightOverdue) {
      return leftOverdue - rightOverdue;
    }

    return left.dueDate.localeCompare(right.dueDate);
  });
  const incompleteTasks = sortedTasks.filter((task) => task.status !== "done");
  const leadTask = incompleteTasks[0] ?? sortedTasks[0];
  const overdueCount = incompleteTasks.filter((task) => isOverdue(task.dueDate)).length;
  const progress = Math.round(
    projectTasks.reduce((total, task) => total + task.progress, 0) /
      Math.max(projectTasks.length, 1),
  );
  const currentBallHolder =
    leadTask?.currentBallHolder || baseProject?.currentBallHolder || "なし";
  const ballHolderType = inferBallHolderType(currentBallHolder);
  const dueDate = isMonthlyProjectDueDate(baseProject?.dueDate ?? "")
    ? monthlyProjectDueDate
    : leadTask?.dueDate ||
      baseProject?.dueDate ||
      projectTasks
        .map((task) => task.dueDate)
        .filter(Boolean)
        .sort()[0] ||
      "";
  const allDone =
    projectTasks.length > 0 && projectTasks.every((task) => task.status === "done");
  const status =
    allDone || progress >= 100
      ? "done"
      : overdueCount > 0
        ? "stalled"
        : ballHolderType === "ai"
          ? "ai-processing"
          : ballHolderType === "customer" || ballHolderType === "member"
            ? "waiting"
            : "healthy";

  return {
    id: baseProject?.id ?? projectIdFromName(projectName),
    origin: baseProject?.origin ?? "task",
    rank: baseProject?.rank ?? index + 1,
    name: projectName,
    objective:
      baseProject?.objective || leadTask?.description || "タスクから自動で同期されたプロジェクトです。",
    owner: baseProject?.owner || leadTask?.owner || "未設定",
    dueDate,
    currentBallHolder,
    ballHolderType,
    ballHoldingDays: getBallHoldingDays(leadTask?.ballHoldingStartedAt),
    progress: clamp(progress, 0, 100),
    status,
    stalledCount: overdueCount,
    deadlineRisk: overdueCount > 0 ? "critical" : "none",
    businessImportance: baseProject?.businessImportance ?? 8,
    downstreamImpact: baseProject?.downstreamImpact ?? Math.min(projectTasks.length * 4, 24),
    dueImpact: baseProject?.dueImpact ?? (overdueCount > 0 ? 24 : 8),
    nextMilestone: baseProject?.nextMilestone || leadTask?.nextAction || "次のタスクを確認する",
    aiSuggestion: baseProject?.aiSuggestion,
    risk: baseProject?.risk,
    x: baseProject?.x ?? 120 + ((index * 180) % 820),
    y: baseProject?.y ?? 120 + ((index * 110) % 420),
  };
}

function haveSameProjects(left: PortfolioProject[], right: PortfolioProject[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((project, index) => {
    const nextProject = right[index];

    return (
      nextProject &&
      project.id === nextProject.id &&
      project.origin === nextProject.origin &&
      project.rank === nextProject.rank &&
      project.name === nextProject.name &&
      project.progress === nextProject.progress &&
      project.status === nextProject.status &&
      project.currentBallHolder === nextProject.currentBallHolder &&
      project.ballHolderType === nextProject.ballHolderType &&
      project.ballHoldingDays === nextProject.ballHoldingDays &&
      project.stalledCount === nextProject.stalledCount &&
      project.deadlineRisk === nextProject.deadlineRisk &&
      project.dueDate === nextProject.dueDate &&
      project.owner === nextProject.owner
    );
  });
}

function projectIdFromName(name: string) {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return `task-project-${Math.abs(hash).toString(36)}`;
}

function getBallHoldingDays(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const startedAt = new Date(`${value}T00:00:00`);

  if (Number.isNaN(startedAt.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function inferBallHolderType(value: string): BallHolderType {
  if (value === "あなた") {
    return "self";
  }

  if (value === "AI") {
    return "ai";
  }

  if (value === "顧客") {
    return "customer";
  }

  if (!value || value === "なし") {
    return "none";
  }

  return "member";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
