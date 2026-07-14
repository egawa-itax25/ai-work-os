export type TaskStatus = "todo" | "doing" | "done" | "archived";
export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  description: string;
  owner: string;
  currentBallHolder: string;
  ballHoldingStartedAt: string;
  project: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  previousProgress?: number;
  nextAction: string;
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
export const remoteStorageKey = "tasks";
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
  archived: {
    label: "アーカイブ",
    tone: "border-zinc-700 bg-zinc-900 text-zinc-500",
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
    currentBallHolder: "あなた",
    ballHoldingStartedAt: todayOffset(-1),
    project: "営業改善",
    dueDate: todayOffset(0),
    status: "todo",
    priority: "high",
    progress: 15,
    nextAction: "追加質問を3つに絞る",
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
    currentBallHolder: "田中",
    ballHoldingStartedAt: todayOffset(0),
    project: "営業改善",
    dueDate: todayOffset(2),
    status: "doing",
    priority: "medium",
    progress: 55,
    nextAction: "料金表を最新化する",
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
    currentBallHolder: "なし",
    ballHoldingStartedAt: todayOffset(-3),
    project: "運用安定化",
    dueDate: todayOffset(4),
    status: "done",
    priority: "low",
    progress: 100,
    nextAction: "完了済み",
    x: 760,
    y: 110,
    links: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-a-1",
    title: "設計書作成",
    description: "画面構成と主要導線を確定し、顧客確認へ回す。",
    owner: "あなた",
    currentBallHolder: "あなた",
    ballHoldingStartedAt: todayOffset(-1),
    project: "A社リニューアル",
    dueDate: todayOffset(1),
    status: "doing",
    priority: "high",
    progress: 64,
    nextAction: "顧客確認用の設計書を出す",
    x: 80,
    y: 110,
    links: ["portfolio-a-2"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-a-2",
    title: "デザイン確認",
    description: "トップページと問い合わせ導線の修正点を整理する。",
    owner: "山田太郎",
    currentBallHolder: "顧客",
    ballHoldingStartedAt: todayOffset(0),
    project: "A社リニューアル",
    dueDate: todayOffset(3),
    status: "todo",
    priority: "medium",
    progress: 20,
    nextAction: "確認観点を顧客へ送る",
    x: 440,
    y: 250,
    links: ["portfolio-a-3"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-a-3",
    title: "実装着手",
    description: "確定した設計をもとに主要コンポーネントを作成する。",
    owner: "佐藤",
    currentBallHolder: "佐藤",
    ballHoldingStartedAt: todayOffset(0),
    project: "A社リニューアル",
    dueDate: todayOffset(5),
    status: "todo",
    priority: "medium",
    progress: 0,
    nextAction: "設計確定後に着手する",
    x: 780,
    y: 150,
    links: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-b-1",
    title: "要件回答待ち",
    description: "連携対象システムと権限範囲の回答を顧客へ依頼中。",
    owner: "佐藤花子",
    currentBallHolder: "顧客",
    ballHoldingStartedAt: todayOffset(-5),
    project: "B社システム導入",
    dueDate: todayOffset(0),
    status: "todo",
    priority: "high",
    progress: 15,
    nextAction: "顧客へ回答期限を確認する",
    x: 90,
    y: 160,
    links: ["portfolio-b-2"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-b-2",
    title: "初期設定",
    description: "回答後に環境変数と接続情報を設定する。",
    owner: "田中",
    currentBallHolder: "田中",
    ballHoldingStartedAt: todayOffset(0),
    project: "B社システム導入",
    dueDate: todayOffset(4),
    status: "todo",
    priority: "medium",
    progress: 0,
    nextAction: "接続情報を受け取る",
    x: 460,
    y: 300,
    links: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-closing-1",
    title: "資料分類",
    description: "AIで証憑と月次資料を分類し、確認対象を抽出する。",
    owner: "AI",
    currentBallHolder: "AI",
    ballHoldingStartedAt: todayOffset(0),
    project: "決算業務効率化",
    dueDate: todayOffset(1),
    status: "doing",
    priority: "medium",
    progress: 42,
    nextAction: "AI分類結果を確認する",
    x: 120,
    y: 130,
    links: ["portfolio-closing-2"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-closing-2",
    title: "確認ルール作成",
    description: "例外処理とレビュー観点をDataview互換で整理する。",
    owner: "田中一郎",
    currentBallHolder: "田中一郎",
    ballHoldingStartedAt: todayOffset(0),
    project: "決算業務効率化",
    dueDate: todayOffset(3),
    status: "todo",
    priority: "medium",
    progress: 0,
    nextAction: "例外パターンを洗い出す",
    x: 530,
    y: 260,
    links: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-recruiting-1",
    title: "面談日程の確定",
    description: "人事チームから候補者候補日を回収する。",
    owner: "鈴木美咲",
    currentBallHolder: "人事チーム",
    ballHoldingStartedAt: todayOffset(-3),
    project: "採用プロジェクト",
    dueDate: todayOffset(-1),
    status: "todo",
    priority: "high",
    progress: 10,
    nextAction: "人事チームに候補日を依頼する",
    x: 100,
    y: 150,
    links: ["portfolio-recruiting-2"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-recruiting-2",
    title: "評価シート更新",
    description: "面談観点とスコア基準を最新の募集要件へ合わせる。",
    owner: "人事チーム",
    currentBallHolder: "人事チーム",
    ballHoldingStartedAt: todayOffset(-1),
    project: "採用プロジェクト",
    dueDate: todayOffset(2),
    status: "todo",
    priority: "medium",
    progress: 25,
    nextAction: "評価項目を3段階に整理する",
    x: 500,
    y: 270,
    links: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-ops-1",
    title: "監視項目の確認",
    description: "通知ノイズを減らし、重要な異常だけを残す。",
    owner: "あなた",
    currentBallHolder: "あなた",
    ballHoldingStartedAt: todayOffset(0),
    project: "運用安定化",
    dueDate: todayOffset(1),
    status: "doing",
    priority: "medium",
    progress: 72,
    nextAction: "不要な通知ルールを止める",
    x: 120,
    y: 150,
    links: ["portfolio-ops-2"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-ops-2",
    title: "週次運用レビュー",
    description: "対応時間と再発リスクを短くまとめる。",
    owner: "山田太郎",
    currentBallHolder: "山田太郎",
    ballHoldingStartedAt: todayOffset(0),
    project: "運用安定化",
    dueDate: todayOffset(4),
    status: "todo",
    priority: "low",
    progress: 0,
    nextAction: "レビュー観点を準備する",
    x: 500,
    y: 260,
    links: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "portfolio-archive-1",
    title: "移行済みノート確認",
    description: "旧ナレッジから移行済みのノートを最終確認する。",
    owner: "AI",
    currentBallHolder: "なし",
    ballHoldingStartedAt: todayOffset(-2),
    project: "社内ナレッジ移行",
    dueDate: todayOffset(-2),
    status: "done",
    priority: "low",
    progress: 100,
    nextAction: "完了済み",
    x: 160,
    y: 160,
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
    currentBallHolder: task.currentBallHolder ?? task.owner ?? "未設定",
    ballHoldingStartedAt: task.ballHoldingStartedAt ?? todayOffset(0),
    project: task.project ?? defaultProject,
    dueDate: task.dueDate ?? todayOffset(1),
    status: task.status ?? "todo",
    priority: task.priority ?? "medium",
    progress: Math.min(Math.max(task.progress ?? 0, 0), 100),
    previousProgress:
      typeof task.previousProgress === "number"
        ? Math.min(Math.max(task.previousProgress, 0), 100)
        : undefined,
    nextAction: task.nextAction ?? "",
    x: task.x ?? 80 + ((index * 72) % 620),
    y: task.y ?? 120 + ((index * 96) % 340),
    links: task.links ?? [],
    createdAt: task.createdAt ?? new Date().toISOString(),
  }));
}

export function normalizeTaskList(value: unknown): Task[] {
  return Array.isArray(value) ? normalizeTasks(value) : initialTasks;
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
