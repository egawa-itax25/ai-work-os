"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Task,
  TaskPriority,
  TaskStatus,
  initialTasks,
  isOverdue,
  normalizeTasks,
  priorityMeta,
  statusMeta,
  storageKey,
  todayOffset,
} from "../../../task-data";

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};
type Point = { x: number; y: number };
type PanState = { start: Point; origin: Point } | null;
type BallTransferTarget = "self" | "other" | "ai" | "done";
type ToastState = { message: string; undo?: () => void } | null;

const cardWidth = 236;
const cardHeight = 138;
const boardWidth = 1240;
const boardHeight = 620;
const taskFlowViewportHeightClass = "h-[max(560px,calc(100vh-18rem))]";
const ballTransferTargets: {
  id: BallTransferTarget;
  label: string;
  description: string;
  tone: string;
}[] = [
  {
    id: "self",
    label: "自分",
    description: "自分が次に動く",
    tone: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  },
  {
    id: "other",
    label: "相手",
    description: "回答・確認待ち",
    tone: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  },
  {
    id: "ai",
    label: "AI",
    description: "AIが処理中",
    tone: "border-violet-300/40 bg-violet-300/10 text-violet-100",
  },
  {
    id: "done",
    label: "完了",
    description: "流れ終わり",
    tone: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  },
];

export default function ProjectTaskMap() {
  const params = useParams<{ project: string }>();
  const projectName = decodeURIComponent(params.project);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [menuTaskId, setMenuTaskId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [isReady, setIsReady] = useState(false);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.94);
  const [panState, setPanState] = useState<PanState>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? normalizeTasks(JSON.parse(saved)) : initialTasks;
    const missingSamples = initialTasks.filter(
      (sample) => !parsed.some((task) => task.id === sample.id),
    );
    const mergedTasks = [...parsed, ...missingSamples];
    const firstProjectTask = mergedTasks.find((task) => task.project === projectName);

    setTasks(mergedTasks);
    setActiveTaskId(firstProjectTask?.id ?? "");
    setIsReady(true);
  }, [projectName]);

  useEffect(() => {
    if (isReady) {
      setSaveState("saving");
      const timeout = window.setTimeout(() => {
        window.localStorage.setItem(storageKey, JSON.stringify(tasks));
        setSaveState("saved");
      }, 250);

      return () => window.clearTimeout(timeout);
    }
  }, [isReady, tasks]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 5200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const projectTasks = useMemo(() => {
    return tasks.filter((task) => task.project === projectName);
  }, [projectName, tasks]);

  const taskMap = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  const projectTaskIds = useMemo(() => {
    return new Set(projectTasks.map((task) => task.id));
  }, [projectTasks]);

  const projectLinks = useMemo(() => {
    return projectTasks.flatMap((task) =>
      task.links
        .filter((targetId) => projectTaskIds.has(targetId))
        .map((targetId) => ({ source: task, target: taskMap.get(targetId) }))
        .filter(
          (link): link is { source: Task; target: Task } => Boolean(link.target),
        ),
    );
  }, [projectTaskIds, projectTasks, taskMap]);

  const externalLinks = useMemo(() => {
    return projectTasks.flatMap((task) =>
      task.links
        .map((targetId) => taskMap.get(targetId))
        .filter((target): target is Task => Boolean(target))
        .filter((target) => target.project !== projectName)
        .map((target) => ({ source: task, target })),
    );
  }, [projectName, projectTasks, taskMap]);

  const activeTask =
    taskMap.get(activeTaskId) ?? projectTasks[0] ?? tasks[0] ?? null;
  const overdueCount = projectTasks.filter(
    (task) => task.status !== "done" && isOverdue(task.dueDate),
  ).length;

  function getBoardPoint(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - rect.width / 2 - pan.x) / zoom + boardWidth / 2,
      y: (clientY - rect.top - rect.height / 2 - pan.y) / zoom + boardHeight / 2,
    };
  }

  function moveCanvas(point: Point) {
    if (!panState || dragState) {
      return;
    }

    setPan({
      x: panState.origin.x + point.x - panState.start.x,
      y: panState.origin.y + point.y - panState.start.y,
    });
  }

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(1.25, Math.max(0.72, nextZoom)));
  }

  function moveTask(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || !boardRef.current) {
      return;
    }

    const point = getBoardPoint(event.clientX, event.clientY);
    const x = clamp(
      point.x - dragState.offsetX,
      16,
      boardWidth - cardWidth - 16,
    );
    const y = clamp(
      point.y - dragState.offsetY,
      16,
      boardHeight - cardHeight - 16,
    );

    setTasks((current) =>
      current.map((task) =>
        task.id === dragState.id ? { ...task, x, y } : task,
      ),
    );
  }

  function finishMoving(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const dropTarget = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-ball-target]");

    if (dropTarget?.dataset.ballTarget) {
      transferBall(
        dragState.id,
        dropTarget.dataset.ballTarget as BallTransferTarget,
      );
    }

    setDragState(null);
  }

  function addTaskAtPoint(event: ReactMouseEvent<HTMLDivElement>) {
    if (!boardRef.current || !(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.closest("article, button, input, select, textarea")) {
      return;
    }

    event.preventDefault();

    const point = getBoardPoint(event.clientX, event.clientY);
    const x = clamp(
      point.x - cardWidth / 2,
      16,
      boardWidth - cardWidth - 16,
    );
    const y = clamp(
      point.y - 28,
      16,
      boardHeight - cardHeight - 16,
    );
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "新しいタスク",
      description: "",
      owner: "未設定",
      currentBallHolder: "未設定",
      ballHoldingStartedAt: todayString(),
      project: projectName,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      status: "todo",
      priority: "medium",
      progress: 0,
      nextAction: "",
      x,
      y,
      links: [],
      createdAt: new Date().toISOString(),
    };

    setTasks((current) => [newTask, ...current]);
    setActiveTaskId(newTask.id);
    setToast({ message: "タスクを作成しました。", undo: () => removeTask(newTask.id) });
  }

  function startMoving(event: ReactPointerEvent<HTMLElement>, task: Task) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.closest("button, input, select, textarea")) {
      return;
    }

    const point = getBoardPoint(event.clientX, event.clientY);

    setActiveTaskId(task.id);
    setDragState({
      id: task.id,
      offsetX: point.x - task.x,
      offsetY: point.y - task.y,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function connectTasks(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    setTasks((current) =>
      current.map((task) => {
        if (task.id !== sourceId || task.links.includes(targetId)) {
          return task;
        }

        return { ...task, links: [...task.links, targetId] };
      }),
    );
    setActiveTaskId(targetId);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const beforeTask = tasks.find((task) => task.id === id);

    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
    setToast({
      message: "変更を保存しました。",
      undo: () => {
        if (beforeTask) {
          setTasks((current) =>
            current.map((task) => (task.id === id ? beforeTask : task)),
          );
        }
      },
    });
  }

  function transferBall(id: string, target: BallTransferTarget) {
    const beforeTask = tasks.find((task) => task.id === id);

    if (!beforeTask) {
      return;
    }

    const patch = getBallTransferPatch(target);

    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
    setActiveTaskId(id);
    setToast({
      message: `${beforeTask.title} を${getBallTransferLabel(target)}へ移しました。`,
      undo: () => {
        setTasks((current) =>
          current.map((task) => (task.id === id ? beforeTask : task)),
        );
      },
    });
  }

  function createTask(input: CreateTaskInput) {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.nextAction,
      owner: input.owner,
      currentBallHolder: input.currentBallHolder,
      ballHoldingStartedAt: todayString(),
      project: projectName,
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

    setTasks((current) => [newTask, ...current]);
    setActiveTaskId(newTask.id);
    setDrawerOpen(false);
    setToast({ message: "タスクを作成しました。", undo: () => removeTask(newTask.id) });
  }

  function duplicateTask(task: Task) {
    const copy: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} の複製`,
      x: clamp(task.x + 36, 16, boardWidth - cardWidth - 16),
      y: clamp(task.y + 36, 16, boardHeight - cardHeight - 16),
      links: [],
      createdAt: new Date().toISOString(),
    };

    setTasks((current) => [copy, ...current]);
    setActiveTaskId(copy.id);
    setToast({ message: "タスクを複製しました。", undo: () => removeTask(copy.id) });
  }

  function removeTask(id: string) {
    const remainingTasks = tasks.filter((task) => task.id !== id);

    setTasks(
      remainingTasks.map((task) => ({
        ...task,
        links: task.links.filter((targetId) => targetId !== id),
      })),
    );
    setActiveTaskId(
      remainingTasks.find((task) => task.project === projectName)?.id ?? "",
    );
  }

  return (
    <div className="neo-shell space-y-5 text-zinc-100">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="neo-accent text-sm font-medium">プロジェクトマップ</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-white">
            {projectName}
          </h1>
        </div>

        <div className="grid grid-cols-4 gap-3 sm:min-w-[28rem]">
          <SummaryTile label="タスク" value={projectTasks.length} />
          <SummaryTile label="内部リンク" value={projectLinks.length} />
          <SummaryTile label="期限超過" value={overdueCount} urgent />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="neo-surface rounded-md border p-4 text-left text-sm font-semibold text-sky-100 hover:bg-sky-300/10"
          >
            ＋ タスク
          </button>
        </div>
      </section>

      <div className="neo-surface grid gap-3 rounded-md border p-3 sm:grid-cols-2">
        <Link
          href="/portfolio"
          className="rounded-md border border-sky-300/50 bg-sky-300/10 px-5 py-4 text-center text-base font-semibold text-sky-50 shadow-lg shadow-sky-950/20 hover:bg-sky-300/15"
        >
          ポートフォリオへ戻る
        </Link>
        <Link
          href="/tasks/projects"
          className="rounded-md border border-zinc-700 px-5 py-4 text-center text-base font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
        >
          プロジェクト一覧
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <section className={`${taskFlowViewportHeightClass} flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-950/48 shadow-xl shadow-black/25 backdrop-blur-xl`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">タスクフローマップ</h2>
              <p className="mt-1 text-sm text-slate-500">
                空白をドラッグで移動。ズームはShift+スクロールで操作できます。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => updateZoom(zoom - 0.08)} className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]" title="縮小">
                -
              </button>
              <span className="w-12 text-center text-xs text-slate-400">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => updateZoom(zoom + 0.08)} className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]" title="拡大">
                +
              </button>
            </div>
          </div>
          <div
            ref={boardRef}
            onContextMenu={addTaskAtPoint}
            onDoubleClick={addTaskAtPoint}
            onPointerDown={(event) => {
              if (event.target instanceof HTMLElement && !event.target.closest("article")) {
                setPanState({ start: { x: event.clientX, y: event.clientY }, origin: pan });
              }
            }}
            onPointerMove={(event) => {
              moveCanvas({ x: event.clientX, y: event.clientY });
              moveTask(event);
            }}
            onPointerUp={(event) => {
              setPanState(null);
              finishMoving(event);
            }}
            onPointerCancel={() => {
              setPanState(null);
              setDragState(null);
            }}
            onPointerLeave={() => {
              setPanState(null);
              setDragState(null);
            }}
            onWheel={(event) => {
              if (event.shiftKey && Math.abs(event.deltaY) > 1) {
                event.preventDefault();
                updateZoom(zoom - event.deltaY * 0.001);
              }
            }}
            className={`relative min-h-0 flex-1 overflow-hidden ${panState ? "cursor-grabbing" : "cursor-grab"}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.08),transparent_18rem),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />
            <div
              className={`absolute left-1/2 top-1/2 origin-center ${
                panState || dragState ? "transition-none" : "transition-transform duration-200"
              }`}
              style={{
                width: boardWidth,
                height: boardHeight,
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              }}
            >
              <svg
                className="pointer-events-none absolute inset-0"
                width={boardWidth}
                height={boardHeight}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="project-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                  </marker>
                </defs>
                {projectLinks.map(({ source, target }) => {
                  const startX = source.x + cardWidth / 2;
                  const startY = source.y + cardHeight / 2;
                  const endX = target.x + cardWidth / 2;
                  const endY = target.y + cardHeight / 2;
                  const midX = (startX + endX) / 2;

                  return (
                    <path
                      key={`${source.id}:${target.id}`}
                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="rgba(148,163,184,0.32)"
                      strokeLinecap="round"
                      strokeWidth="1.5"
                      markerEnd="url(#project-arrow)"
                    />
                  );
                })}
              </svg>

              {projectTasks.map((task) => (
                <TaskNode
                  compact
                  key={task.id}
                  task={task}
                  active={activeTask?.id === task.id}
                  linking={linkSourceId !== null}
                  dropTarget={dropTargetId === task.id}
                  menuOpen={menuTaskId === task.id}
                  onArchive={(id) => updateTask(id, { status: "archived" })}
                  onComplete={(id) => updateTask(id, { status: "done", progress: 100 })}
                  onDuplicate={duplicateTask}
                  onMenuToggle={(id) => setMenuTaskId((current) => (current === id ? "" : id))}
                  onStartMoving={startMoving}
                  onSelect={setActiveTaskId}
                  onConnectStart={setLinkSourceId}
                  onConnectEnd={() => {
                    setLinkSourceId(null);
                    setDropTargetId(null);
                  }}
                  onDropTarget={setDropTargetId}
                  onConnect={connectTasks}
                  onUpdate={(patch) => updateTask(task.id, patch)}
                  onRemove={removeTask}
                  onStatusChange={(status) => updateTask(task.id, { status })}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="neo-surface rounded-md border p-4">
          {activeTask && activeTask.project === projectName ? (
            <TaskInspector
              externalLinks={externalLinks.length}
              saveState={saveState}
              task={activeTask}
              taskMap={taskMap}
              onDuplicate={duplicateTask}
              onRemove={removeTask}
              onUpdate={(patch) => updateTask(activeTask.id, patch)}
            />
          ) : (
            <p className="text-sm text-zinc-500">
              このプロジェクトにタスクがありません。
            </p>
          )}
        </aside>
      </section>

      {drawerOpen ? (
        <CreateTaskDrawer
          onClose={() => setDrawerOpen(false)}
          onCreate={createTask}
        />
      ) : null}

      {toast ? <UndoToast toast={toast} onClose={() => setToast(null)} /> : null}
      <BallTransferDock visible={Boolean(dragState)} />
    </div>
  );
}

function TaskNode({
  compact = false,
  task,
  active,
  linking,
  dropTarget,
  menuOpen,
  onStartMoving,
  onSelect,
  onMenuToggle,
  onDuplicate,
  onComplete,
  onArchive,
  onConnectStart,
  onConnectEnd,
  onDropTarget,
  onConnect,
  onUpdate,
  onRemove,
  onStatusChange,
}: {
  compact?: boolean;
  task: Task;
  active: boolean;
  linking: boolean;
  dropTarget: boolean;
  menuOpen: boolean;
  onStartMoving: (event: ReactPointerEvent<HTMLElement>, task: Task) => void;
  onSelect: (id: string) => void;
  onMenuToggle: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onConnectStart: (id: string) => void;
  onConnectEnd: () => void;
  onDropTarget: (id: string | null) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const ballMeta = getTaskBallMeta(task);

  if (compact) {
    return (
      <article
        onPointerDown={(event) => onStartMoving(event, task)}
        onClick={() => onSelect(task.id)}
        onContextMenu={(event) => {
          event.preventDefault();
          onMenuToggle(task.id);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          onDropTarget(task.id);
        }}
        onDragLeave={() => onDropTarget(null)}
        onDrop={(event) => {
          event.preventDefault();
          const sourceId = event.dataTransfer.getData("application/task-id");
          onConnect(sourceId, task.id);
          onConnectEnd();
        }}
        className={`absolute w-[236px] rounded-lg border bg-slate-950/88 p-4 shadow-xl shadow-black/25 transition duration-200 hover:-translate-y-1 hover:border-sky-200/50 hover:bg-slate-900/95 ${
          active
            ? "z-30 border-sky-200/70 ring-2 ring-sky-200/15"
            : `border-white/12 ${priorityMeta[task.priority].ring}`
        } ${dropTarget ? "scale-[1.02] border-sky-200 ring-sky-200/40" : ""} ${
          linking ? "shadow-sky-950/50" : ""
        }`}
        style={{
          minHeight: cardHeight,
          left: task.x,
          top: task.y,
          zIndex: active ? 30 : 10,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{statusMeta[task.status].label}</p>
            <h3 className="mt-1 truncate text-sm font-semibold text-white">{task.title}</h3>
          </div>
          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityMeta[task.priority].badge}`}>
            {priorityMeta[task.priority].label}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>進捗 {task.progress}%</span>
          <span className="truncate">{task.currentBallHolder}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-sky-200" style={{ width: `${task.progress}%` }} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${ballMeta.tone}`}>
            {ballMeta.label}
          </span>
          <button
            type="button"
            draggable
            onPointerDown={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/task-id", task.id);
              event.dataTransfer.effectAllowed = "link";
              onConnectStart(task.id);
            }}
            onDragEnd={onConnectEnd}
            className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-2 py-1 text-[11px] font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            つなぐ
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onMenuToggle(task.id);
            }}
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.06]"
            title="操作メニュー"
          >
            …
          </button>
        </div>

        {menuOpen ? (
          <TaskContextMenu
            task={task}
            onArchive={onArchive}
            onComplete={onComplete}
            onDuplicate={onDuplicate}
            onEdit={onSelect}
            onPassBall={() => onUpdate({ currentBallHolder: "未設定", ballHoldingStartedAt: todayString() })}
            onClose={() => onMenuToggle(task.id)}
          />
        ) : null}
      </article>
    );
  }

  return (
    <article
      onPointerDown={(event) => onStartMoving(event, task)}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenuToggle(task.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDropTarget(task.id);
      }}
      onDragLeave={() => onDropTarget(null)}
      onDrop={(event) => {
        event.preventDefault();
        const sourceId = event.dataTransfer.getData("application/task-id");
        onConnect(sourceId, task.id);
        onConnectEnd();
      }}
      className={`neo-card absolute rounded-md border p-4 pt-10 ring-2 transition ${
        active
          ? "border-violet-300 ring-violet-400/40"
          : `border-zinc-800 ${priorityMeta[task.priority].ring}`
      } ${dropTarget ? "scale-[1.02] border-violet-300 ring-violet-300/60" : ""} ${
        linking ? "shadow-violet-950/50" : ""
      }`}
      style={{
        width: cardWidth,
        minHeight: cardHeight,
        left: task.x,
        top: task.y,
        zIndex: active ? 30 : 10,
      }}
    >
      <button
        type="button"
        onClick={() => onMenuToggle(task.id)}
        className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-black/40 text-zinc-300 hover:bg-zinc-900"
        aria-label={`${task.title} の操作メニュー`}
        title="操作メニュー"
      >
        …
      </button>
      <button
        type="button"
        onClick={() => onRemove(task.id)}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border border-red-400/40 bg-red-400/10 text-red-200 hover:bg-red-400/20"
        aria-label={`${task.title} を削除`}
        title="削除"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      </button>
      <div className="mb-3 flex h-5 cursor-grab items-center justify-center active:cursor-grabbing">
        <span className="h-1 w-12 rounded-full bg-violet-300/30 shadow-sm shadow-violet-400/30" aria-hidden="true" />
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ballMeta.tone}`}
          title={`現在のボール: ${ballMeta.detail}`}
        >
          {ballMeta.label}
        </span>
        <span className="truncate text-[11px] text-zinc-500">
          {ballMeta.detail}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={task.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
            onFocus={() => onSelect(task.id)}
            className="neo-input w-full rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-white outline-none placeholder:text-zinc-600 hover:border-zinc-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
            placeholder="タスク名"
            aria-label={`${task.title} のタイトル`}
          />
          <textarea
            value={task.description}
            onChange={(event) => onUpdate({ description: event.target.value })}
            onFocus={() => onSelect(task.id)}
            className="neo-input min-h-16 w-full resize-none rounded-md border border-transparent px-2 py-1 text-sm leading-5 text-zinc-300 outline-none placeholder:text-zinc-600 hover:border-zinc-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
            placeholder="メモなし"
            aria-label={`${task.title} のメモ`}
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityMeta[task.priority].badge}`}
          >
            {priorityMeta[task.priority].label}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
        <input
          value={task.owner}
          onChange={(event) => onUpdate({ owner: event.target.value })}
          onFocus={() => onSelect(task.id)}
          className="neo-input min-w-0 rounded border border-transparent px-2 py-1 text-zinc-300 outline-none placeholder:text-zinc-600 hover:border-zinc-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          placeholder="担当"
          aria-label={`${task.title} の担当`}
        />
        <input
          type="date"
          value={task.dueDate}
          onChange={(event) => onUpdate({ dueDate: event.target.value })}
          onFocus={() => onSelect(task.id)}
          className={`neo-input min-w-0 rounded border border-transparent px-2 py-1 text-right outline-none hover:border-zinc-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 ${
            task.status !== "done" && isOverdue(task.dueDate)
              ? "font-semibold text-red-200"
              : "text-zinc-300"
          }`}
          aria-label={`${task.title} の期限`}
        />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <select
          value={task.status}
          onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
          className="neo-input min-w-0 rounded-md border border-zinc-700 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          aria-label={`${task.title} の状態`}
        >
          <option value="todo">{statusMeta.todo.label}</option>
          <option value="doing">{statusMeta.doing.label}</option>
          <option value="done">{statusMeta.done.label}</option>
        </select>
        <select
          value={task.priority}
          onChange={(event) =>
            onUpdate({ priority: event.target.value as Task["priority"] })
          }
          className="neo-input min-w-0 rounded-md border border-zinc-700 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          aria-label={`${task.title} の優先度`}
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("application/task-id", task.id);
            event.dataTransfer.effectAllowed = "link";
            onConnectStart(task.id);
          }}
          onDragEnd={onConnectEnd}
          className="rounded-md border border-violet-400/40 bg-violet-400/10 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/20"
          aria-label={`${task.title} からつながりを作成`}
        >
          つなぐ
        </button>
      </div>
      {menuOpen ? (
        <TaskContextMenu
          task={task}
          onArchive={onArchive}
          onComplete={onComplete}
          onDuplicate={onDuplicate}
          onEdit={onSelect}
          onPassBall={() => onUpdate({ currentBallHolder: "未設定", ballHoldingStartedAt: todayString() })}
          onClose={() => onMenuToggle(task.id)}
        />
      ) : null}
    </article>
  );
}

function TaskInspector({
  task,
  taskMap,
  externalLinks,
  saveState,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  task: Task;
  taskMap: Map<string, Task>;
  externalLinks: number;
  saveState: "saved" | "saving";
  onUpdate: (patch: Partial<Task>) => void;
  onDuplicate: (task: Task) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="neo-accent text-xs font-medium">Task Inspector</p>
          <input
            value={task.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
            className="mt-1 w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-lg font-semibold text-white outline-none hover:border-zinc-700 hover:bg-zinc-950 focus:border-violet-400"
            aria-label="タスク名"
          />
        </div>
        <span className="shrink-0 text-xs text-zinc-500">
          {saveState === "saving" ? "保存中…" : "保存済み"}
        </span>
      </div>

      <textarea
        value={task.nextAction}
        onChange={(event) => onUpdate({ nextAction: event.target.value, description: event.target.value })}
        className="neo-input min-h-20 w-full resize-none rounded-md border border-zinc-800 px-3 py-2 text-sm leading-6 text-zinc-300 outline-none focus:border-violet-400"
        placeholder="次のアクション"
        aria-label="次のアクション"
      />

      <div className="grid gap-2 text-sm">
        <EditableTaskField label="担当者" value={task.owner} onChange={(value) => onUpdate({ owner: value })} />
        <EditableTaskField label="現在のボール" value={task.currentBallHolder} onChange={(value) => onUpdate({ currentBallHolder: value, ballHoldingStartedAt: todayString() })} />
        <EditableTaskField label="ボール保持開始" value={task.ballHoldingStartedAt} type="date" onChange={(value) => onUpdate({ ballHoldingStartedAt: value })} />
        <EditableTaskField label="期限" value={task.dueDate} type="date" alert={task.status !== "done" && isOverdue(task.dueDate)} onChange={(value) => onUpdate({ dueDate: value })} />
        <DetailRow label="外部リンク" value={`${externalLinks}件`} />
      </div>

      <div>
        <label className="text-sm font-semibold text-zinc-200" htmlFor={`task-progress-${task.id}`}>
          進捗
        </label>
        <input
          id={`task-progress-${task.id}`}
          type="range"
          min="0"
          max="100"
          value={task.progress}
          onChange={(event) => onUpdate({ progress: Number(event.target.value) })}
          className="mt-2 w-full"
        />
        <p className="mt-1 text-right text-xs text-zinc-500">{task.progress}%</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-200">状態</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(["todo", "doing", "done", "archived"] as TaskStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onUpdate({ status, progress: status === "done" ? 100 : task.progress })}
              className={`rounded-md border px-2 py-2 text-xs font-medium ${
                task.status === status
                  ? statusMeta[status].tone
                  : "border-zinc-700 bg-black text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              {statusMeta[status].label}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-semibold text-zinc-200">
        優先順位
        <select
          value={task.priority}
          onChange={(event) => onUpdate({ priority: event.target.value as Task["priority"] })}
          className="neo-input mt-2 w-full rounded-md border border-zinc-700 px-2 py-2 text-sm text-zinc-100 outline-none focus:border-violet-400"
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </label>

      <div>
        <p className="text-sm font-semibold text-zinc-200">依存関係</p>
        <div className="mt-2 space-y-2">
          {task.links.map((targetId) => {
            const target = taskMap.get(targetId);

            if (!target) {
              return null;
            }

            return (
              <div key={targetId} className="rounded-md border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-sm text-violet-100">
                <div className="truncate">{target.title}</div>
                <button
                  type="button"
                  onClick={() => onUpdate({ links: task.links.filter((id) => id !== targetId) })}
                  className="mt-1 text-xs text-violet-200/70 hover:text-violet-100"
                >
                  依存関係を外す
                </button>
              </div>
            );
          })}
          {task.links.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-700 px-3 py-4 text-center text-sm text-zinc-500">
              なし
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onDuplicate(task)} className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900">
          複製
        </button>
        <button type="button" onClick={() => onRemove(task.id)} className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-100 hover:bg-red-400/20">
          削除
        </button>
      </div>
    </div>
  );
}

function BallTransferDock({ visible }: { visible: boolean }) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 transition duration-200 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <div
        className={`w-full max-w-3xl rounded-2xl border border-zinc-700/80 bg-zinc-950/92 p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl ${
          visible ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-2 pb-3">
          <div>
            <p className="text-sm font-semibold text-white">ボールを渡す</p>
            <p className="text-xs text-zinc-500">タスクを置くと、現在のボールが切り替わります。</p>
          </div>
          <span className="hidden rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 sm:inline">
            ドラッグ中
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ballTransferTargets.map((target) => (
            <div
              key={target.id}
              data-ball-target={target.id}
              className={`rounded-xl border px-3 py-3 text-center transition duration-150 ${target.tone} hover:scale-[1.02] hover:bg-white/[0.08]`}
            >
              <p className="text-sm font-semibold">{target.label}</p>
              <p className="mt-1 text-[11px] opacity-75">{target.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateTaskDrawer({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void;
}) {
  const [input, setInput] = useState<CreateTaskInput>({
    title: "",
    owner: "あなた",
    currentBallHolder: "あなた",
    dueDate: todayOffset(1),
    priority: "medium",
    nextAction: "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!input.title.trim()) {
      return;
    }

    onCreate({ ...input, title: input.title.trim() });
  }

  return (
    <Drawer title="タスクを作成" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <DrawerField label="タスク名" value={input.title} onChange={(value) => setInput((current) => ({ ...current, title: value }))} autoFocus />
        <DrawerField label="担当者" value={input.owner} onChange={(value) => setInput((current) => ({ ...current, owner: value }))} />
        <DrawerField label="現在のボール" value={input.currentBallHolder} onChange={(value) => setInput((current) => ({ ...current, currentBallHolder: value }))} />
        <DrawerField label="期限" value={input.dueDate} type="date" onChange={(value) => setInput((current) => ({ ...current, dueDate: value }))} />
        <label className="block text-sm text-zinc-300">
          優先順位
          <select value={input.priority} onChange={(event) => setInput((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className="neo-input mt-2 w-full rounded-md border border-zinc-700 px-3 py-2 text-zinc-100 outline-none focus:border-violet-400">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        <DrawerField label="次のアクション" value={input.nextAction} onChange={(value) => setInput((current) => ({ ...current, nextAction: value }))} textarea />
        <button type="submit" className="w-full rounded-md border border-violet-400/40 bg-violet-400/15 px-4 py-3 text-sm font-semibold text-violet-50 hover:bg-violet-400/25">
          作成する
        </button>
      </form>
    </Drawer>
  );
}

function TaskContextMenu({
  task,
  onEdit,
  onDuplicate,
  onPassBall,
  onComplete,
  onArchive,
  onClose,
}: {
  task: Task;
  onEdit: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onPassBall: () => void;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-2 top-11 z-50 w-40 rounded-lg border border-zinc-700 bg-zinc-950/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <button type="button" onClick={() => { onEdit(task.id); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">開く</button>
      <button type="button" onClick={() => { onEdit(task.id); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">編集</button>
      <button type="button" onClick={() => { onDuplicate(task); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">複製</button>
      <button type="button" onClick={() => { onPassBall(); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">ボールを渡す</button>
      <button type="button" onClick={() => { onComplete(task.id); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">完了</button>
      <button type="button" onClick={() => { onArchive(task.id); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">アーカイブ</button>
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
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl shadow-black/50"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-900" title="閉じる">
            ×
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </aside>
    </div>
  );
}

function DrawerField({
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
    <label className="block text-sm text-zinc-300">
      {label}
      {textarea ? (
        <textarea autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} className="neo-input mt-2 min-h-24 w-full resize-none rounded-md border border-zinc-700 px-3 py-2 text-zinc-100 outline-none focus:border-violet-400" />
      ) : (
        <input autoFocus={autoFocus} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="neo-input mt-2 w-full rounded-md border border-zinc-700 px-3 py-2 text-zinc-100 outline-none focus:border-violet-400" />
      )}
    </label>
  );
}

function EditableTaskField({
  label,
  value,
  type = "text",
  alert = false,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  alert?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md bg-black px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 bg-transparent text-right font-medium outline-none ${alert ? "text-red-200" : "text-zinc-200"}`}
      />
    </label>
  );
}

function UndoToast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950/95 px-4 py-3 text-sm text-zinc-200 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <span>{toast.message}</span>
      {toast.undo ? (
        <button type="button" onClick={() => { toast.undo?.(); onClose(); }} className="rounded-md border border-violet-400/40 px-3 py-1 text-violet-100 hover:bg-violet-400/10">
          元に戻す
        </button>
      ) : null}
      <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-200" title="閉じる">×</button>
    </div>
  );
}

type CreateTaskInput = {
  title: string;
  owner: string;
  currentBallHolder: string;
  dueDate: string;
  priority: TaskPriority;
  nextAction: string;
};

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

function DetailRow({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-black px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`truncate font-medium ${
          alert ? "text-red-200" : "text-zinc-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function getBallTransferPatch(target: BallTransferTarget): Partial<Task> {
  if (target === "self") {
    return {
      currentBallHolder: "あなた",
      ballHoldingStartedAt: todayString(),
      status: "doing",
    };
  }

  if (target === "other") {
    return {
      currentBallHolder: "相手",
      ballHoldingStartedAt: todayString(),
      status: "todo",
    };
  }

  if (target === "ai") {
    return {
      currentBallHolder: "AI",
      ballHoldingStartedAt: todayString(),
      status: "doing",
    };
  }

  return {
    currentBallHolder: "なし",
    ballHoldingStartedAt: todayString(),
    status: "done",
    progress: 100,
  };
}

function getBallTransferLabel(target: BallTransferTarget) {
  const transferTarget = ballTransferTargets.find((item) => item.id === target);
  return transferTarget?.label ?? "移動先";
}

function getTaskBallMeta(task: Task) {
  if (task.status === "done") {
    return {
      label: "完了",
      detail: "流れ終わり",
      tone: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
    };
  }

  if (task.currentBallHolder === "あなた") {
    return {
      label: "自分のボール",
      detail: "あなたが次に動く",
      tone: "border-sky-300/40 bg-sky-300/10 text-sky-100",
    };
  }

  if (task.currentBallHolder === "AI") {
    return {
      label: "AI処理中",
      detail: "AIが進めています",
      tone: "border-violet-300/40 bg-violet-300/10 text-violet-100",
    };
  }

  if (!task.currentBallHolder || task.currentBallHolder === "なし") {
    return {
      label: "ボールなし",
      detail: "次の所在を決める",
      tone: "border-zinc-600 bg-zinc-900 text-zinc-300",
    };
  }

  return {
    label: "相手のボール",
    detail: task.currentBallHolder,
    tone: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}


