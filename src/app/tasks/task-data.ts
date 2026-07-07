export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  description: string;
  owner: string;
  project: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  x: number;
  y: number;
  links: string[];
  createdAt: string;
};

type StoredTask = Partial<Task> & {
  id: string;
  title: string;
};

export const storageKey = "codex-task-manager-map:v2";
export const defaultProject = "営業改善";

export const statusMeta: Record<TaskStatus, { label: string; tone: string }> = {
  todo: {
    label: "未着手",
    tone: "border-zinc-600 bg-zinc-800 text-zinc-200",
  },
  doing: {
    label: "進行中",
    tone: "border-amber-400/50 bg-amber-400/10 text-amber-200",
  },
  done: {
    label: "完了",
    tone: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
  },
};

export const priorityMeta: Record<
  TaskPriority,
  { label: string; ring: string; badge: string; rank: number }
> = {
  high: {
    label: "高",
    ring: "ring-red-400/60",
    badge: "border-red-400/50 bg-red-400/10 text-red-200",
    rank: 0,
  },
  medium: {
    label: "中",
    ring: "ring-violet-400/50",
    badge: "border-violet-400/50 bg-violet-400/10 text-violet-200",
    rank: 1,
  },
  low: {
    label: "低",
    ring: "ring-zinc-500/60",
    badge: "border-zinc-500 bg-zinc-800 text-zinc-300",
    rank: 2,
  },
};

export const initialTasks: Task[] = [
  {
    id: "sample-1",
    title: "見積依頼への返信",
    description: "追加質問を整理して、回答案を作成する。",
    owner: "佐藤",
    project: "営業改善",
    dueDate: todayOffset(0),
    status: "todo",
    priority: "high",
    x: 72,
    y: 90,
    links: ["sample-2"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    title: "提案資料を更新",
    description: "新しい料金表と導入手順を差し替える。",
    owner: "田中",
    project: "営業改善",
    dueDate: todayOffset(2),
    status: "doing",
    priority: "medium",
    x: 420,
    y: 220,
    links: ["sample-3"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    title: "週次レポート確認",
    description: "未完了と期限超過の件数を確認する。",
    owner: "山田",
    project: "運用安定化",
    dueDate: todayOffset(4),
    status: "done",
    priority: "low",
    x: 760,
    y: 110,
    links: [],
    createdAt: new Date().toISOString(),
  },
];

export function normalizeTasks(tasks: StoredTask[]): Task[] {
  return tasks.map((task, index) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    owner: task.owner ?? "未設定",
    project: task.project ?? defaultProject,
    dueDate: task.dueDate ?? todayOffset(1),
    status: task.status ?? "todo",
    priority: task.priority ?? "medium",
    x: task.x ?? 80 + ((index * 72) % 620),
    y: task.y ?? 120 + ((index * 96) % 340),
    links: task.links ?? [],
    createdAt: task.createdAt ?? new Date().toISOString(),
  }));
}

export function todayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isOverdue(value: string) {
  if (!value) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${value}T00:00:00`);
  return dueDate < today;
}

export function formatDate(value: string) {
  if (!value) {
    return "未設定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}
