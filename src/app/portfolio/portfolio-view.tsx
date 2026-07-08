"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
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

type Point = { x: number; y: number };
type PanState = { start: Point; origin: Point } | null;
type NodePositions = Record<string, Point>;
type NodeDragState = {
  id: string;
  start: Point;
  origin: Point;
} | null;
type DrawerState =
  | { type: "project" }
  | { type: "task"; projectName?: string }
  | null;
type ToastState = { message: string; undo?: () => void } | null;

const boardSize = { width: 1240, height: 620 };
const nodeSize = { width: 236, height: 120 };
const layoutStorageKey = "ai-work-os:portfolio-node-layout:v1";
const viewStorageKey = "ai-work-os:portfolio-view-state:v1";

export default function PortfolioView({
  initialFilter,
}: {
  initialFilter: PortfolioFilter;
}) {
  const filter = initialFilter;
  const [projects, setProjects] = useState<PortfolioProject[]>(portfolioProjects);
  const [selectedId, setSelectedId] = useState(portfolioProjects[0]?.id ?? "");
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.94);
  const [panState, setPanState] = useState<PanState>(null);
  const [nodeDragState, setNodeDragState] = useState<NodeDragState>(null);
  const [nodePositions, setNodePositions] = useState<NodePositions>(() =>
    Object.fromEntries(
      portfolioProjects.map((project) => [
        project.id,
        { x: project.x, y: project.y },
      ]),
    ),
  );
  const [expandedScoreId, setExpandedScoreId] = useState(portfolioProjects[0]?.id ?? "");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [highlightId, setHighlightId] = useState("");
  const [menuProjectId, setMenuProjectId] = useState("");

  useEffect(() => {
    const savedProjects = window.localStorage.getItem(portfolioStorageKey);
    const savedLayout = window.localStorage.getItem(layoutStorageKey);
    const savedView = window.localStorage.getItem(viewStorageKey);

    if (savedProjects) {
      try {
        setProjects(normalizePortfolioProjects(JSON.parse(savedProjects)));
      } catch {
        window.localStorage.removeItem(portfolioStorageKey);
      }
    }

    if (savedLayout) {
      try {
        setNodePositions((current) => ({ ...current, ...JSON.parse(savedLayout) }));
      } catch {
        window.localStorage.removeItem(layoutStorageKey);
      }
    }

    if (savedView) {
      try {
        const parsed = JSON.parse(savedView) as {
          selectedId?: string;
          pan?: Point;
          zoom?: number;
          scrollY?: number;
        };

        if (parsed.selectedId) {
          setSelectedId(parsed.selectedId);
        }

        if (parsed.pan) {
          setPan(parsed.pan);
        }

        if (parsed.zoom) {
          setZoom(parsed.zoom);
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
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(portfolioStorageKey, JSON.stringify(projects));
      setSaveState("saved");
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [projects]);

  useEffect(() => {
    window.localStorage.setItem(layoutStorageKey, JSON.stringify(nodePositions));
  }, [nodePositions]);

  useEffect(() => {
    const saveView = () => {
      window.localStorage.setItem(
        viewStorageKey,
        JSON.stringify({ selectedId, pan, zoom, scrollY: window.scrollY }),
      );
    };

    saveView();
    window.addEventListener("beforeunload", saveView);
    window.addEventListener("scroll", saveView, { passive: true });

    return () => {
      window.removeEventListener("beforeunload", saveView);
      window.removeEventListener("scroll", saveView);
    };
  }, [pan, selectedId, zoom]);

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
    const before = projects;
    setProjects((current) =>
      current.map((project) =>
        project.id === id
          ? {
              ...project,
              ...patch,
              progress: clamp(patch.progress ?? project.progress, 0, 100),
            }
          : project,
      ),
    );
    notify("変更を保存しました。", () => setProjects(before));
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
    setNodePositions((current) => ({
      ...current,
      [nextProject.id]: { x: nextProject.x, y: nextProject.y },
    }));
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

    writeTasks([nextTask, ...beforeTasks]);
    setDrawer(null);
    notify("タスクを作成しました。", () => writeTasks(beforeTasks));
  }

  function duplicateProject(project: PortfolioProject) {
    createProject({
      name: `${project.name} の複製`,
      objective: project.objective,
      dueDate: project.dueDate,
      owner: project.owner,
    });
  }

  function archiveProject(project: PortfolioProject) {
    updateProject(project.id, {
      status: "done",
      progress: 100,
      currentBallHolder: "なし",
      ballHolderType: "none",
    });
  }

  function moveCanvas(point: Point) {
    if (!panState || nodeDragState) {
      return;
    }

    setPan({
      x: panState.origin.x + point.x - panState.start.x,
      y: panState.origin.y + point.y - panState.start.y,
    });
  }

  function moveNode(point: Point) {
    if (!nodeDragState) {
      return;
    }

    const dx = (point.x - nodeDragState.start.x) / zoom;
    const dy = (point.y - nodeDragState.start.y) / zoom;

    setNodePositions((current) => ({
      ...current,
      [nodeDragState.id]: {
        x: clamp(nodeDragState.origin.x + dx, 16, boardSize.width - nodeSize.width - 16),
        y: clamp(nodeDragState.origin.y + dy, 16, boardSize.height - nodeSize.height - 16),
      },
    }));
  }

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(1.25, Math.max(0.72, nextZoom)));
  }

  return (
    <section className="min-h-screen space-y-5 text-slate-100">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-200">ポートフォリオ</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
            プロジェクトの流れを俯瞰
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            状況を見た場所から、そのままプロジェクトとタスクを動かします。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:min-w-[560px]">
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

      <FilterBar active={filter} />

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <ProjectList
          expandedScoreId={expandedScoreId}
          highlightId={highlightId}
          menuProjectId={menuProjectId}
          projects={visibleProjects}
          selectedId={selectedProject?.id}
          onArchive={archiveProject}
          onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
          onDuplicate={duplicateProject}
          onExpandScore={setExpandedScoreId}
          onMenuToggle={(id) => setMenuProjectId((current) => (current === id ? "" : id))}
          onSelect={setSelectedId}
        />

        <ProjectFlowMap
          highlightId={highlightId}
          menuProjectId={menuProjectId}
          nodeDragState={nodeDragState}
          nodePositions={nodePositions}
          pan={pan}
          panState={panState}
          projects={visibleProjects}
          selectedId={selectedProject?.id}
          zoom={zoom}
          onArchive={archiveProject}
          onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
          onDuplicate={duplicateProject}
          onMenuToggle={(id) => setMenuProjectId((current) => (current === id ? "" : id))}
          onMoveCanvas={moveCanvas}
          onMoveNode={moveNode}
          onNodeDragEnd={() => setNodeDragState(null)}
          onNodeDragStart={(id, point) => {
            const origin = nodePositions[id] ?? { x: 0, y: 0 };

            setSelectedId(id);
            setNodeDragState({ id, start: point, origin });
          }}
          onPanEnd={() => setPanState(null)}
          onPanStart={(point) => setPanState({ start: point, origin: pan })}
          onSelect={setSelectedId}
          onZoom={updateZoom}
        />

        <ProjectInspector
          project={selectedProject}
          projects={visibleProjects}
          saveState={saveState}
          onCreateTask={(project) => setDrawer({ type: "task", projectName: project.name })}
          onSelect={setSelectedId}
          onUpdate={updateProject}
        />
      </div>

      <BottomSummary
        actionableProjects={actionableProjects}
        stalledProjects={stalledProjects}
        weeklyProgress={weeklyProgress}
      />

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
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/56 p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex min-w-max gap-2">
        {portfolioFilters.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/portfolio" : `/portfolio?filter=${item.id}`}
            className={`rounded-md border px-3 py-2 text-sm transition duration-200 ${
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
  onCreateTask,
  onDuplicate,
  onArchive,
}: {
  projects: PortfolioProject[];
  selectedId?: string;
  expandedScoreId: string;
  highlightId: string;
  menuProjectId: string;
  onSelect: (id: string) => void;
  onExpandScore: (id: string) => void;
  onMenuToggle: (id: string) => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
  onArchive: (project: PortfolioProject) => void;
}) {
  return (
    <aside className="rounded-lg border border-white/10 bg-slate-950/62 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-4">
        <h2 className="text-base font-semibold text-white">プロジェクト一覧</h2>
        <p className="mt-1 text-sm text-slate-500">選択すると右側のInspectorで編集できます。</p>
      </div>
      <div className="max-h-[660px] space-y-2 overflow-y-auto p-3">
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
              className={`relative rounded-lg border p-3 transition duration-200 ${
                project.id === highlightId
                  ? "border-sky-200/75 bg-sky-200/[0.12]"
                  : isSelected
                    ? "border-sky-200/55 bg-sky-200/[0.08]"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelect(project.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-white">
                      {project.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">優先スコア</p>
                    <p className="text-lg font-semibold text-sky-100">{score}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>進捗 {project.progress}%</span>
                    <StatusPill project={project} />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-sky-200 transition-all duration-300" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Info label="担当者" value={project.owner} />
                  <Info label="現在のボール" value={`${project.currentBallHolder} / ${project.ballHoldingDays}日`} />
                </div>
              </button>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Link href={projectScheduleHref(project)} className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-200/50 hover:text-sky-100">
                  開く
                </Link>
                <button type="button" onClick={() => onExpandScore(isExpanded ? "" : project.id)} className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100">
                  内訳を見る
                </button>
                <button type="button" onClick={() => onMenuToggle(project.id)} className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100" title="操作メニュー">
                  …
                </button>
              </div>

              {menuOpen ? (
                <ProjectContextMenu
                  project={project}
                  onArchive={onArchive}
                  onCreateTask={onCreateTask}
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
    </aside>
  );
}

function ProjectFlowMap({
  projects,
  selectedId,
  pan,
  zoom,
  panState,
  nodeDragState,
  nodePositions,
  highlightId,
  menuProjectId,
  onPanStart,
  onPanEnd,
  onMoveCanvas,
  onMoveNode,
  onNodeDragStart,
  onNodeDragEnd,
  onSelect,
  onZoom,
  onMenuToggle,
  onCreateTask,
  onDuplicate,
  onArchive,
}: {
  projects: PortfolioProject[];
  selectedId?: string;
  pan: Point;
  zoom: number;
  panState: PanState;
  nodeDragState: NodeDragState;
  nodePositions: NodePositions;
  highlightId: string;
  menuProjectId: string;
  onPanStart: (point: Point) => void;
  onPanEnd: () => void;
  onMoveCanvas: (point: Point) => void;
  onMoveNode: (point: Point) => void;
  onNodeDragStart: (id: string, point: Point) => void;
  onNodeDragEnd: () => void;
  onSelect: (id: string) => void;
  onZoom: (zoom: number) => void;
  onMenuToggle: (id: string) => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
  onArchive: (project: PortfolioProject) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/48 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">プロジェクトフローマップ</h2>
          <p className="mt-1 text-sm text-slate-500">
            空白をドラッグで移動。ズームはShift+スクロールで操作できます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onZoom(zoom - 0.08)} className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]" title="縮小">
            -
          </button>
          <span className="w-12 text-center text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => onZoom(zoom + 0.08)} className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]" title="拡大">
            +
          </button>
        </div>
      </div>

      <div
        className={`relative h-[660px] overflow-hidden ${panState ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={(event) => {
          if (event.target instanceof HTMLElement && !event.target.closest("article")) {
            onPanStart({ x: event.clientX, y: event.clientY });
          }
        }}
        onPointerMove={(event) => {
          onMoveCanvas({ x: event.clientX, y: event.clientY });
          onMoveNode({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={() => {
          onPanEnd();
          onNodeDragEnd();
        }}
        onPointerCancel={() => {
          onPanEnd();
          onNodeDragEnd();
        }}
        onPointerLeave={() => {
          onPanEnd();
          onNodeDragEnd();
        }}
        onWheel={(event) => {
          if (event.shiftKey && Math.abs(event.deltaY) > 1) {
            event.preventDefault();
            onZoom(zoom - event.deltaY * 0.001);
          }
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.08),transparent_18rem),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />
        <div
          className="absolute left-1/2 top-1/2 origin-center transition-transform duration-200"
          style={{
            width: boardSize.width,
            height: boardSize.height,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {projects.slice(0, -1).map((project, index) => {
              const next = projects[index + 1];
              const source = nodePositions[project.id] ?? project;
              const target = nodePositions[next.id] ?? next;
              const x1 = source.x + nodeSize.width / 2;
              const y1 = source.y + nodeSize.height / 2;
              const x2 = target.x + nodeSize.width / 2;
              const y2 = target.y + nodeSize.height / 2;
              const midX = (x1 + x2) / 2;

              return (
                <path key={`${project.id}-${next.id}`} d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`} fill="none" stroke="rgba(148,163,184,0.22)" strokeLinecap="round" strokeWidth="1.5" />
              );
            })}
          </svg>

          {projects.map((project, index) => (
            <ProjectNode
              dragging={nodeDragState?.id === project.id}
              highlight={project.id === highlightId}
              index={index}
              key={project.id}
              menuOpen={project.id === menuProjectId}
              onArchive={onArchive}
              onCreateTask={onCreateTask}
              onDragEnd={onNodeDragEnd}
              onDragStart={onNodeDragStart}
              onDuplicate={onDuplicate}
              onMenuToggle={onMenuToggle}
              onSelect={onSelect}
              position={nodePositions[project.id] ?? { x: project.x, y: project.y }}
              project={project}
              selected={project.id === selectedId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectNode({
  project,
  selected,
  dragging,
  highlight,
  menuOpen,
  index,
  position,
  onSelect,
  onDragStart,
  onDragEnd,
  onMenuToggle,
  onCreateTask,
  onDuplicate,
  onArchive,
}: {
  project: PortfolioProject;
  selected: boolean;
  dragging: boolean;
  highlight: boolean;
  menuOpen: boolean;
  index: number;
  position: Point;
  onSelect: (id: string) => void;
  onDragStart: (id: string, point: Point) => void;
  onDragEnd: () => void;
  onMenuToggle: (id: string) => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
  onArchive: (project: PortfolioProject) => void;
}) {
  const router = useRouter();
  const score = getPriorityScore(project);
  const stateClass = project.status === "done" ? "opacity-45" : project.status === "waiting" ? "opacity-75" : "";

  function openProjectTasks() {
    router.push(projectScheduleHref(project));
  }

  return (
    <article
      onContextMenu={(event) => {
        event.preventDefault();
        onMenuToggle(project.id);
      }}
      onPointerDown={(event) => {
        if (!(event.target instanceof HTMLElement) || event.target.closest("a, button")) {
          return;
        }

        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        onDragStart(project.id, { x: event.clientX, y: event.clientY });
      }}
      onPointerUp={() => onDragEnd()}
      onClick={() => onSelect(project.id)}
      className={`absolute w-[236px] rounded-lg border bg-slate-950/88 p-4 shadow-xl shadow-black/25 transition duration-200 hover:-translate-y-1 hover:border-sky-200/50 hover:bg-slate-900/95 ${
        dragging ? "z-40 cursor-grabbing scale-[1.02] shadow-sky-950/30 transition-none" : "cursor-grab"
      } ${
        highlight
          ? "border-sky-200/80 ring-2 ring-sky-200/25"
          : selected
            ? "border-sky-200/70 ring-2 ring-sky-200/15"
            : index === 0
              ? "border-sky-200/45"
              : "border-white/12"
      } ${stateClass}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{String(index + 1).padStart(2, "0")}</p>
          <h3 className="mt-1 truncate text-sm font-semibold text-white">{project.name}</h3>
        </div>
        <span className="text-lg font-semibold text-sky-100">{score}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>進捗 {project.progress}%</span>
        <span>{project.currentBallHolder}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-sky-200" style={{ width: `${project.progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusPill project={project} />
        <button
          type="button"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            openProjectTasks();
          }}
          className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-sky-200/50 hover:text-sky-100"
        >
          開く
        </button>
        <button type="button" onClick={() => onMenuToggle(project.id)} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.06]" title="操作メニュー">
          …
        </button>
      </div>
      {menuOpen ? (
        <ProjectContextMenu
          project={project}
          onArchive={onArchive}
          onCreateTask={onCreateTask}
          onDuplicate={onDuplicate}
          onEdit={() => onSelect(project.id)}
          onClose={() => onMenuToggle(project.id)}
        />
      ) : null}
    </article>
  );
}

function ProjectInspector({
  project,
  projects,
  saveState,
  onSelect,
  onUpdate,
  onCreateTask,
}: {
  project?: PortfolioProject;
  projects: PortfolioProject[];
  saveState: "saved" | "saving";
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
          <p className="text-sm font-semibold text-white">Project Inspector</p>
          <span className="text-xs text-slate-500">
            {saveState === "saving" ? "保存中…" : "保存済み"}
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
        <div className="flex items-start justify-between gap-3">
          <EditableText value={project.name} label="プロジェクト名" onChange={(value) => onUpdate(project.id, { name: value })} className="text-lg font-semibold text-white" />
          <StatusPill project={project} />
        </div>

        <EditableTextarea value={project.objective} label="目的" onChange={(value) => onUpdate(project.id, { objective: value })} />

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
          <button type="button" onClick={() => onCreateTask(project)} className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
            ＋ タスクを追加
          </button>
        </div>
      </section>

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
  onDuplicate,
  onArchive,
  onClose,
}: {
  project: PortfolioProject;
  onEdit: () => void;
  onCreateTask: (project: PortfolioProject) => void;
  onDuplicate: (project: PortfolioProject) => void;
  onArchive: (project: PortfolioProject) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-3 top-12 z-50 w-40 rounded-lg border border-white/10 bg-slate-950/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <Link href={projectScheduleHref(project)} className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.06]">開く</Link>
      <button type="button" onClick={() => { onEdit(); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">編集</button>
      <button type="button" onClick={() => { onCreateTask(project); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">タスクを追加</button>
      <button type="button" onClick={() => { onDuplicate(project); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">複製</button>
      <button type="button" onClick={() => { onArchive(project); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]">アーカイブ</button>
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
      <span className="text-xs text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`mt-1 w-full rounded-md border border-transparent bg-transparent px-0 py-1 outline-none transition hover:border-white/10 hover:bg-white/[0.035] focus:border-sky-200/60 focus:bg-white/[0.045] ${className}`} />
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
      <span className="sr-only">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="未設定" className={`${compact ? "min-h-20" : "min-h-24"} w-full resize-none rounded-md border border-transparent bg-white/[0.035] px-3 py-2 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 hover:border-white/10 focus:border-sky-200/60`} />
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
    <label className="min-w-0 rounded-md bg-white/[0.035] px-2 py-2">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="mt-1 flex items-center gap-1">
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-200 outline-none" />
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
