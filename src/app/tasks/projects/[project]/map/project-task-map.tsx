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
import { addTrashItem, createTrashDates, removeTrashItem } from "@/lib/trash-data";

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};
type Point = { x: number; y: number };
type PanState = { start: Point; origin: Point } | null;
type BallTransferTarget = "self" | "other" | "done";
type ToastState = { message: string; undo?: () => void } | null;

const cardWidth = 236;
const cardHeight = 156;
const minimumBoardSize = { width: 1240, height: 620 };
const taskFitPadding = 96;
const taskFlowViewportHeightClass = "h-full";
const taskMapDefaultZoom = 0.94;
const taskMapMinZoom = 0.84;
const taskMapMaxZoom = 1.25;
const taskMapTopZoneRatio = 0.76;
const taskMapViewStoragePrefix = "ai-work-os:task-map-view:v2:";
type TaskFlowZoneDefinition = {
  id: BallTransferTarget;
  label: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  icon: string;
  tone: string;
};
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
    id: "done",
    label: "完了",
    description: "流れ終わり",
    tone: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
  },
];

function createTaskFlowZones(boardSize: Point): TaskFlowZoneDefinition[] {
  const topHeight = Math.max(360, Math.round(boardSize.y * taskMapTopZoneRatio));
  const doneHeight = Math.max(220, boardSize.y - topHeight);
  const halfWidth = boardSize.x / 2;

  return [
    {
      id: "self",
      label: "自分ボール",
      description: "あなたが対応すべきタスク",
      x: 0,
      y: 0,
      width: halfWidth,
      height: topHeight,
      icon: "●",
      tone: "border-sky-300/55 bg-sky-400/[0.055] text-sky-100 shadow-sky-950/25",
    },
    {
      id: "other",
      label: "相手ボール",
      description: "相手に対応してもらうタスク",
      x: halfWidth,
      y: 0,
      width: halfWidth,
      height: topHeight,
      icon: "●",
      tone: "border-amber-300/60 bg-amber-300/[0.06] text-amber-100 shadow-amber-950/25",
    },
    {
      id: "done",
      label: "完了",
      description: "完了したタスク",
      x: 0,
      y: topHeight,
      width: boardSize.x,
      height: doneHeight,
      icon: "✓",
      tone: "border-emerald-300/45 bg-emerald-300/[0.045] text-emerald-100 shadow-emerald-950/20",
    },
  ];
}

function getTaskFitFrame({
  boardSize,
  currentZoom,
  tasks,
  viewport,
}: {
  boardSize: Point;
  currentZoom: number;
  tasks: Task[];
  viewport: DOMRect;
}) {
  const bounds = tasks.reduce(
    (current, task) => ({
      minX: Math.min(current.minX, task.x),
      minY: Math.min(current.minY, task.y),
      maxX: Math.max(current.maxX, task.x + cardWidth),
      maxY: Math.max(current.maxY, task.y + cardHeight),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
  const contentWidth = bounds.maxX - bounds.minX + taskFitPadding * 2;
  const contentHeight = bounds.maxY - bounds.minY + taskFitPadding * 2;
  const availableWidth = Math.max(280, viewport.width);
  const availableHeight = Math.max(280, viewport.height);
  const fitZoom = Math.min(
    currentZoom,
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );
  const nextZoom = clamp(fitZoom, taskMapMinZoom, taskMapMaxZoom);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    zoom: nextZoom,
    pan: {
      x: (boardSize.x / 2 - centerX) * nextZoom,
      y: (boardSize.y / 2 - centerY) * nextZoom,
    },
  };
}

export default function ProjectTaskMap() {
  const params = useParams<{ project: string }>();
  const projectName = decodeURIComponent(params.project);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const projectTasksRef = useRef<Task[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
  const reconciledViewportKeyRef = useRef("");
  const restoredViewportSizeRef = useRef<Point | null>(null);
  const boardSizeRef = useRef<Point>({
    x: minimumBoardSize.width,
    y: minimumBoardSize.height,
  });
  const zoomRef = useRef(taskMapDefaultZoom);
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
  const [zoom, setZoom] = useState(taskMapDefaultZoom);
  const [panState, setPanState] = useState<PanState>(null);
  const [boardSize, setBoardSize] = useState<Point>({
    x: minimumBoardSize.width,
    y: minimumBoardSize.height,
  });
  const [viewportSize, setViewportSize] = useState<Point>({ x: 0, y: 0 });
  const [viewportRestore, setViewportRestore] = useState<{
    projectName: string;
    hasSavedView: boolean;
  } | null>(null);

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
    restoredViewportSizeRef.current = null;
    const saved = window.localStorage.getItem(getTaskMapViewStorageKey(projectName));

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<{ pan: Point; zoom: number }>;
        const savedZoom = clamp(
          Number(parsed.zoom ?? taskMapDefaultZoom),
          taskMapMinZoom,
          taskMapMaxZoom,
        );
        const savedPan = {
          x: Number(parsed.pan?.x ?? 0),
          y: Number(parsed.pan?.y ?? 0),
        };

        zoomRef.current = savedZoom;
        setZoom(savedZoom);
        setPan(savedPan);
        setViewportRestore({ projectName, hasSavedView: true });
        return;
      } catch {
        window.localStorage.removeItem(getTaskMapViewStorageKey(projectName));
      }
    }

    zoomRef.current = taskMapDefaultZoom;
    setZoom(taskMapDefaultZoom);
    setPan({ x: 0, y: 0 });
    setViewportRestore({ projectName, hasSavedView: false });
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

  useEffect(() => {
    if (!menuTaskId) {
      return;
    }

    function closeTaskMenu(event: PointerEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-task-menu-root]")
      ) {
        return;
      }

      setMenuTaskId("");
    }

    function closeTaskMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuTaskId("");
      }
    }

    window.addEventListener("pointerdown", closeTaskMenu);
    window.addEventListener("keydown", closeTaskMenuWithEscape);

    return () => {
      window.removeEventListener("pointerdown", closeTaskMenu);
      window.removeEventListener("keydown", closeTaskMenuWithEscape);
    };
  }, [menuTaskId]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!isReady || viewportRestore?.projectName !== projectName) {
      return;
    }

    window.localStorage.setItem(
      getTaskMapViewStorageKey(projectName),
      JSON.stringify({ pan, zoom }),
    );
  }, [isReady, pan, projectName, viewportRestore, zoom]);

  useEffect(() => {
    boardSizeRef.current = boardSize;
  }, [boardSize]);

  useEffect(() => {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const nextBoardSize = {
      x: Math.max(minimumBoardSize.width, rect.width / zoom),
      y: Math.max(minimumBoardSize.height, rect.height / zoom),
    };

    boardSizeRef.current = nextBoardSize;
    setBoardSize(nextBoardSize);
  }, [zoom]);

  useEffect(() => {
    const currentBoard = boardRef.current;

    if (!currentBoard) {
      return;
    }

    const observedBoard = currentBoard;

    function syncBoardSize() {
      const rect = observedBoard.getBoundingClientRect();
      const nextBoardSize = {
        x: Math.max(minimumBoardSize.width, rect.width / zoomRef.current),
        y: Math.max(minimumBoardSize.height, rect.height / zoomRef.current),
      };

      boardSizeRef.current = nextBoardSize;
      setBoardSize(nextBoardSize);
      setViewportSize({ x: rect.width, y: rect.height });
    }

    syncBoardSize();
    const observer = new ResizeObserver(syncBoardSize);
    observer.observe(observedBoard);

    return () => observer.disconnect();
  }, []);

  const projectTasks = useMemo(() => {
    return tasks.filter((task) => task.project === projectName);
  }, [projectName, tasks]);

  useEffect(() => {
    projectTasksRef.current = projectTasks;
  }, [projectTasks]);

  useEffect(() => {
    if (
      !isReady ||
      viewportRestore?.projectName !== projectName ||
      viewportSize.x === 0 ||
      viewportSize.y === 0 ||
      projectTasksRef.current.length === 0
    ) {
      return;
    }

    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    if (viewportRestore.hasSavedView) {
      const restoredViewportSize = restoredViewportSizeRef.current;

      if (!restoredViewportSize) {
        restoredViewportSizeRef.current = { x: viewportSize.x, y: viewportSize.y };
        return;
      }

      if (
        Math.abs(restoredViewportSize.x - viewportSize.x) < 2 &&
        Math.abs(restoredViewportSize.y - viewportSize.y) < 2
      ) {
        return;
      }
    }

    const nextFrame = getTaskFitFrame({
      boardSize: boardSizeRef.current,
      currentZoom: zoomRef.current,
      tasks: projectTasksRef.current,
      viewport: rect,
    });

    if (Math.abs(nextFrame.zoom - zoomRef.current) > 0.01) {
      setZoom(nextFrame.zoom);
    }

    setPan((current) => {
      if (
        Math.abs(current.x - nextFrame.pan.x) < 1 &&
        Math.abs(current.y - nextFrame.pan.y) < 1
      ) {
        return current;
      }

      return nextFrame.pan;
    });
  }, [isReady, projectName, viewportRestore, viewportSize.x, viewportSize.y]);

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

  const taskFlowZones = useMemo(
    () => createTaskFlowZones(boardSize),
    [boardSize],
  );

  const zoneCounts = useMemo(() => {
    return taskFlowZones.reduce<Record<BallTransferTarget, number>>(
      (counts, zone) => {
        counts[zone.id] = projectTasks.filter(
          (task) => getTaskTransferTarget(task) === zone.id,
        ).length;
        return counts;
      },
      { self: 0, other: 0, done: 0 },
    );
  }, [projectTasks, taskFlowZones]);

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
      x: (clientX - rect.left - rect.width / 2 - pan.x) / zoom + boardSize.x / 2,
      y: (clientY - rect.top - rect.height / 2 - pan.y) / zoom + boardSize.y / 2,
    };
  }

  function getViewportPointFromBoard(point: Point) {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: rect.left + rect.width / 2 + pan.x + (point.x - boardSize.x / 2) * zoom,
      y: rect.top + rect.height / 2 + pan.y + (point.y - boardSize.y / 2) * zoom,
    };
  }

  function moveCanvas(point: Point) {
    if (!panState || dragStateRef.current) {
      return;
    }

    setPan({
      x: panState.origin.x + point.x - panState.start.x,
      y: panState.origin.y + point.y - panState.start.y,
    });
  }

  function updateZoom(nextZoom: number) {
    setZoom(clamp(nextZoom, taskMapMinZoom, taskMapMaxZoom));
  }

  function getViewportZoneTarget(point: Point): BallTransferTarget {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return "self";
    }

    const topHeight = rect.top + rect.height * taskMapTopZoneRatio;

    if (point.y >= topHeight) {
      return "done";
    }

    return point.x < rect.left + rect.width / 2 ? "self" : "other";
  }

  function clampTaskIntoViewportZone(x: number, y: number, target: BallTransferTarget) {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x, y };
    }

    const topHeight = rect.height * taskMapTopZoneRatio;
    const cardViewportWidth = cardWidth * zoom;
    const cardViewportHeight = cardHeight * zoom;
    const gap = 16;
    const topMinY = rect.top + gap;
    const topMaxY = Math.max(
      topMinY,
      rect.top + topHeight - cardViewportHeight - gap,
    );
    const doneMinY = Math.min(
      Math.max(rect.top + gap, rect.top + topHeight + gap),
      rect.bottom - cardViewportHeight - gap,
    );
    const doneMaxY = Math.max(doneMinY, rect.bottom - cardViewportHeight - gap);
    const leftMinX = rect.left + gap;
    const leftMaxX = Math.max(
      leftMinX,
      rect.left + rect.width / 2 - cardViewportWidth - gap,
    );
    const rightMinX = Math.min(
      Math.max(leftMinX, rect.left + rect.width / 2 + gap),
      rect.right - cardViewportWidth - gap,
    );
    const rightMaxX = Math.max(rightMinX, rect.right - cardViewportWidth - gap);
    const viewportPoint = getViewportPointFromBoard({ x, y });
    const clampedViewportPoint =
      target === "self"
        ? {
            x: clamp(viewportPoint.x, leftMinX, leftMaxX),
            y: clamp(viewportPoint.y, topMinY, topMaxY),
          }
        : target === "other"
          ? {
              x: clamp(viewportPoint.x, rightMinX, rightMaxX),
              y: clamp(viewportPoint.y, topMinY, topMaxY),
            }
          : {
              x: clamp(viewportPoint.x, leftMinX, rect.right - cardViewportWidth - gap),
              y: clamp(viewportPoint.y, doneMinY, doneMaxY),
            };

    return getBoardPoint(clampedViewportPoint.x, clampedViewportPoint.y);
  }

  function getTaskPointFromPointer(clientX: number, clientY: number, drag: DragState) {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: drag.x, y: drag.y };
    }

    const gap = 16;
    const cardViewportWidth = cardWidth * zoom;
    const cardViewportHeight = cardHeight * zoom;
    const viewportX = clientX - drag.offsetX * zoom;
    const viewportY = clientY - drag.offsetY * zoom;
    const clampedViewportX = clamp(
      viewportX,
      rect.left + gap,
      Math.max(rect.left + gap, rect.right - cardViewportWidth - gap),
    );
    const clampedViewportY = clamp(
      viewportY,
      rect.top + gap,
      Math.max(rect.top + gap, rect.bottom - cardViewportHeight - gap),
    );

    return getBoardPoint(clampedViewportX, clampedViewportY);
  }

  function moveTask(event: ReactPointerEvent<HTMLElement>) {
    const currentDragState = dragStateRef.current;

    if (!currentDragState || !boardRef.current) {
      return;
    }

    const point = getTaskPointFromPointer(
      event.clientX,
      event.clientY,
      currentDragState,
    );
    const { x, y } = point;
    const nextDragState = { ...currentDragState, x, y };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);

    setTasks((current) =>
      current.map((task) =>
        task.id === currentDragState.id ? { ...task, x, y } : task,
      ),
    );
  }

  function finishMoving(event: ReactPointerEvent<HTMLElement>) {
    const currentDragState = dragStateRef.current;

    if (!currentDragState) {
      return;
    }

    const taskCenter = {
      x: currentDragState.x + cardWidth / 2,
      y: currentDragState.y + cardHeight / 2,
    };
    const zoneTarget = getViewportZoneTarget(getViewportPointFromBoard(taskCenter));
    const task = tasks.find((item) => item.id === currentDragState.id);
    const dropTarget = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-ball-target]");
    const finalTarget =
      dropTarget?.dataset.ballTarget
        ? (dropTarget.dataset.ballTarget as BallTransferTarget)
        : zoneTarget;
    const snappedPoint = clampTaskIntoViewportZone(
      currentDragState.x,
      currentDragState.y,
      finalTarget,
    );

    setTasks((current) =>
      current.map((item) =>
        item.id === currentDragState.id
          ? { ...item, x: snappedPoint.x, y: snappedPoint.y }
          : item,
      ),
    );

    if (task && getTaskTransferTarget(task) !== finalTarget) {
      transferBall(currentDragState.id, finalTarget);
    }

    dragStateRef.current = null;
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
      boardSize.x - cardWidth - 16,
    );
    const y = clamp(
      point.y - 28,
      16,
      boardSize.y - cardHeight - 16,
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
    setToast({ message: "タスクを作成しました。", undo: () => removeTask(newTask.id, false) });
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
    setMenuTaskId("");
    const nextDragState = {
      id: task.id,
      offsetX: point.x - task.x,
      offsetY: point.y - task.y,
      x: task.x,
      y: task.y,
    };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
    event.preventDefault();
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

  function disconnectTask(sourceId: string, targetId: string) {
    const beforeTask = tasks.find((task) => task.id === sourceId);

    setTasks((current) =>
      current.map((task) =>
        task.id === sourceId
          ? { ...task, links: task.links.filter((id) => id !== targetId) }
          : task,
      ),
    );
    setActiveTaskId(sourceId);
    setToast({
      message: "つながりを解除しました。",
      undo: () => {
        if (beforeTask) {
          setTasks((current) =>
            current.map((task) =>
              task.id === sourceId ? beforeTask : task,
            ),
          );
        }
      },
    });
  }

  function disconnectTaskLinks(sourceId: string, targetIds: string[]) {
    const beforeTask = tasks.find((task) => task.id === sourceId);

    setTasks((current) =>
      current.map((task) =>
        task.id === sourceId
          ? { ...task, links: task.links.filter((id) => !targetIds.includes(id)) }
          : task,
      ),
    );
    setActiveTaskId(sourceId);
    setToast({
      message: "つながりを解除しました。",
      undo: () => {
        if (beforeTask) {
          setTasks((current) =>
            current.map((task) =>
              task.id === sourceId ? beforeTask : task,
            ),
          );
        }
      },
    });
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

    const patch = getBallTransferPatch(target, beforeTask);

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
    setToast({ message: "タスクを作成しました。", undo: () => removeTask(newTask.id, false) });
  }

  function duplicateTask(task: Task) {
    const copy: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} の複製`,
      x: clamp(task.x + 36, 16, boardSize.x - cardWidth - 16),
      y: clamp(task.y + 36, 16, boardSize.y - cardHeight - 16),
      links: [],
      createdAt: new Date().toISOString(),
    };

    setTasks((current) => [copy, ...current]);
    setActiveTaskId(copy.id);
    setToast({ message: "タスクを複製しました。", undo: () => removeTask(copy.id, false) });
  }

  function removeTask(id: string, showToast = true) {
    const beforeTasks = tasks;
    const deletedTask = tasks.find((task) => task.id === id);
    const trashId = deletedTask ? `trash-task-${deletedTask.id}-${Date.now()}` : "";
    const remainingTasks = tasks.filter((task) => task.id !== id);

    if (showToast && deletedTask) {
      addTrashItem({
        id: trashId,
        kind: "task",
        ...createTrashDates(),
        task: deletedTask,
      });
    }

    setTasks(
      remainingTasks.map((task) => ({
        ...task,
        links: task.links.filter((targetId) => targetId !== id),
      })),
    );
    setActiveTaskId(
      remainingTasks.find((task) => task.project === projectName)?.id ?? "",
    );

    if (showToast) {
      setToast({
        message: "タスクを削除しました。",
        undo: () => {
          if (trashId) {
            removeTrashItem(trashId);
          }
          setTasks(beforeTasks);
        },
      });
    }
  }

  useEffect(() => {
    if (
      !isReady ||
      dragStateRef.current ||
      viewportSize.x === 0 ||
      viewportSize.y === 0 ||
      projectTasks.length === 0
    ) {
      return;
    }

    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const viewportKey = `${projectName}:${Math.round(viewportSize.x)}:${Math.round(
      viewportSize.y,
    )}:${Math.round(zoom * 100)}:${Math.round(pan.x)}:${Math.round(
      pan.y,
    )}:${Math.round(boardSize.x)}:${Math.round(boardSize.y)}`;

    if (reconciledViewportKeyRef.current === viewportKey) {
      return;
    }

    reconciledViewportKeyRef.current = viewportKey;

    const gap = 16;
    const cardViewportWidth = cardWidth * zoom;
    const cardViewportHeight = cardHeight * zoom;
    const topHeight = rect.height * taskMapTopZoneRatio;
    const topMinY = rect.top + gap;
    const topMaxY = Math.max(
      topMinY,
      rect.top + topHeight - cardViewportHeight - gap,
    );
    const doneMinY = Math.min(
      Math.max(rect.top + gap, rect.top + topHeight + gap),
      rect.bottom - cardViewportHeight - gap,
    );
    const doneMaxY = Math.max(doneMinY, rect.bottom - cardViewportHeight - gap);
    const leftMinX = rect.left + gap;
    const leftMaxX = Math.max(
      leftMinX,
      rect.left + rect.width / 2 - cardViewportWidth - gap,
    );
    const rightMinX = Math.min(
      Math.max(leftMinX, rect.left + rect.width / 2 + gap),
      rect.right - cardViewportWidth - gap,
    );
    const rightMaxX = Math.max(rightMinX, rect.right - cardViewportWidth - gap);
    const toViewport = (point: Point) => ({
      x: rect.left + rect.width / 2 + pan.x + (point.x - boardSize.x / 2) * zoom,
      y: rect.top + rect.height / 2 + pan.y + (point.y - boardSize.y / 2) * zoom,
    });
    const toBoard = (x: number, y: number) => ({
      x: (x - rect.left - rect.width / 2 - pan.x) / zoom + boardSize.x / 2,
      y: (y - rect.top - rect.height / 2 - pan.y) / zoom + boardSize.y / 2,
    });
    const getBounds = (target: BallTransferTarget) => {
      if (target === "self") {
        return { minX: leftMinX, maxX: leftMaxX, minY: topMinY, maxY: topMaxY };
      }

      if (target === "other") {
        return { minX: rightMinX, maxX: rightMaxX, minY: topMinY, maxY: topMaxY };
      }

      return {
        minX: leftMinX,
        maxX: Math.max(leftMinX, rect.right - cardViewportWidth - gap),
        minY: doneMinY,
        maxY: doneMaxY,
      };
    };

    setTasks((current) => {
      let changed = false;

      const nextTasks = current.map((task) => {
        if (task.project !== projectName) {
          return task;
        }

        const target = getTaskTransferTarget(task);
        const bounds = getBounds(target);
        const viewportPoint = toViewport({ x: task.x, y: task.y });
        const isInside =
          viewportPoint.x >= bounds.minX &&
          viewportPoint.x <= bounds.maxX &&
          viewportPoint.y >= bounds.minY &&
          viewportPoint.y <= bounds.maxY;

        if (isInside) {
          return task;
        }

        const snappedPoint = toBoard(
          clamp(viewportPoint.x, bounds.minX, bounds.maxX),
          clamp(viewportPoint.y, bounds.minY, bounds.maxY),
        );

        if (
          Math.abs(snappedPoint.x - task.x) < 0.5 &&
          Math.abs(snappedPoint.y - task.y) < 0.5
        ) {
          return task;
        }

        changed = true;
        return { ...task, x: snappedPoint.x, y: snappedPoint.y };
      });

      return changed ? nextTasks : current;
    });
  }, [
    boardSize.x,
    boardSize.y,
    isReady,
    pan.x,
    pan.y,
    projectName,
    projectTasks,
    viewportSize.x,
    viewportSize.y,
    zoom,
  ]);

  return (
    <div className="neo-shell flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 overflow-hidden text-zinc-100">
      <section className="grid shrink-0 gap-4 2xl:grid-cols-[minmax(22rem,0.75fr)_minmax(48rem,1.25fr)]">
        <div>
          <p className="neo-accent text-sm font-medium">プロジェクトマップ</p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-normal text-white">
            {projectName}
          </h1>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(24rem,1fr)_auto]">
          <div className="grid gap-3 md:grid-cols-[minmax(12rem,0.85fr)_minmax(18rem,1.15fr)]">
            <Link
              href="/portfolio"
              className="group flex min-h-20 items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.025] px-4 py-3 text-left transition hover:border-sky-200/35 hover:bg-sky-200/[0.06]"
            >
              <span>
                <span className="block text-xs font-medium text-slate-500">全体へ戻る</span>
                <span className="mt-1 block text-sm font-semibold text-slate-100">ポートフォリオ</span>
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-base text-slate-400 transition group-hover:border-sky-200/40 group-hover:text-sky-100">
                ←
              </span>
            </Link>
            <Link
              href="/tasks/projects"
              className="group flex min-h-20 items-center justify-between gap-3 rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-4 py-3 text-left shadow-lg shadow-sky-950/20 transition hover:border-sky-200/55 hover:bg-sky-200/[0.13]"
            >
              <span>
                <span className="block text-xs font-medium text-sky-200/70">予定で確認する</span>
                <span className="mt-1 block text-sm font-semibold text-sky-50">このプロジェクトのタスク一覧</span>
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-sky-200/30 text-base text-sky-100 transition group-hover:bg-sky-200/10">
                →
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3 xl:min-w-[28rem]">
            <SummaryTile label="タスク" value={projectTasks.length} />
            <SummaryTile label="内部リンク" value={projectLinks.length} />
            <SummaryTile label="期限超過" value={overdueCount} urgent />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="neo-surface min-h-20 rounded-md border p-4 text-left text-sm font-semibold text-sky-100 hover:bg-sky-300/10"
            >
              ＋ タスク
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_280px]">
        <section className={`${taskFlowViewportHeightClass} flex min-h-0 flex-col overflow-x-auto overflow-y-hidden rounded-lg border border-white/10 bg-slate-950/48 shadow-xl shadow-black/25 backdrop-blur-xl lg:overflow-hidden`}>
          <div className="flex min-w-[760px] flex-col items-start gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:min-w-0">
            <div>
              <h2 className="text-base font-semibold text-white">タスクフローマップ</h2>
              <p className="mt-1 max-w-[25rem] text-sm leading-6 text-slate-500 sm:max-w-none">
                タスクをドラッグして枠内に移動すると、状態が自動で更新されます。
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
                setPanState(null);
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
              dragStateRef.current = null;
              setDragState(null);
            }}
            onPointerLeave={() => {
              setPanState(null);
              dragStateRef.current = null;
              setDragState(null);
            }}
            onWheel={(event) => {
              if (event.shiftKey && Math.abs(event.deltaY) > 1) {
                event.preventDefault();
                updateZoom(zoom - event.deltaY * 0.001);
              }
            }}
            className="relative min-h-0 w-[760px] min-w-[760px] flex-1 overflow-hidden lg:w-auto lg:min-w-0"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.08),transparent_18rem),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />
            <div className="pointer-events-none absolute inset-0 z-0">
              {taskFlowZones.map((zone) => (
                <TaskFlowZone
                  key={zone.id}
                  count={zoneCounts[zone.id]}
                  zone={zone}
                />
              ))}
            </div>
            <div
              className={`absolute left-1/2 top-1/2 z-10 origin-center ${
                panState || dragState ? "transition-none" : "transition-transform duration-200"
              }`}
              style={{
                width: boardSize.x,
                height: boardSize.y,
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              }}
            >
              <svg
                className="pointer-events-none absolute inset-0 overflow-visible"
                width={boardSize.x}
                height={boardSize.y}
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
                  onComplete={(id) => updateTask(id, { status: "done", progress: 100 })}
                  onDuplicate={duplicateTask}
                  onMenuToggle={(id) => setMenuTaskId((current) => (current === id ? "" : id))}
                  onStartMoving={startMoving}
                  onSelect={(id) => {
                    setActiveTaskId(id);
                    setMenuTaskId("");
                  }}
                  onConnectStart={setLinkSourceId}
                  onConnectEnd={() => {
                    setLinkSourceId(null);
                    setDropTargetId(null);
                  }}
                  linkedTasks={task.links
                    .map((targetId) => taskMap.get(targetId))
                    .filter((target): target is Task => Boolean(target))}
                  onDropTarget={setDropTargetId}
                  onConnect={connectTasks}
                  onMove={moveTask}
                  onFinishMoving={finishMoving}
                  onDisconnect={disconnectTask}
                  onDisconnectLinks={disconnectTaskLinks}
                  onUpdate={(patch) => updateTask(task.id, patch)}
                  onRemove={removeTask}
                  onStatusChange={(status) => updateTask(task.id, { status })}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="neo-surface min-h-0 overflow-y-auto rounded-md border p-4">
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
  onConnectStart,
  onConnectEnd,
  linkedTasks,
  onDropTarget,
  onConnect,
  onMove,
  onFinishMoving,
  onDisconnect,
  onDisconnectLinks,
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
  onConnectStart: (id: string) => void;
  onConnectEnd: () => void;
  linkedTasks: Task[];
  onDropTarget: (id: string | null) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onFinishMoving: (event: ReactPointerEvent<HTMLElement>) => void;
  onDisconnect: (sourceId: string, targetId: string) => void;
  onDisconnectLinks: (sourceId: string, targetIds: string[]) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const ballMeta = getTaskBallMeta(task);
  const isOtherBall = ballMeta.label === "相手のボール";
  const [unlinkMenuOpen, setUnlinkMenuOpen] = useState(false);

  if (compact) {
    return (
      <article
        onPointerDown={(event) => onStartMoving(event, task)}
        onPointerMove={(event) => {
          event.stopPropagation();
          onMove(event);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          onFinishMoving(event);
        }}
        onPointerCancel={(event) => {
          event.stopPropagation();
          onFinishMoving(event);
        }}
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
        draggable={false}
        className={`absolute w-[236px] touch-none select-none overflow-visible rounded-lg border p-4 shadow-xl shadow-black/25 transition duration-200 hover:-translate-y-1 hover:border-sky-200/50 hover:bg-slate-900/95 ${
          active
            ? "z-30 border-sky-200/70 ring-2 ring-sky-200/15"
            : isOtherBall
              ? "border-amber-300/45 ring-2 ring-amber-300/15"
              : `border-white/12 ${priorityMeta[task.priority].ring}`
        } ${dropTarget ? "scale-[1.02] border-sky-200 ring-sky-200/40" : ""} ${
          linking ? "shadow-sky-950/50" : ""
        } ${isOtherBall ? "bg-amber-300/[0.055]" : "bg-slate-950/88"}`}
        style={{
          minHeight: cardHeight,
          left: task.x,
          top: task.y,
          zIndex: active ? 30 : 10,
        }}
      >
        {isOtherBall ? (
          <div className="absolute inset-y-0 left-0 w-1 bg-amber-300/75" aria-hidden="true" />
        ) : null}
        <select
          value={task.priority}
          onChange={(event) =>
            onUpdate({ priority: event.target.value as Task["priority"] })
          }
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={() => onSelect(task.id)}
          className={`absolute right-3 top-3 rounded-md border px-2 py-1 text-xs font-semibold outline-none ${priorityMeta[task.priority].badge}`}
          aria-label={`${task.title} の優先度`}
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>

        <div className="pr-12">
          <p className="text-xs text-slate-500">{statusMeta[task.status].label}</p>
          <textarea
            value={task.title}
            rows={2}
            onChange={(event) => onUpdate({ title: event.target.value })}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onFocus={() => onSelect(task.id)}
            className="mt-1 min-h-12 w-full resize-none rounded-md border border-transparent bg-white/[0.035] px-2 py-1 text-sm font-semibold leading-5 text-white outline-none transition placeholder:text-slate-600 hover:border-white/10 focus:border-sky-200/60 focus:bg-sky-200/[0.06]"
            aria-label={`${task.title} のタイトル`}
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>進捗 {task.progress}%</span>
          <span className="truncate">{task.currentBallHolder}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-sky-200" style={{ width: `${task.progress}%` }} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold ${ballMeta.tone} ${isOtherBall ? "shadow-sm shadow-amber-950/40" : ""}`}>
            {ballMeta.label}
          </span>
          {isOtherBall ? (
            <span className="min-w-0 truncate text-[11px] font-semibold text-amber-100">
              {ballMeta.detail}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
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
            className="whitespace-nowrap rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-2 py-1 text-[11px] font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            つなぐ
          </button>
          {linkedTasks.length > 0 ? (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setUnlinkMenuOpen((current) => !current);
              }}
              className="whitespace-nowrap rounded-md border border-slate-500/35 bg-slate-200/[0.04] px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              title="つながりを解除"
            >
              解除{linkedTasks.length > 1 ? ` ${linkedTasks.length}` : ""}
            </button>
          ) : null}
          <button
            type="button"
            data-task-menu-root
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onMenuToggle(task.id);
            }}
            className="whitespace-nowrap rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400 transition hover:bg-white/[0.06]"
            title="操作メニュー"
          >
            …
          </button>
        </div>

        {unlinkMenuOpen ? (
          <div
            className="absolute left-4 top-[calc(100%-0.35rem)] z-50 w-36 rounded-lg border border-slate-700 bg-slate-950/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onDisconnectLinks(task.id, linkedTasks.map((linkedTask) => linkedTask.id));
                setUnlinkMenuOpen(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-100 hover:bg-white/[0.07]"
            >
              解除
            </button>
            <button
              type="button"
              onClick={() => setUnlinkMenuOpen(false)}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/[0.07]"
            >
              元に戻す
            </button>
          </div>
        ) : null}

        {menuOpen ? (
          <TaskContextMenu
            task={task}
            linkedTasks={linkedTasks}
            onComplete={onComplete}
            onDisconnect={onDisconnect}
            onDuplicate={onDuplicate}
            onEdit={onSelect}
            onRemove={onRemove}
            onClose={() => onMenuToggle(task.id)}
          />
        ) : null}
      </article>
    );
  }

  return (
    <article
      onPointerDown={(event) => onStartMoving(event, task)}
      onPointerMove={(event) => {
        event.stopPropagation();
        onMove(event);
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        onFinishMoving(event);
      }}
      onPointerCancel={(event) => {
        event.stopPropagation();
        onFinishMoving(event);
      }}
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
      draggable={false}
      className={`neo-card absolute touch-none select-none rounded-md border p-4 pt-10 ring-2 transition ${
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
        data-task-menu-root
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
          linkedTasks={linkedTasks}
          onComplete={onComplete}
          onDisconnect={onDisconnect}
          onDuplicate={onDuplicate}
          onEdit={onSelect}
          onRemove={onRemove}
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
        className="min-h-24 w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-[15px] leading-7 text-slate-100 shadow-inner shadow-black/30 outline-none transition placeholder:text-slate-600 hover:border-sky-200/30 hover:bg-slate-950/82 focus:border-sky-200/70 focus:bg-sky-950/25 focus:ring-2 focus:ring-sky-200/10"
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
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["todo", "doing", "done"] as TaskStatus[]).map((status) => (
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

function TaskFlowZone({
  zone,
  count,
}: {
  zone: TaskFlowZoneDefinition;
  count: number;
}) {
  const statusLabel = zone.id === "done" ? "完了" : "進行中";
  const topHeight = `${taskMapTopZoneRatio * 100}%`;
  const doneHeight = `${(1 - taskMapTopZoneRatio) * 100}%`;
  const fixedStyle =
    zone.id === "self"
      ? { left: 0, top: 0, width: "50%", height: topHeight }
      : zone.id === "other"
        ? { left: "50%", top: 0, width: "50%", height: topHeight }
        : { left: 0, top: topHeight, width: "100%", height: doneHeight };

  return (
    <section
      className={`pointer-events-none absolute rounded-2xl border border-dashed p-4 shadow-2xl lg:p-7 ${zone.tone}`}
      style={fixedStyle}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3 lg:gap-4">
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-base font-semibold shadow-lg lg:h-12 lg:w-12 lg:text-lg ${
              zone.id === "self"
                ? "border-sky-300/50 bg-sky-300/15 text-sky-100 shadow-sky-950/40"
                : zone.id === "other"
                  ? "border-amber-300/50 bg-amber-300/15 text-amber-100 shadow-amber-950/40"
                  : "border-emerald-300/45 bg-emerald-300/15 text-emerald-100 shadow-emerald-950/40"
            }`}
          >
            {zone.icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-normal text-white lg:text-2xl">
              {zone.label}
            </h3>
            <p className="mt-1 max-w-[10rem] text-xs leading-5 text-slate-300/75 lg:max-w-none lg:text-sm">
              {zone.description}
            </p>
          </div>
        </div>
        <div
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold lg:gap-2 lg:px-3 lg:text-sm ${
            zone.id === "self"
              ? "border-sky-300/45 bg-sky-300/10 text-sky-100"
              : zone.id === "other"
                ? "border-amber-300/45 bg-amber-300/10 text-amber-100"
                : "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          <span>{count}</span>
          <span>{statusLabel}</span>
        </div>
      </div>
      {zone.id === "done" ? (
        <div className="mt-4 grid place-items-center text-center text-slate-300/70 lg:mt-5">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-xl text-emerald-100 lg:h-12 lg:w-12 lg:text-2xl">
            ✓
          </div>
          <p className="mt-2 text-xs leading-5 lg:text-xs lg:leading-5">
            ここにタスクを移動すると
            <br />
            完了として記録されます
          </p>
        </div>
      ) : null}
    </section>
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
  linkedTasks,
  onEdit,
  onDuplicate,
  onDisconnect,
  onRemove,
  onComplete,
  onClose,
}: {
  task: Task;
  linkedTasks: Task[];
  onEdit: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onDisconnect: (sourceId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  onComplete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div data-task-menu-root className="absolute left-2 top-11 z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-950/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <button type="button" onClick={() => { onEdit(task.id); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">編集</button>
      <button type="button" onClick={() => { onDuplicate(task); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">複製</button>
      <button type="button" onClick={() => { onComplete(task.id); onClose(); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]">完了</button>
      {linkedTasks.length > 0 ? (
        <div className="mt-1 border-t border-white/10 pt-1">
          <p className="px-3 py-1 text-[11px] font-semibold text-slate-500">
            つながりを解除
          </p>
          {linkedTasks.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => {
                onDisconnect(task.id, target.id);
                onClose();
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/[0.06]"
              title={`${target.title} へのつながりを解除`}
            >
              <span className="block truncate">→ {target.title}</span>
              <span className="text-[10px] text-slate-500">解除</span>
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" onClick={() => { onRemove(task.id); onClose(); }} className="mt-1 block w-full rounded-md border-t border-white/10 px-3 py-2 text-left text-sm text-red-200 hover:bg-red-400/10">削除</button>
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

function getBallTransferPatch(
  target: BallTransferTarget,
  task: Task,
): Partial<Task> {
  const restoredProgress =
    task.status === "done" ? task.previousProgress ?? 0 : task.progress;

  if (target === "self") {
    return {
      currentBallHolder: "あなた",
      ballHoldingStartedAt: todayString(),
      status: "doing",
      progress: restoredProgress,
      previousProgress: undefined,
    };
  }

  if (target === "other") {
    return {
      currentBallHolder: "相手",
      ballHoldingStartedAt: todayString(),
      status: "todo",
      progress: restoredProgress,
      previousProgress: undefined,
    };
  }

  return {
    currentBallHolder: "なし",
    ballHoldingStartedAt: todayString(),
    status: "done",
    previousProgress:
      task.status === "done" ? task.previousProgress : task.progress,
    progress: 100,
  };
}

function getBallTransferLabel(target: BallTransferTarget) {
  const transferTarget = ballTransferTargets.find((item) => item.id === target);
  return transferTarget?.label ?? "移動先";
}

function getTaskTransferTarget(task: Task): BallTransferTarget {
  if (task.status === "done") {
    return "done";
  }

  if (task.currentBallHolder === "あなた") {
    return "self";
  }

  return "other";
}

function getTaskMapViewStorageKey(projectName: string) {
  return `${taskMapViewStoragePrefix}${encodeURIComponent(projectName)}`;
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


