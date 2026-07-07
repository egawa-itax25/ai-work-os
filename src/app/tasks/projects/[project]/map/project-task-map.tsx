"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Task,
  TaskStatus,
  formatDate,
  initialTasks,
  isOverdue,
  normalizeTasks,
  priorityMeta,
  statusMeta,
  storageKey,
} from "../../../task-data";

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

const cardWidth = 280;
const cardHeight = 256;
const boardWidth = 1120;
const boardHeight = 720;

export default function ProjectTaskMap() {
  const params = useParams<{ project: string }>();
  const projectName = decodeURIComponent(params.project);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? normalizeTasks(JSON.parse(saved)) : initialTasks;
    const firstProjectTask = parsed.find((task) => task.project === projectName);

    setTasks(parsed);
    setActiveTaskId(firstProjectTask?.id ?? "");
    setIsReady(true);
  }, [projectName]);

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [isReady, tasks]);

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

  function moveTask(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState || !boardRef.current) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = clamp(
      event.clientX - rect.left - dragState.offsetX,
      16,
      boardWidth - cardWidth - 16,
    );
    const y = clamp(
      event.clientY - rect.top - dragState.offsetY,
      16,
      boardHeight - cardHeight - 16,
    );

    setTasks((current) =>
      current.map((task) =>
        task.id === dragState.id ? { ...task, x, y } : task,
      ),
    );
  }

  function addTaskAtPoint(event: ReactMouseEvent<HTMLDivElement>) {
    if (!boardRef.current || !(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.closest("article, button, input, select, textarea")) {
      return;
    }

    event.preventDefault();

    const rect = boardRef.current.getBoundingClientRect();
    const x = clamp(
      event.clientX - rect.left - cardWidth / 2,
      16,
      boardWidth - cardWidth - 16,
    );
    const y = clamp(
      event.clientY - rect.top - 28,
      16,
      boardHeight - cardHeight - 16,
    );
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "新しいタスク",
      description: "",
      owner: "未設定",
      project: projectName,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      status: "todo",
      priority: "medium",
      x,
      y,
      links: [],
      createdAt: new Date().toISOString(),
    };

    setTasks((current) => [newTask, ...current]);
    setActiveTaskId(newTask.id);
  }

  function startMoving(event: ReactPointerEvent<HTMLElement>, task: Task) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.closest("button, input, select, textarea")) {
      return;
    }

    setActiveTaskId(task.id);
    setDragState({
      id: task.id,
      offsetX: event.nativeEvent.offsetX,
      offsetY: event.nativeEvent.offsetY,
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
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
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

        <div className="grid grid-cols-3 gap-3 sm:min-w-96">
          <SummaryTile label="タスク" value={projectTasks.length} />
          <SummaryTile label="内部リンク" value={projectLinks.length} />
          <SummaryTile label="期限超過" value={overdueCount} urgent />
        </div>
      </section>

      <div className="neo-surface grid gap-3 rounded-md border p-3 sm:grid-cols-2">
        <Link
          href="/tasks/projects"
          className="rounded-md border border-violet-400 bg-violet-500/20 px-5 py-4 text-center text-base font-semibold text-violet-50 shadow-lg shadow-violet-950/30 hover:bg-violet-500/25"
        >
          プロジェクト一覧
        </Link>
        <Link
          href="/tasks"
          className="rounded-md border border-zinc-700 px-5 py-4 text-center text-base font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white"
        >
          全体マップ
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="neo-surface overflow-auto rounded-md border">
          <div
            ref={boardRef}
            onContextMenu={addTaskAtPoint}
            onDoubleClick={addTaskAtPoint}
            onPointerMove={moveTask}
            onPointerUp={() => setDragState(null)}
            onPointerCancel={() => setDragState(null)}
            className="neo-map-grid relative cursor-default"
            style={{ width: boardWidth, height: boardHeight }}
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
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
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
                    stroke="#a78bfa"
                    strokeLinecap="round"
                    strokeWidth="3"
                    markerEnd="url(#project-arrow)"
                  />
                );
              })}
            </svg>

            {projectTasks.map((task) => (
              <TaskNode
                key={task.id}
                task={task}
                active={activeTask?.id === task.id}
                linking={linkSourceId !== null}
                dropTarget={dropTargetId === task.id}
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

        <aside className="neo-surface rounded-md border p-4">
          {activeTask && activeTask.project === projectName ? (
            <div className="space-y-4">
              <div>
                <p className="neo-accent text-xs font-medium">選択中</p>
                <h2 className="mt-1 break-words text-lg font-semibold text-white">
                  {activeTask.title}
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
                  {activeTask.description || "メモなし"}
                </p>
              </div>

              <div className="grid gap-2 text-sm">
                <DetailRow label="担当" value={activeTask.owner} />
                <DetailRow
                  label="期限"
                  value={formatDate(activeTask.dueDate)}
                  alert={activeTask.status !== "done" && isOverdue(activeTask.dueDate)}
                />
                <DetailRow label="外部リンク" value={`${externalLinks.length}件`} />
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-200">状態</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["todo", "doing", "done"] as TaskStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateTask(activeTask.id, { status })}
                      className={`rounded-md border px-2 py-2 text-xs font-medium ${
                        activeTask.status === status
                          ? statusMeta[status].tone
                          : "border-zinc-700 bg-black text-zinc-400 hover:bg-zinc-900"
                      }`}
                    >
                      {statusMeta[status].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-200">関連先</p>
                <div className="mt-2 space-y-2">
                  {activeTask.links.map((targetId) => {
                    const target = taskMap.get(targetId);

                    if (!target) {
                      return null;
                    }

                    return (
                      <div
                        key={targetId}
                        className={
                          target.project === projectName
                            ? "rounded-md border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-sm text-violet-100"
                            : "rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-400"
                        }
                      >
                        <div className="truncate">{target.title}</div>
                        {target.project !== projectName ? (
                          <div className="mt-1 text-xs text-zinc-600">
                            {target.project}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {activeTask.links.length === 0 ? (
                    <p className="rounded-md border border-dashed border-zinc-700 px-3 py-4 text-center text-sm text-zinc-500">
                      なし
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              このプロジェクトにタスクがありません。
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}

function TaskNode({
  task,
  active,
  linking,
  dropTarget,
  onStartMoving,
  onSelect,
  onConnectStart,
  onConnectEnd,
  onDropTarget,
  onConnect,
  onUpdate,
  onRemove,
  onStatusChange,
}: {
  task: Task;
  active: boolean;
  linking: boolean;
  dropTarget: boolean;
  onStartMoving: (event: ReactPointerEvent<HTMLElement>, task: Task) => void;
  onSelect: (id: string) => void;
  onConnectStart: (id: string) => void;
  onConnectEnd: () => void;
  onDropTarget: (id: string | null) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  return (
    <article
      onPointerDown={(event) => onStartMoving(event, task)}
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
          Connect
        </button>
      </div>
    </article>
  );
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}


