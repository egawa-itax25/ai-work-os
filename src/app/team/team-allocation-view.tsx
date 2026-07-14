"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Task,
  TaskPriority,
  TaskStatus,
  initialTasks,
  isOverdue,
  normalizeTasks,
  storageKey,
} from "../tasks/task-data";

type ViewMode = "orbit" | "list" | "load";
type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;

type EmployeeNode = {
  name: string;
  initials: string;
  tasks: Task[];
  projects: string[];
  averageProgress: number;
  overdue: number;
  active: number;
};

const nonPeople = new Set(["顧客", "AI", "なし", "未設定", "人事チーム"]);

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

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      return;
    }

    try {
      setTasks(normalizeTasks(JSON.parse(saved)));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function commitTasks(nextTasks: Task[]) {
    setTasks(nextTasks);
    window.localStorage.setItem(storageKey, JSON.stringify(nextTasks));
  }

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== "archived"),
    [tasks],
  );

  const projects = useMemo(
    () => Array.from(new Set(activeTasks.map((task) => task.project))).sort(),
    [activeTasks],
  );

  const employees = useMemo(() => buildEmployeeNodes(activeTasks), [activeTasks]);

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((task) => {
      const memberMatches = memberFilter === "all" || task.owner === memberFilter;
      const statusMatches = statusFilter === "all" || task.status === statusFilter;
      const projectMatches = projectFilter === "all" || task.project === projectFilter;
      const priorityMatches =
        priorityFilter === "all" || task.priority === priorityFilter;

      return memberMatches && statusMatches && projectMatches && priorityMatches;
    });
  }, [activeTasks, memberFilter, priorityFilter, projectFilter, statusFilter]);

  const visibleEmployees = useMemo(
    () => buildEmployeeNodes(filteredTasks),
    [filteredTasks],
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

      <section className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
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
              onTaskDragStart={handleTaskDragStart}
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
  onTaskDragStart,
  onMemberDragEnter,
  onMemberDrop,
}: {
  employees: EmployeeNode[];
  taskPool: Task[];
  draggingTaskId: string;
  hoveredMember: string;
  onTaskDragStart: (event: DragEvent<HTMLElement>, taskId: string) => void;
  onMemberDragEnter: (member: string) => void;
  onMemberDrop: (event: DragEvent<HTMLElement>, member: string) => void;
}) {
  return (
    <div className="relative z-10 min-h-[680px]">
      <div className="absolute left-6 top-6 grid h-32 w-48 place-items-center rounded-[2rem] border border-white/25 bg-slate-950/72 text-center shadow-[0_0_60px_rgba(125,211,252,0.14)] backdrop-blur-xl">
        <div>
          <p className="text-xs text-zinc-400">全体プロジェクト</p>
          <p className="mt-2 text-4xl font-semibold text-white">{new Set(taskPool.map((task) => task.project)).size}</p>
          <p className="mt-1 text-sm text-zinc-400">プロジェクト</p>
        </div>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-45" aria-hidden="true">
        <circle cx="50%" cy="50%" r="190" fill="none" stroke="rgba(148,163,184,0.18)" strokeDasharray="4 10" />
        <circle cx="50%" cy="50%" r="285" fill="none" stroke="rgba(148,163,184,0.12)" />
      </svg>

      {employees.map((employee, index) => {
        const position = getOrbitPosition(index, employees.length);
        const isHovered = hoveredMember === employee.name;

        return (
          <section
            key={employee.name}
            onDragOver={(event) => {
              event.preventDefault();
              onMemberDragEnter(employee.name);
            }}
            onDragLeave={() => onMemberDragEnter("")}
            onDrop={(event) => onMemberDrop(event, employee.name)}
            className={`absolute w-48 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border p-3 text-center backdrop-blur-xl transition ${
              isHovered
                ? "scale-105 border-sky-200 bg-sky-300/15 shadow-[0_0_38px_rgba(125,211,252,0.22)]"
                : "border-white/15 bg-slate-950/68"
            }`}
            style={{ left: position.left, top: position.top }}
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/[0.05] shadow-inner">
              <div>
                <p className="text-lg font-semibold text-white">{employee.initials}</p>
                <p className="text-[11px] text-zinc-400">{employee.averageProgress}%</p>
              </div>
            </div>
            <h2 className="mt-2 text-sm font-semibold text-white">{employee.name}</h2>
            <p className="text-xs text-zinc-500">{employee.projects.length}プロジェクト / {employee.active}タスク</p>
            <div className="mt-3 space-y-1.5">
              {employee.tasks.slice(0, 3).map((task) => (
                <TaskPill
                  key={task.id}
                  task={task}
                  isDragging={draggingTaskId === task.id}
                  onDragStart={onTaskDragStart}
                />
              ))}
            </div>
          </section>
        );
      })}
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
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
    if (task.owner) {
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
        tasks: ownedTasks,
        projects,
        averageProgress,
        overdue: ownedTasks.filter(
          (task) => task.status !== "done" && isOverdue(task.dueDate),
        ).length,
        active: ownedTasks.filter((task) => task.status !== "done").length,
      };
    });
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

function getOrbitPosition(index: number, total: number) {
  if (total === 1) {
    return { left: "50%", top: "42%" };
  }

  const columns = total <= 6 ? 3 : 4;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rowCount = Math.ceil(total / columns);
  const horizontalStep = 78 / Math.max(columns - 1, 1);
  const verticalStep = 52 / Math.max(rowCount - 1, 1);
  const left = 11 + column * horizontalStep;
  const top = 36 + row * verticalStep;

  return {
    left: `${left}%`,
    top: `${top}%`,
  };
}
