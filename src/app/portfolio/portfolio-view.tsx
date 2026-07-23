"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from "react";
import {
  filterPortfolioProjects,
  getPortfolioStatusLabel,
  getPriorityBreakdown,
  getPriorityScore,
  normalizePortfolioProjects,
  portfolioFilters,
  portfolioProjects,
  portfolioStorageKey,
  type BallHolderType,
  type PortfolioFilter,
  type PortfolioProject,
} from "@/lib/portfolio-data";
import {
  initialTasks,
  normalizeTasks,
  storageKey as taskStorageKey,
  todayOffset,
  type Task,
  type TaskPriority,
} from "@/app/tasks/task-data";
import { addTrashItem, createTrashDates, removeTrashItem } from "@/lib/trash-data";

type DrawerState =
  | { type: "project" }
  | { type: "task"; projectName?: string }
  | null;
type ToastState = { message: string; undo?: () => void } | null;
type ProjectConnection = { sourceId: string; targetId: string };
type SaveState =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "error"
  | "offline"
  | "retrying";

const viewStorageKey = "ai-work-os:portfolio-view-state:v1";
const connectionStorageKey = "ai-work-os:portfolio-connections:v1";
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
  const [expandedScoreId, setExpandedScoreId] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [highlightId, setHighlightId] = useState("");
  const [menuProjectId, setMenuProjectId] = useState("");
  const [projectConnections, setProjectConnections] = useState<ProjectConnection[]>(defaultProjectConnections);
  const [portfolioTasks, setPortfolioTasks] = useState<Task[]>(initialTasks);
  const inspectorTriggerRef = useRef<HTMLElement | null>(null);
  const closeInspector = useCallback(() => setIsInspectorOpen(false), []);

  useEffect(() => {
    const savedProjects = window.localStorage.getItem(portfolioStorageKey);
    const savedView = window.localStorage.getItem(viewStorageKey);
    const savedConnections = window.localStorage.getItem(connectionStorageKey);

    if (savedProjects) {
      try {
        setProjects(normalizePortfolioProjects(JSON.parse(savedProjects)));
      } catch {
        window.localStorage.removeItem(portfolioStorageKey);
      }
    }

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

    if (savedConnections) {
      try {
        setProjectConnections(normalizeProjectConnections(JSON.parse(savedConnections)));
      } catch {
        window.localStorage.removeItem(connectionStorageKey);
      }
    }

    try {
      setPortfolioTasks(readTasks());
    } catch {
      window.localStorage.removeItem(taskStorageKey);
      setPortfolioTasks(initialTasks);
    }

    setHasLoadedProjects(true);
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
    if (!hasLoadedProjects) {
      return;
    }

    if (!window.navigator.onLine) {
      setSaveState("offline");
      return;
    }

    setSaveState("pending");
    const timeout = window.setTimeout(() => {
      setSaveState("saving");

      try {
        window.localStorage.setItem(portfolioStorageKey, JSON.stringify(projects));
        window.localStorage.setItem(connectionStorageKey, JSON.stringify(projectConnections));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [hasLoadedProjects, projectConnections, projects]);

  useEffect(() => {
    function handleOnline() {
      setSaveState("retrying");

      try {
        window.localStorage.setItem(portfolioStorageKey, JSON.stringify(projects));
        window.localStorage.setItem(connectionStorageKey, JSON.stringify(projectConnections));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }

    function handleOffline() {
      setSaveState("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [projectConnections, projects]);

  useEffect(() => {
    if (!["pending", "saving", "error", "offline"].includes(saveState)) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [saveState]);

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

  function retrySave() {
    if (!window.navigator.onLine) {
      setSaveState("offline");
      return;
    }

    setSaveState("retrying");

    try {
      window.localStorage.setItem(portfolioStorageKey, JSON.stringify(projects));
      window.localStorage.setItem(connectionStorageKey, JSON.stringify(projectConnections));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function updateProject(id: string, patch: Partial<PortfolioProject>) {
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
  }

  function createProject(input: CreateProjectInput) {
    const before = projects;
    const nextProject: PortfolioProject = {
      id: `project-${crypto.randomUUID()}`,
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

  function addProjectConnection(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    setProjectConnections((current) => {
      if (current.some((connection) => connection.sourceId === sourceId && connection.targetId === targetId)) {
        return current;
      }

      return [...current, { sourceId, targetId }];
    });
  }

  function removeProjectConnection(sourceId: string, targetId: string) {
    setProjectConnections((current) =>
      current.filter(
        (connection) =>
          connection.sourceId !== sourceId || connection.targetId !== targetId,
      ),
    );
  }

  return (
    <section className="min-h-screen min-w-0 space-y-5 overflow-x-clip text-slate-100">
      <header className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-200">ポートフォリオ</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
            プロジェクトの流れを俯瞰
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            優先順位と、次に誰が動くべきかを一画面で確認します。
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
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
      </header>

      <TodayFocus
        actionableProjects={actionableProjects}
        priorityProject={rankedProjects[0]}
        stalledProjects={stalledProjects}
        onSelect={setSelectedId}
      />

      <FilterBar active={filter} />

      <div className="portfolio-layout min-w-0 gap-5">
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
            onOpenInspector={(id, trigger) => {
              setSelectedId(id);
              inspectorTriggerRef.current = trigger;
              setIsInspectorOpen(true);
            }}
            onMenuToggle={(id) => setMenuProjectId((current) => (current === id ? "" : id))}
            onSelect={setSelectedId}
          />

          <SelectedProjectWorkspace
            project={selectedProject}
            tasks={selectedProjectTasks}
            onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
          />

          <BottomSummary
            stalledProjects={stalledProjects}
            weeklyProgress={weeklyProgress}
          />
        </div>

        <ResponsiveInspector
          isOpen={isInspectorOpen}
          onClose={closeInspector}
          returnFocusRef={inspectorTriggerRef}
        >
          <ProjectInspector
            project={selectedProject}
            projects={visibleProjects}
            projectConnections={projectConnections}
            saveState={saveState}
            onAddConnection={addProjectConnection}
            onClose={closeInspector}
            onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
            onRemoveConnection={removeProjectConnection}
            onRetrySave={retrySave}
            onUpdate={updateProject}
          />
        </ResponsiveInspector>
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
    <nav aria-label="プロジェクト状態フィルター" className="min-w-0 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/56 p-2 shadow-xl shadow-black/20 backdrop-blur-xl [scrollbar-width:none]">
      <div className="flex min-w-max flex-nowrap gap-2">
        {portfolioFilters.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/portfolio" : `/portfolio?filter=${item.id}`}
            className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-2 text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200 ${
              active === item.id
                ? "border-sky-200/60 bg-sky-200/12 text-sky-50"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function TodayFocus({
  actionableProjects,
  priorityProject,
  stalledProjects,
  onSelect,
}: {
  actionableProjects: PortfolioProject[];
  priorityProject?: PortfolioProject;
  stalledProjects: PortfolioProject[];
  onSelect: (id: string) => void;
}) {
  const focusProject = actionableProjects[0] ?? priorityProject;
  const stalledProject = stalledProjects[0];

  return (
    <section className="min-w-0 rounded-lg border border-sky-200/20 bg-sky-200/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-200">今日のフォーカス</p>
          <h2 className="mt-1 text-base font-semibold text-white">
            今日返すべきボール：{actionableProjects.length}件
          </h2>
          <p className="mt-1 line-clamp-2 break-words text-sm text-slate-400">
            {focusProject
              ? `最優先：${focusProject.name}「${focusProject.nextMilestone}」`
              : "今日対応が必要なプロジェクトはありません。"}
          </p>
        </div>
        <div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {focusProject ? (
            <button
              type="button"
              onClick={() => onSelect(focusProject.id)}
              className="shrink-0 whitespace-nowrap rounded-md border border-sky-200/35 bg-sky-200/[0.09] px-3 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.15] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200"
            >
              最優先を選択
            </button>
          ) : null}
          {stalledProject ? (
            <button
              type="button"
              onClick={() => onSelect(stalledProject.id)}
              className="shrink-0 whitespace-nowrap rounded-md border border-red-300/25 px-3 py-2 text-sm text-red-100 transition hover:bg-red-300/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-200"
            >
              停滞案件を確認
            </button>
          ) : null}
        </div>
      </div>
    </section>
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
  onOpenInspector,
  onMenuToggle,
  onCreateProject,
  onCreateTask,
  onDelete,
  onDuplicate,
}: {
  projects: PortfolioProject[];
  selectedId?: string;
  expandedScoreId: string;
  highlightId: string;
  menuProjectId: string;
  onSelect: (id: string) => void;
  onExpandScore: (id: string) => void;
  onOpenInspector: (id: string, trigger: HTMLElement) => void;
  onMenuToggle: (id: string) => void;
  onCreateProject: () => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDelete: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"priority" | "due">("priority");
  const displayedProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja");
    const filtered = normalizedQuery
      ? projects.filter((project) =>
          [project.name, project.owner, project.currentBallHolder]
            .join(" ")
            .toLocaleLowerCase("ja")
            .includes(normalizedQuery),
        )
      : projects;

    return [...filtered].sort((a, b) =>
      sort === "due"
        ? (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")
        : getPriorityScore(b) - getPriorityScore(a),
    );
  }, [projects, query, sort]);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/62 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex min-w-0 flex-col gap-3 border-b border-white/10 px-4 py-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">プロジェクト一覧</h2>
          <p className="mt-1 text-sm text-slate-500">カードで選択し、編集は「詳細」からInspectorで行います。</p>
        </div>
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as "priority" | "due")}
            aria-label="プロジェクトの並び順"
            className="min-w-0 shrink-0 rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none focus:border-sky-200/60"
          >
            <option value="priority">優先度順</option>
            <option value="due">期限順</option>
          </select>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="プロジェクトを検索"
            aria-label="プロジェクトを検索"
            className="w-44 min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-600 focus:border-sky-200/60"
          />
        </div>
      </div>
      <div className="flex min-w-0 gap-3 overflow-x-auto p-3 [scrollbar-width:thin]">
        {displayedProjects.map((project, index) => {
          const score = getPriorityScore(project);
          const isSelected = project.id === selectedId;
          const isExpanded = project.id === expandedScoreId;
          const menuOpen = project.id === menuProjectId;

          return (
            <article
              key={project.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${project.name}を選択`}
              onClick={() => onSelect(project.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(project.id);
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onMenuToggle(project.id);
              }}
              className={`relative min-h-[218px] w-[286px] shrink-0 cursor-pointer rounded-lg border p-4 pl-5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 ${
                project.id === highlightId
                  ? "border-sky-200/75 bg-sky-200/[0.12]"
                  : isSelected
                    ? "border-sky-200/65 bg-sky-200/[0.09] shadow-lg shadow-sky-950/25"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${isSelected ? "bg-sky-200" : "bg-transparent"}`}
              />
              <div className="min-w-0">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-1 line-clamp-2 min-h-10 break-words text-[15px] font-semibold leading-5 text-white" title={project.name}>
                      {project.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      onExpandScore(isExpanded ? "" : project.id);
                    }}
                    className="shrink-0 rounded-md border border-sky-200/20 bg-sky-200/[0.06] px-2.5 py-1.5 text-right transition hover:bg-sky-200/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200"
                    title="優先スコアの内訳を表示"
                  >
                    <span className="block text-[10px] text-slate-500">優先</span>
                    <span className="block text-lg font-semibold leading-5 text-sky-100">{score}</span>
                  </button>
                </div>

                <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs text-slate-400" title={`${project.currentBallHolder}が保持中`}>
                    <BallDot type={project.ballHolderType} /> {project.currentBallHolder}が保持中
                  </p>
                  <StatusPill project={project} />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>進捗 {project.progress}%</span>
                    <span className="shrink-0 text-slate-500">期限 {formatDateLabel(project.dueDate)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-sky-200 transition-all duration-300" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{project.ballHoldingDays}日保持</span>
                  {isSelected ? <span className="font-semibold text-sky-100">選択中</span> : <span>クリックで選択</span>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={(event) => onOpenInspector(project.id, event.currentTarget)}
                  className="whitespace-nowrap rounded-md border border-white/10 px-3 py-2 text-center text-xs font-semibold text-slate-200 transition hover:border-sky-200/45 hover:text-sky-100"
                >
                  詳細
                </button>
                <Link href={projectTaskMapHref(project)} className="whitespace-nowrap rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-center text-xs font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]">
                  フローマップ
                </Link>
                <button type="button" data-project-menu-trigger aria-label={`${project.name}の操作メニュー`} onClick={() => onMenuToggle(project.id)} className="whitespace-nowrap rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100" title="操作メニュー">
                  …
                </button>
              </div>

              {menuOpen ? (
                <ProjectContextMenu
                  project={project}
                  onCreateTask={onCreateTask}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onEdit={() => {
                    onSelect(project.id);
                    onOpenInspector(
                      project.id,
                      document.activeElement instanceof HTMLElement
                        ? document.activeElement
                        : document.body,
                    );
                  }}
                  onClose={() => onMenuToggle(project.id)}
                />
              ) : null}

              {isExpanded ? (
                <div className="absolute right-3 top-10 z-40 w-64" onClick={(event) => event.stopPropagation()}>
                  <ScoreBreakdown project={project} floating onClose={() => onExpandScore("")} />
                </div>
              ) : null}
            </article>
          );
        })}
        <button
          type="button"
          onClick={onCreateProject}
          className="flex min-h-[218px] w-[210px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.025] p-4 text-center transition duration-200 hover:border-sky-200/40 hover:bg-sky-200/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200"
        >
          <span className="text-3xl font-light text-slate-300">＋</span>
          <span className="mt-3 text-sm font-semibold text-white">新しいプロジェクト</span>
          <span className="mt-2 text-xs text-slate-500">プロジェクトを追加</span>
        </button>
        {displayedProjects.length === 0 ? (
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
    <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/62 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex min-w-0 flex-col gap-4 border-b border-white/10 px-4 py-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-nowrap items-center gap-2">
            <h2 className="min-w-0 truncate text-xl font-semibold text-white" title={project.name}>{project.name}</h2>
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
        <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {["フローマップ", "タスク一覧", "ドキュメント", "メモ", "履歴"].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-2 text-sm transition ${
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
            className="shrink-0 whitespace-nowrap rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            ＋ タスクを追加
          </button>
        </div>
      </div>

      <div className="portfolio-task-grid grid min-w-0 gap-4 p-4">
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

function formatDateLabel(value: string) {
  if (!value) {
    return "期限なし";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function ResponsiveInspector({
  children,
  isOpen,
  onClose,
  returnFocusRef,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 1439px)").matches) {
      return;
    }

    const panel = panelRef.current;
    const returnFocusTarget = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    window.requestAnimationFrame(() => {
      panel?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const focusable = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => !element.hasAttribute("disabled"),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusTarget?.focus();
    };
  }, [isOpen, onClose, returnFocusRef]);

  return (
    <>
      <button
        type="button"
        aria-label="Inspectorを閉じる"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
        className={`portfolio-inspector-backdrop ${isOpen ? "is-open" : ""}`}
      />
      <div
        ref={panelRef}
        className={`portfolio-inspector-shell ${isOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal={isOpen ? true : undefined}
        aria-label="プロジェクトInspector"
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  );
}

function ProjectInspector({
  project,
  projects,
  projectConnections,
  saveState,
  onAddConnection,
  onClose,
  onRemoveConnection,
  onRetrySave,
  onUpdate,
  onCreateTask,
}: {
  project?: PortfolioProject;
  projects: PortfolioProject[];
  projectConnections: ProjectConnection[];
  saveState: SaveState;
  onAddConnection: (sourceId: string, targetId: string) => void;
  onClose: () => void;
  onRemoveConnection: (sourceId: string, targetId: string) => void;
  onRetrySave: () => void;
  onUpdate: (id: string, patch: Partial<PortfolioProject>) => void;
  onCreateTask: (project: PortfolioProject) => void;
}) {
  if (!project) {
    return null;
  }

  return (
    <aside className="min-w-0 space-y-4">
      <header className="sticky top-0 z-20 rounded-lg border border-white/10 bg-slate-950/95 p-4 shadow-xl shadow-black/30 backdrop-blur-xl">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sky-200">プロジェクトInspector</p>
            <h2 className="mt-1 truncate text-base font-semibold text-white" title={project.name}>{project.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="portfolio-inspector-close h-9 w-9 shrink-0 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200"
            aria-label="Inspectorを閉じる"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <StatusPill project={project} />
          <SaveStatus state={saveState} onRetry={onRetrySave} />
        </div>
      </header>

      <section className="min-w-0 rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
        <div className="mb-4 border-b border-white/10 pb-4">
          <p className="text-sm font-semibold text-white">プロジェクト編集</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">変更は入力停止後に自動保存されます。</p>
        </div>

        <div className="flex min-w-0 items-start justify-between gap-3">
          <EditableText value={project.name} label="プロジェクト名" onChange={(value) => onUpdate(project.id, { name: value })} className="text-lg font-semibold text-white" />
        </div>

        <EditableTextarea value={project.objective} label="目的" onChange={(value) => onUpdate(project.id, { objective: value })} />

        <div className="mt-4 flex min-w-0 items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">優先スコア</p>
            <p className="mt-1 text-4xl font-semibold text-sky-100">{getPriorityScore(project)}</p>
          </div>
          <div className="w-28 shrink-0">
            <label className="text-xs text-slate-500" htmlFor={`progress-${project.id}`}>進捗</label>
            <input id={`progress-${project.id}`} type="number" min="0" max="100" value={project.progress} onChange={(event) => onUpdate(project.id, { progress: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-right text-sm text-slate-100 outline-none focus:border-sky-200/60" />
          </div>
        </div>

        <ScoreBreakdown project={project} />

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 text-xs">
          <EditableInfo label="責任者" value={project.owner} onChange={(value) => onUpdate(project.id, { owner: value })} />
          <EditableInfo label="期限" value={project.dueDate} type="date" onChange={(value) => onUpdate(project.id, { dueDate: value })} />
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

      <ProjectConnectionEditor
        connections={projectConnections}
        project={project}
        projects={projects}
        onAddConnection={onAddConnection}
        onRemoveConnection={onRemoveConnection}
      />

      <section className="rounded-lg border border-sky-200/15 bg-sky-200/[0.06] p-4 shadow-xl shadow-black/20">
        <p className="text-sm font-semibold text-sky-100">AIインサイト</p>
        <EditableTextarea value={project.aiSuggestion ?? ""} label="AIインサイト" onChange={(value) => onUpdate(project.id, { aiSuggestion: value })} compact />
      </section>

      <section className="rounded-lg border border-red-300/20 bg-red-300/[0.04] p-4 shadow-xl shadow-black/20">
        <p className="text-sm font-semibold text-red-100">リスク情報</p>
        <EditableTextarea value={project.risk ?? ""} label="リスク情報" onChange={(value) => onUpdate(project.id, { risk: value })} compact />
      </section>
    </aside>
  );
}

function ProjectConnectionEditor({
  project,
  projects,
  connections,
  onAddConnection,
  onRemoveConnection,
}: {
  project: PortfolioProject;
  projects: PortfolioProject[];
  connections: ProjectConnection[];
  onAddConnection: (sourceId: string, targetId: string) => void;
  onRemoveConnection: (sourceId: string, targetId: string) => void;
}) {
  const candidates = projects.filter((item) => item.id !== project.id);
  const outgoingConnections = connections.filter((connection) => connection.sourceId === project.id);
  const incomingConnections = connections.filter((connection) => connection.targetId === project.id);
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? "");

  useEffect(() => {
    if (!candidates.some((candidate) => candidate.id === targetId)) {
      setTargetId(candidates[0]?.id ?? "");
    }
  }, [candidates, targetId]);

  function getProjectName(id: string) {
    return projects.find((item) => item.id === id)?.name ?? "不明なプロジェクト";
  }

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">プロジェクトのつながり</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            このプロジェクトから次に流れるプロジェクトを指定します。
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="text-xs text-slate-500" htmlFor={`connection-${project.id}`}>
          後続プロジェクトを追加
        </label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            id={`connection-${project.id}`}
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-200/60"
          >
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onAddConnection(project.id, targetId)}
            className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-3 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            つなぐ
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {outgoingConnections.length > 0 ? (
          outgoingConnections.map((connection) => (
            <div key={`${connection.sourceId}-${connection.targetId}`} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
              <span className="min-w-0 truncate text-sm text-slate-200">
                → {getProjectName(connection.targetId)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveConnection(connection.sourceId, connection.targetId)}
                className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
              >
                外す
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-white/10 px-3 py-3 text-sm text-slate-500">
            後続プロジェクトはまだありません。
          </p>
        )}
      </div>

      {incomingConnections.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs text-slate-500">このプロジェクトへ流れてくるもの</p>
          <div className="mt-2 space-y-1">
            {incomingConnections.map((connection) => (
              <p key={`${connection.sourceId}-${connection.targetId}`} className="truncate text-xs text-slate-400">
                ← {getProjectName(connection.sourceId)}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
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
        <Field label="目的" value={input.objective} onChange={(value) => setInput((current) => ({ ...current, objective: value }))} textarea />
        <Field label="期限" type="date" value={input.dueDate} onChange={(value) => setInput((current) => ({ ...current, dueDate: value }))} />
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
        className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]" title="閉じる">
            ×
          </button>
        </div>
        <div className="mt-6">{children}</div>
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
        <textarea autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100 outline-none focus:border-sky-200/60" />
      ) : (
        <input autoFocus={autoFocus} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-100 outline-none focus:border-sky-200/60" />
      )}
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
  stalledProjects,
  weeklyProgress,
}: {
  stalledProjects: PortfolioProject[];
  weeklyProgress: number;
}) {
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-2">
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

function ScoreBreakdown({
  project,
  floating = false,
  onClose,
}: {
  project: PortfolioProject;
  floating?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className={`${floating ? "shadow-2xl shadow-black/45" : "mt-3"} space-y-2 rounded-md border border-white/10 bg-slate-950/95 p-3 backdrop-blur-xl`}>
      {floating ? (
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
          <span className="text-xs font-semibold text-slate-200">優先スコア</span>
          <span className="flex items-center gap-2">
            <span className="text-lg font-semibold text-sky-100">{getPriorityScore(project)}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="優先スコア内訳を閉じる"
              className="h-7 w-7 rounded-md border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              ×
            </button>
          </span>
        </div>
      ) : null}
      {getPriorityBreakdown(project).map((part) => (
        <div key={part.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">{part.label}</span>
          <span className={part.value > 0 ? "font-semibold text-slate-100" : "text-slate-600"}>+{part.value}</span>
        </div>
      ))}
    </div>
  );
}

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const labels: Record<SaveState, string> = {
    idle: "未変更",
    pending: "保存待ち",
    saving: "保存中…",
    saved: "保存済み",
    error: "保存に失敗",
    offline: "オフライン",
    retrying: "再試行中…",
  };
  const isError = state === "error" || state === "offline";

  return (
    <span className="flex shrink-0 items-center gap-2 text-xs" role="status" aria-live="polite">
      <span className={isError ? "text-red-200" : state === "saved" ? "text-emerald-200" : "text-slate-400"}>
        {labels[state]}
      </span>
      {isError ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-white/10 px-2 py-1 text-slate-200 transition hover:bg-white/[0.06]"
        >
          再試行
        </button>
      ) : null}
    </span>
  );
}

function BallDot({ type }: { type: BallHolderType }) {
  const tone =
    type === "self"
      ? "bg-sky-300"
      : type === "ai"
        ? "bg-violet-300"
        : type === "none"
          ? "bg-slate-500"
          : "bg-amber-300";

  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
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
  return saved ? normalizeTasks(JSON.parse(saved)) : initialTasks;
}

function writeTasks(tasks: Task[]) {
  window.localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
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
