"use client";

import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import {
  Task,
  TaskPriority,
  TaskStatus,
  initialTasks,
  isOverdue,
  normalizeTaskList,
  priorityMeta,
  remoteStorageKey,
  storageKey,
  statusMeta,
} from "../tasks/task-data";
import { loadSyncedState, saveSyncedState } from "@/lib/synced-storage";

type ViewMode = "orbit" | "list" | "load";
type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;

type EmployeeNode = {
  name: string;
  initials: string;
  role: string;
  tasks: Task[];
  projects: string[];
  averageProgress: number;
  overdue: number;
  waiting: number;
  active: number;
  loadLabel: string;
  isSample?: boolean;
};

const nonPeople = new Set(["顧客", "AI", "なし", "未設定", "人事チーム"]);
const sampleOwnerPrefix = "team-sample";

const memberProfiles: Record<string, { role: string }> = {
  あなた: { role: "代表 / 管理者" },
  山田太郎: { role: "PM / 業務設計" },
  山田: { role: "運用担当" },
  佐藤: { role: "営業支援" },
  佐藤花子: { role: "顧客対応" },
  田中: { role: "導入担当" },
  田中一郎: { role: "開発連携" },
  鈴木美咲: { role: "人事 / 採用" },
  AI: { role: "AI処理" },
};

export default function TeamAllocationView() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [mode, setMode] = useState<ViewMode>("orbit");
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [hoveredMember, setHoveredMember] = useState("");
  const [lastMove, setLastMove] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");

  useEffect(() => {
    void loadSyncedState({
      localKey: storageKey,
      remoteKey: remoteStorageKey,
      fallback: initialTasks,
      normalize: normalizeTaskList,
      onValue: setTasks,
    });
  }, []);

  function commitTasks(nextTasks: Task[]) {
    setTasks(nextTasks);
    void saveSyncedState(storageKey, remoteStorageKey, nextTasks);
  }

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== "archived"),
    [tasks],
  );

  const displayTasks = useMemo(() => withTeamScaleSamples(activeTasks), [activeTasks]);

  const projects = useMemo(
    () => Array.from(new Set(displayTasks.map((task) => task.project))).sort(),
    [displayTasks],
  );

  const employees = useMemo(() => buildEmployeeNodes(displayTasks), [displayTasks]);

  const filteredTasks = useMemo(() => {
    return displayTasks.filter((task) => {
      const memberMatches = memberFilter === "all" || task.owner === memberFilter;
      const statusMatches = statusFilter === "all" || task.status === statusFilter;
      const projectMatches = projectFilter === "all" || task.project === projectFilter;
      const priorityMatches =
        priorityFilter === "all" || task.priority === priorityFilter;

      return memberMatches && statusMatches && projectMatches && priorityMatches;
    });
  }, [displayTasks, memberFilter, priorityFilter, projectFilter, statusFilter]);

  const visibleEmployees = useMemo(
    () => buildEmployeeNodes(filteredTasks),
    [filteredTasks],
  );

  const selectedTask = useMemo(
    () => filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0],
    [filteredTasks, selectedTaskId],
  );

  const totalProjects = new Set(filteredTasks.map((task) => task.project)).size;
  const completedTasks = filteredTasks.filter((task) => task.status === "done").length;
  const overdueTasks = filteredTasks.filter(
    (task) => task.status !== "done" && isOverdue(task.dueDate),
  ).length;
  const averageProgress =
    filteredTasks.length === 0
      ? 0
      : Math.round(
          filteredTasks.reduce((total, task) => total + task.progress, 0) /
            filteredTasks.length,
        );

  function assignTaskToMember(taskId: string, memberName: string) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) {
      setLastMove("サンプルタスクは担当変更の動作確認用です。実タスクをドラッグすると保存されます。");
      setDraggingTaskId("");
      setHoveredMember("");
      return;
    }

    commitTasks(
      tasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              owner: memberName,
            }
          : item,
      ),
    );
    setLastMove(`${task.title} を ${memberName} さんへ割り振りました`);
    setDraggingTaskId("");
    setHoveredMember("");
  }

  function updateSelectedTask(taskId: string, patch: Partial<Task>) {
    if (taskId.startsWith(sampleOwnerPrefix)) {
      setLastMove("サンプルタスクは編集プレビュー用です。実タスクを選択すると保存できます。");
      return;
    }

    commitTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }

  function handleTaskDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    setDraggingTaskId(taskId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }

  function handleMemberDrop(event: DragEvent<HTMLElement>, memberName: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;
    assignTaskToMember(taskId, memberName);
  }

  return (
    <div className="neo-shell min-h-[calc(100vh-4rem)] space-y-5 text-zinc-100">
      <section className="grid gap-4 2xl:grid-cols-[minmax(18rem,0.6fr)_minmax(42rem,1.4fr)]">
        <div>
          <p className="neo-accent text-sm font-medium">全体プロジェクト</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-white">
            従業員ごとの仕事を俯瞰
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            全員のプロジェクトとタスクを一画面で見ながら、タスクを社員へドラッグして担当を割り振れます。
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <SummaryTile label="メンバー" value={`${employees.length}人`} />
          <SummaryTile label="プロジェクト" value={`${totalProjects}件`} />
          <SummaryTile label="進行中タスク" value={`${filteredTasks.length - completedTasks}件`} />
          <SummaryTile label="期限超過" value={`${overdueTasks}件`} urgent={overdueTasks > 0} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
        <aside className="space-y-4">
          <Panel title="ビュー">
            <SegmentedButton
              active={mode}
              items={[
                { id: "orbit", label: "宇宙マップ" },
                { id: "list", label: "リストビュー" },
                { id: "load", label: "負荷ビュー" },
              ]}
              onChange={(value) => setMode(value as ViewMode)}
            />
          </Panel>

          <Panel title="フィルター">
            <SelectField
              label="メンバー"
              value={memberFilter}
              onChange={setMemberFilter}
              options={[
                { value: "all", label: "すべてのメンバー" },
                ...employees.map((employee) => ({
                  value: employee.name,
                  label: employee.name,
                })),
              ]}
            />
            <SelectField
              label="状態"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
              options={[
                { value: "all", label: "すべての状態" },
                { value: "todo", label: "未着手" },
                { value: "doing", label: "進行中" },
                { value: "done", label: "完了" },
              ]}
            />
            <SelectField
              label="プロジェクト"
              value={projectFilter}
              onChange={setProjectFilter}
              options={[
                { value: "all", label: "すべてのプロジェクト" },
                ...projects.map((project) => ({ value: project, label: project })),
              ]}
            />
            <SelectField
              label="優先度"
              value={priorityFilter}
              onChange={(value) => setPriorityFilter(value as PriorityFilter)}
              options={[
                { value: "all", label: "すべての優先度" },
                { value: "high", label: "高" },
                { value: "medium", label: "中" },
                { value: "low", label: "低" },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setMemberFilter("all");
                setStatusFilter("all");
                setProjectFilter("all");
                setPriorityFilter("all");
              }}
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
            >
              フィルターをクリア
            </button>
          </Panel>

          <Panel title="操作">
            <p className="text-sm leading-6 text-zinc-400">
              タスクの小さなラベルを社員ノードへドラッグすると、担当者だけが切り替わります。
            </p>
            {lastMove ? (
              <p className="mt-3 rounded-md border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs leading-5 text-sky-100">
                {lastMove}
              </p>
            ) : null}
          </Panel>
        </aside>

        <main className="neo-surface relative min-h-[680px] overflow-hidden rounded-md border">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1.6px)] [background-size:78px_78px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.08),transparent_23rem),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.10),transparent_25rem)]" />

          {mode === "orbit" ? (
            <OrbitMap
              employees={visibleEmployees}
              taskPool={filteredTasks}
              draggingTaskId={draggingTaskId}
              hoveredMember={hoveredMember}
              selectedTaskId={selectedTask?.id ?? ""}
              onTaskDragStart={handleTaskDragStart}
              onTaskSelect={setSelectedTaskId}
              onMemberDragEnter={setHoveredMember}
              onMemberDrop={handleMemberDrop}
            />
          ) : null}

          {mode === "list" ? (
            <EmployeeList
              employees={visibleEmployees}
              onTaskDragStart={handleTaskDragStart}
              onMemberDrop={handleMemberDrop}
              setHoveredMember={setHoveredMember}
              hoveredMember={hoveredMember}
            />
          ) : null}

          {mode === "load" ? <LoadView employees={visibleEmployees} /> : null}
        </main>

        <TaskInspector
          task={selectedTask}
          employees={employees}
          isSample={selectedTask?.id.startsWith(sampleOwnerPrefix) ?? false}
          onUpdate={updateSelectedTask}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="総タスク" value={`${filteredTasks.length}件`} />
        <SummaryTile label="完了タスク" value={`${completedTasks}件`} />
        <SummaryTile label="平均進捗" value={`${averageProgress}%`} />
        <SummaryTile label="割り振り待ち" value={`${filteredTasks.filter((task) => task.owner === "未設定").length}件`} />
      </section>
    </div>
  );
}

function OrbitMap({
  employees,
  taskPool,
  draggingTaskId,
  hoveredMember,
  selectedTaskId,
  onTaskDragStart,
  onTaskSelect,
  onMemberDragEnter,
  onMemberDrop,
}: {
  employees: EmployeeNode[];
  taskPool: Task[];
  draggingTaskId: string;
  hoveredMember: string;
  selectedTaskId: string;
  onTaskDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onTaskSelect: (taskId: string) => void;
  onMemberDragEnter: (member: string) => void;
  onMemberDrop: (event: DragEvent<HTMLElement>, member: string) => void;
}) {
  const featuredEmployees = employees.slice(0, 15);
  const centerProjects = new Set(taskPool.map((task) => task.project)).size;

  return (
    <div className="relative z-10 min-h-[680px] p-5">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <svg className="h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id="teamMapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(125,211,252,0.12)" />
              <stop offset="100%" stopColor="rgba(125,211,252,0)" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="49%" r="190" fill="url(#teamMapGlow)" stroke="rgba(148,163,184,0.14)" />
          <circle cx="50%" cy="49%" r="315" fill="none" stroke="rgba(148,163,184,0.10)" strokeDasharray="4 12" />
        </svg>
      </div>

      <div className="absolute left-1/2 top-1/2 z-20 grid h-36 w-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-slate-950/75 text-center shadow-[0_0_70px_rgba(125,211,252,0.18)] backdrop-blur-xl">
        <div>
          <p className="text-xs text-zinc-400">全体プロジェクト</p>
          <p className="mt-2 text-4xl font-semibold text-white">{centerProjects}</p>
          <p className="mt-1 text-sm text-zinc-400">プロジェクト</p>
        </div>
      </div>

      <div className="relative z-10 grid min-h-[640px] grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {featuredEmployees.map((employee) => {
        const isHovered = hoveredMember === employee.name;
        const hasRisk = employee.overdue > 0 || employee.active >= 8;

        return (
          <section
            key={employee.name}
            onDragOver={(event) => {
              event.preventDefault();
              onMemberDragEnter(employee.name);
            }}
            onDragLeave={() => onMemberDragEnter("")}
            onDrop={(event) => onMemberDrop(event, employee.name)}
            className={`relative min-h-[270px] rounded-md border p-4 backdrop-blur-xl transition ${
              isHovered
                ? "border-sky-200 bg-sky-300/12 shadow-[0_0_34px_rgba(125,211,252,0.18)]"
                : hasRisk
                  ? "border-red-200/25 bg-slate-950/62"
                  : "border-white/12 bg-slate-950/58"
            }`}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-50" aria-hidden="true">
              {employee.tasks.slice(0, 4).map((_, index) => (
                <path
                  key={index}
                  d={`M 104 74 C 155 ${95 + index * 34}, 165 ${112 + index * 34}, 205 ${116 + index * 34}`}
                  fill="none"
                  stroke="rgba(125,211,252,0.20)"
                  strokeWidth="1"
                />
              ))}
            </svg>

            <div className="relative z-10 flex items-start gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.05] shadow-inner">
                <div className="text-center">
                  <p className="text-lg font-semibold text-white">{employee.initials}</p>
                  <p className="text-[11px] text-zinc-400">{employee.averageProgress}%</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white">{employee.name}</h2>
                    <p className="truncate text-xs text-zinc-500">{employee.role}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${hasRisk ? "border-red-300/35 bg-red-300/10 text-red-200" : "border-sky-200/30 bg-sky-300/10 text-sky-100"}`}>
                    {employee.loadLabel}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <MetricChip label="プロジェクト" value={`${employee.projects.length}件`} />
                  <MetricChip label="タスク" value={`${employee.tasks.length}件`} />
                  <MetricChip label="期限超過" value={`${employee.overdue}件`} urgent={employee.overdue > 0} />
                  <MetricChip label="相手待ち" value={`${employee.waiting}件`} />
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-4 ml-14 space-y-2">
              {employee.tasks.slice(0, 4).map((task) => (
                <TaskNode
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  isDragging={draggingTaskId === task.id}
                  onSelect={onTaskSelect}
                  onDragStart={onTaskDragStart}
                />
              ))}
              {employee.tasks.length === 0 ? (
                <div className="rounded-md border border-dashed border-white/10 px-3 py-5 text-center text-xs text-zinc-500">
                  割り振り待ちのタスクはありません
                </div>
              ) : null}
              {employee.tasks.length > 4 ? (
                <p className="pl-2 text-xs text-zinc-500">ほか {employee.tasks.length - 4}件</p>
              ) : null}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}

function EmployeeList({
  employees,
  hoveredMember,
  onTaskDragStart,
  onMemberDrop,
  setHoveredMember,
}: {
  employees: EmployeeNode[];
  hoveredMember: string;
  onTaskDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onMemberDrop: (event: DragEvent<HTMLElement>, member: string) => void;
  setHoveredMember: (member: string) => void;
}) {
  return (
    <div className="relative z-10 grid gap-4 p-5 lg:grid-cols-2">
      {employees.map((employee) => (
        <section
          key={employee.name}
          onDragOver={(event) => {
            event.preventDefault();
            setHoveredMember(employee.name);
          }}
          onDragLeave={() => setHoveredMember("")}
          onDrop={(event) => onMemberDrop(event, employee.name)}
          className={`rounded-md border p-4 backdrop-blur-xl transition ${
            hoveredMember === employee.name
              ? "border-sky-200 bg-sky-300/12"
              : "border-white/10 bg-slate-950/58"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">{employee.name}</h2>
              <p className="text-sm text-zinc-500">{employee.projects.length}プロジェクト</p>
            </div>
            <span className="rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-200">
              {employee.tasks.length}件
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {employee.tasks.map((task) => (
              <TaskPill key={task.id} task={task} onDragStart={onTaskDragStart} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LoadView({ employees }: { employees: EmployeeNode[] }) {
  const maxTasks = Math.max(...employees.map((employee) => employee.active), 1);

  return (
    <div className="relative z-10 p-6">
      <div className="space-y-4">
        {employees.map((employee) => {
          const width = Math.max(8, Math.round((employee.active / maxTasks) * 100));

          return (
            <div key={employee.name} className="rounded-md border border-white/10 bg-slate-950/62 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">{employee.name}</h2>
                  <p className="text-sm text-zinc-500">
                    {employee.active}タスク / 平均進捗 {employee.averageProgress}%
                  </p>
                </div>
                <span className={employee.overdue > 0 ? "text-sm font-semibold text-red-200" : "text-sm text-zinc-400"}>
                  期限超過 {employee.overdue}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-200"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskNode({
  task,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
}: {
  task: Task;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (taskId: string) => void;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
}) {
  const status = statusMeta[task.status];
  const priority = priorityMeta[task.priority];
  const overdue = task.status !== "done" && isOverdue(task.dueDate);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={() => onSelect(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(task.id);
        }
      }}
      onDragStart={(event) => onDragStart(event, task.id)}
      className={`group relative cursor-grab rounded-md border px-3 py-2.5 text-left shadow-lg shadow-black/20 transition active:cursor-grabbing ${
        isSelected
          ? "border-sky-200/70 bg-sky-300/14"
          : "border-white/12 bg-slate-900/82 hover:border-sky-200/40 hover:bg-sky-300/10"
      } ${isDragging ? "opacity-50" : ""}`}
      title="選択して詳細を確認。ドラッグで担当者を変更。"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">
            {task.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{task.project}</p>
        </div>
        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${priority.badge}`}>
          {priority.label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className={`rounded-full border px-2 py-0.5 ${status.tone}`}>
          {status.label}
        </span>
        <span className={overdue ? "font-semibold text-red-200" : "text-zinc-500"}>
          {formatDate(task.dueDate)}
        </span>
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className={urgent ? "mt-0.5 font-semibold text-red-200" : "mt-0.5 font-semibold text-zinc-100"}>
        {value}
      </p>
    </div>
  );
}

function TaskInspector({
  task,
  employees,
  isSample,
  onUpdate,
}: {
  task?: Task;
  employees: EmployeeNode[];
  isSample: boolean;
  onUpdate: (taskId: string, patch: Partial<Task>) => void;
}) {
  if (!task) {
    return (
      <aside className="neo-surface rounded-md border p-4">
        <h2 className="text-sm font-semibold text-white">タスク詳細</h2>
        <p className="mt-4 text-sm leading-6 text-zinc-500">
          タスクを選択すると、ここで詳細確認と編集ができます。
        </p>
      </aside>
    );
  }

  const employeeOptions = employees
    .filter((employee) => !employee.isSample)
    .map((employee) => employee.name);

  return (
    <aside className="neo-surface max-h-[680px] overflow-y-auto rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-sky-100">タスク詳細</p>
          <h2 className="mt-1 text-lg font-semibold leading-6 text-white">
            {task.title}
          </h2>
        </div>
        <span className={isSample ? "rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100" : "rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[11px] font-semibold text-emerald-100"}>
          {isSample ? "サンプル" : "自動保存"}
        </span>
      </div>

      {isSample ? (
        <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
          これは人数感を確認するためのサンプルです。実タスクを選択すると編集内容が保存されます。
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        <InputField
          label="タスク名"
          value={task.title}
          disabled={isSample}
          onChange={(value) => onUpdate(task.id, { title: value })}
        />
        <TextareaField
          label="詳細"
          value={task.description}
          disabled={isSample}
          onChange={(value) => onUpdate(task.id, { description: value })}
        />
        <SelectField
          label="担当者"
          value={task.owner}
          onChange={(value) => onUpdate(task.id, { owner: value })}
          options={[
            { value: task.owner, label: task.owner },
            ...employeeOptions
              .filter((name) => name !== task.owner)
              .map((name) => ({ value: name, label: name })),
          ]}
        />
        <InputField
          label="現在のボール"
          value={task.currentBallHolder}
          disabled={isSample}
          onChange={(value) => onUpdate(task.id, { currentBallHolder: value })}
        />
        <InputField
          label="プロジェクト"
          value={task.project}
          disabled={isSample}
          onChange={(value) => onUpdate(task.id, { project: value })}
        />
        <InputField
          label="期限"
          type="date"
          value={task.dueDate}
          disabled={isSample}
          onChange={(value) => onUpdate(task.id, { dueDate: value })}
        />
        <SelectField
          label="状態"
          value={task.status}
          onChange={(value) => onUpdate(task.id, { status: value as TaskStatus })}
          options={[
            { value: "todo", label: "未着手" },
            { value: "doing", label: "進行中" },
            { value: "done", label: "完了" },
          ]}
        />
        <SelectField
          label="優先度"
          value={task.priority}
          onChange={(value) => onUpdate(task.id, { priority: value as TaskPriority })}
          options={[
            { value: "high", label: "高" },
            { value: "medium", label: "中" },
            { value: "low", label: "低" },
          ]}
        />
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">進捗</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={task.progress}
              disabled={isSample}
              onChange={(event) => onUpdate(task.id, { progress: Number(event.target.value) })}
              className="w-full accent-sky-200"
            />
            <span className="w-12 text-right text-sm font-semibold text-zinc-100">
              {task.progress}%
            </span>
          </div>
        </label>
        <TextareaField
          label="次のアクション"
          value={task.nextAction}
          disabled={isSample}
          onChange={(value) => onUpdate(task.id, { nextAction: value })}
        />
      </div>
    </aside>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="neo-input mt-1 min-h-11 w-full rounded-md border border-white/10 bg-slate-950/80 px-3 text-sm text-zinc-100 outline-none transition focus:border-sky-200/50 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="neo-input mt-1 min-h-24 w-full resize-y rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition focus:border-sky-200/50 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function TaskPill({
  task,
  isDragging = false,
  onDragStart,
}: {
  task: Task;
  isDragging?: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      className={`cursor-grab rounded-full border border-white/10 bg-slate-900/82 px-3 py-2 text-left text-xs shadow-lg shadow-black/20 transition active:cursor-grabbing ${
        isDragging ? "opacity-50" : "hover:border-sky-200/35 hover:bg-sky-300/10"
      }`}
      title="社員ノードへドラッグして担当を変更"
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${task.status === "done" ? "bg-emerald-300" : task.priority === "high" ? "bg-red-300" : "bg-sky-200"}`} />
        <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{task.title}</span>
      </div>
      <p className="mt-1 truncate text-[11px] text-zinc-500">{task.project}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="neo-surface rounded-md border p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function SegmentedButton({
  active,
  items,
  onChange,
}: {
  active: string;
  items: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`min-h-11 rounded-md border px-3 text-left text-sm font-semibold transition ${
            active === item.id
              ? "border-sky-200/50 bg-sky-300/10 text-white"
              : "border-white/10 bg-white/[0.025] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="neo-input mt-1 min-h-11 w-full rounded-md border border-white/10 bg-slate-950/80 px-3 text-sm text-zinc-100 outline-none focus:border-sky-200/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryTile({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className="neo-surface rounded-md border p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={urgent ? "mt-1 text-2xl font-semibold text-red-300" : "mt-1 text-2xl font-semibold text-white"}>
        {value}
      </p>
    </div>
  );
}

function buildEmployeeNodes(tasks: Task[]): EmployeeNode[] {
  const names = new Set<string>();

  for (const task of tasks) {
    if (task.owner && !nonPeople.has(task.owner)) {
      names.add(task.owner);
    }

    if (task.currentBallHolder && !nonPeople.has(task.currentBallHolder)) {
      names.add(task.currentBallHolder);
    }
  }

  return Array.from(names)
    .sort()
    .map((name) => {
      const ownedTasks = tasks.filter((task) => task.owner === name);
      const projects = Array.from(new Set(ownedTasks.map((task) => task.project)));
      const averageProgress =
        ownedTasks.length === 0
          ? 0
          : Math.round(
              ownedTasks.reduce((total, task) => total + task.progress, 0) /
                ownedTasks.length,
            );

      return {
        name,
        initials: getInitials(name),
        role: getMemberRole(name),
        tasks: ownedTasks,
        projects,
        averageProgress,
        overdue: ownedTasks.filter(
          (task) => task.status !== "done" && isOverdue(task.dueDate),
        ).length,
        waiting: ownedTasks.filter(
          (task) =>
            task.status !== "done" &&
            task.currentBallHolder !== task.owner &&
            !["なし", "未設定"].includes(task.currentBallHolder),
        ).length,
        active: ownedTasks.filter((task) => task.status !== "done").length,
        loadLabel: getLoadLabel(ownedTasks),
        isSample: ownedTasks.length > 0 && ownedTasks.every((task) => task.id.startsWith(sampleOwnerPrefix)),
      };
    });
}

function withTeamScaleSamples(tasks: Task[]) {
  const people = new Set(
    tasks
      .flatMap((task) => [task.owner, task.currentBallHolder])
      .filter((name) => name && !nonPeople.has(name)),
  );

  if (people.size >= 10) {
    return tasks;
  }

  const samples = createTeamSampleTasks();
  const needed = Math.max(0, 10 - people.size);
  const selectedOwners = Array.from(new Set(samples.map((task) => task.owner))).slice(0, needed);

  return [
    ...tasks,
    ...samples.filter((task) => selectedOwners.includes(task.owner)),
  ];
}

function createTeamSampleTasks(): Task[] {
  const today = new Date().toISOString().slice(0, 10);
  const sampleGroups: Array<{
    owner: string;
    role: string;
    project: string;
    tasks: Array<[string, TaskStatus, TaskPriority, number, string]>;
  }> = [
    {
      owner: "高橋美咲",
      role: "UXデザイナー",
      project: "顧客体験改善",
      tasks: [
        ["UI/UX改善案", "doing", "medium", 55, "2026-07-24"],
        ["ブランドガイド更新", "todo", "medium", 10, "2026-07-27"],
      ],
    },
    {
      owner: "伊藤直太",
      role: "バックエンド",
      project: "基盤強化",
      tasks: [
        ["セキュリティ監査", "doing", "high", 40, "2026-07-23"],
        ["アクセス権限見直し", "todo", "medium", 0, "2026-07-29"],
      ],
    },
    {
      owner: "中村優子",
      role: "採用 / 広報",
      project: "採用プロジェクト",
      tasks: [
        ["求人プロセス最適化", "doing", "medium", 70, "2026-07-25"],
        ["面接フロー設計", "todo", "low", 20, "2026-07-31"],
      ],
    },
    {
      owner: "小林莉奈",
      role: "カスタマーサクセス",
      project: "顧客支援",
      tasks: [
        ["顧客ドキュメント更新", "todo", "medium", 25, "2026-07-26"],
        ["全体研修実施", "done", "low", 100, "2026-07-20"],
      ],
    },
    {
      owner: "渡辺直樹",
      role: "データ分析",
      project: "分析基盤",
      tasks: [
        ["認証基盤更新", "todo", "high", 12, "2026-07-22"],
        ["商品フィードバック整理", "doing", "medium", 45, "2026-07-30"],
      ],
    },
    {
      owner: "加藤愛",
      role: "QA / 品質管理",
      project: "品質改善",
      tasks: [
        ["テスト仕様作成", "doing", "medium", 52, "2026-07-28"],
        ["品質改善タスク", "todo", "low", 8, "2026-08-01"],
      ],
    },
    {
      owner: "吉田昇",
      role: "マーケティング",
      project: "市場開拓",
      tasks: [
        ["マーケ戦略立案", "doing", "medium", 60, "2026-07-26"],
        ["SNS広告制作", "todo", "low", 15, "2026-07-30"],
      ],
    },
    {
      owner: "松本孝成",
      role: "総務",
      project: "社内プロセス改善",
      tasks: [
        ["会議・稟議管理", "doing", "low", 65, "2026-07-25"],
        ["業務フロー改善", "todo", "medium", 18, "2026-08-02"],
      ],
    },
  ];

  return sampleGroups.flatMap((group, groupIndex) =>
    group.tasks.map(([title, status, priority, progress, dueDate], taskIndex) => ({
      id: `${sampleOwnerPrefix}-${groupIndex + 1}-${taskIndex + 1}`,
      title,
      description: `${group.project}に関する確認用サンプルタスクです。`,
      owner: group.owner,
      currentBallHolder: taskIndex === 0 ? group.owner : "顧客",
      ballHoldingStartedAt: today,
      project: group.project,
      dueDate,
      status,
      priority,
      progress,
      nextAction: "次の確認事項を整理する",
      x: 0,
      y: 0,
      links: [],
      createdAt: today,
    })),
  );
}

function getMemberRole(name: string) {
  return memberProfiles[name]?.role ?? "メンバー";
}

function getLoadLabel(tasks: Task[]) {
  const active = tasks.filter((task) => task.status !== "done").length;
  const overdue = tasks.filter((task) => task.status !== "done" && isOverdue(task.dueDate)).length;

  if (overdue > 0) {
    return "要確認";
  }

  if (active >= 8) {
    return "高負荷";
  }

  if (active <= 2) {
    return "余裕あり";
  }

  return "通常";
}

function formatDate(value: string) {
  if (!value) {
    return "期限なし";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getInitials(name: string) {
  if (name === "あなた") {
    return "自";
  }

  if (name === "未設定") {
    return "未";
  }

  const compact = name.replace(/\s/g, "");
  return compact.slice(0, 2).toUpperCase();
}
