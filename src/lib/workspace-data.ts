export type TaskStatus = "todo" | "doing" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type EnergyLevel = "low" | "medium" | "high";

export type VaultFrontmatter = {
  date: string;
  tags: string[];
  project: string;
  related: string[];
};

export type TaskRecord = VaultFrontmatter & {
  id: string;
  title: string;
  summary: string;
  owner: string;
  people: string[];
  dictionary: string[];
  thoughtProcess: string;
  status: TaskStatus;
  priority: TaskPriority;
  importance: number;
  urgency: number;
  estimate: string;
  energy: EnergyLevel;
  deadline: string;
  depends: string[];
  lane: "now" | "next" | "later";
  x: number;
  y: number;
};

export type ProjectRecord = VaultFrontmatter & {
  id: string;
  name: string;
  state: "active" | "planning" | "blocked";
  version: string;
  roadmap: string[];
  todo: number;
  blocker: string;
};

export type KnowledgeRecord = VaultFrontmatter & {
  id: string;
  title: string;
  kind: "api" | "library" | "environment" | "pattern";
  summary: string;
};

export const tasks: TaskRecord[] = [
  {
    id: "task-001",
    title: "知識庫タスク設計",
    summary: "マークダウンからタスクを生成するための先頭メタ情報を整える。",
    owner: "設計AI",
    people: ["プロダクト", "AIエージェント"],
    dictionary: ["先頭メタ情報", "一覧抽出", "唯一の情報源"],
    thoughtProcess: "知識庫を正にして、画面は常にマークダウンから導ける形に保つ。",
    status: "doing",
    priority: "high",
    importance: 5,
    urgency: 4,
    estimate: "2時間",
    energy: "medium",
    deadline: "2026-07-08",
    depends: [],
    project: "AI仕事基盤",
    tags: ["タスク", "知識庫"],
    related: ["Knowledge/mistakes.md"],
    date: "2026-07-06",
    lane: "now",
    x: 18,
    y: 18,
  },
  {
    id: "task-002",
    title: "マークダウン取込",
    summary: "知識庫ノートを将来読み込むための境界とデータ形状を準備する。",
    owner: "実装AI",
    people: ["開発", "ナレッジ管理"],
    dictionary: ["マークダウン解析", "知識庫", "接続層"],
    thoughtProcess: "まず読み取り境界を薄く作り、知識庫の構造変更に耐える。",
    status: "todo",
    priority: "medium",
    importance: 4,
    urgency: 3,
    estimate: "4時間",
    energy: "high",
    deadline: "2026-07-12",
    depends: ["task-001"],
    project: "AI仕事基盤",
    tags: ["マークダウン", "取込"],
    related: ["Projects/ai-task-os.md"],
    date: "2026-07-06",
    lane: "next",
    x: 390,
    y: 132,
  },
  {
    id: "task-003",
    title: "空間キャンバス操作",
    summary: "依存関係と知識リンクを、触って理解できる空間ノードとして整える。",
    owner: "画面設計AI",
    people: ["画面デザイン", "プロダクト"],
    dictionary: ["空間キャンバス", "流れ", "依存関係図"],
    thoughtProcess: "一覧ではなく、仕事の流れを直接操作する体験を優先する。",
    status: "blocked",
    priority: "high",
    importance: 5,
    urgency: 2,
    estimate: "6時間",
    energy: "high",
    deadline: "2026-07-16",
    depends: ["task-002"],
    project: "AI仕事基盤",
    tags: ["キャンバス", "画面設計"],
    related: ["Decisions/2026-07-06-ui-direction.md"],
    date: "2026-07-06",
    lane: "later",
    x: 732,
    y: 36,
  },
  {
    id: "task-004",
    title: "好みの記憶ビュー",
    summary: "長期的なUI方針や作業の好みを、静かな設定面として見える化する。",
    owner: "記憶AI",
    people: ["ユーザー", "AIエージェント"],
    dictionary: ["好み", "第二の脳", "記憶"],
    thoughtProcess: "一時的な会話ではなく、将来の判断に効く好みだけを残す。",
    status: "todo",
    priority: "low",
    importance: 3,
    urgency: 2,
    estimate: "3時間",
    energy: "low",
    deadline: "2026-07-20",
    depends: [],
    project: "AI仕事基盤",
    tags: ["好み", "設定"],
    related: ["Preferences/ui.md"],
    date: "2026-07-06",
    lane: "later",
    x: 520,
    y: 330,
  },
];

export const projects: ProjectRecord[] = [
  {
    id: "project-001",
    name: "AI仕事基盤",
    state: "active",
    version: "0.1.0",
    roadmap: ["空間画面基盤", "マークダウン取込", "タスク関係図", "AIエージェント連携"],
    todo: 7,
    blocker: "マークダウン読み取り境界が未実装。",
    date: "2026-07-06",
    project: "AI仕事基盤",
    tags: ["中核"],
    related: ["Tasks/2026-07-06-task.md"],
  },
  {
    id: "project-002",
    name: "知識庫記憶層",
    state: "planning",
    version: "0.0.1",
    roadmap: ["先頭メタ情報契約", "改善記録", "意思決定リンク"],
    todo: 4,
    blocker: "ファイルシステムAdapter設計が必要。",
    date: "2026-07-06",
    project: "知識庫記憶層",
    tags: ["知識庫"],
    related: ["Knowledge/mistakes.md"],
  },
];

export const knowledge: KnowledgeRecord[] = [
  {
    id: "knowledge-001",
    title: "先頭メタ情報契約",
    kind: "pattern",
    summary: "すべての永続ノートは日付、タグ、プロジェクト、関連情報を持つ。",
    date: "2026-07-06",
    project: "AI仕事基盤",
    tags: ["知識庫", "メタ情報"],
    related: [".cursor/rules/01-obsidian.mdc"],
  },
  {
    id: "knowledge-002",
    title: "将来のマークダウン取込",
    kind: "environment",
    summary: "画面データは、将来のマークダウン解析結果を受け取れる形にしておく。",
    date: "2026-07-06",
    project: "AI仕事基盤",
    tags: ["マークダウン", "接続層"],
    related: ["Tasks/2026-07-06-task.md"],
  },
  {
    id: "knowledge-003",
    title: "操作感の動き層",
    kind: "library",
    summary: "穏やかな遷移と自然なドラッグで、触って気持ちいい操作を作る。",
    date: "2026-07-06",
    project: "AI仕事基盤",
    tags: ["動き", "画面設計"],
    related: [".cursor/rules/04-ui.mdc"],
  },
];

export const lanes = [
  { id: "now", label: "今" },
  { id: "next", label: "次" },
  { id: "later", label: "あとで" },
] as const;

export function getTaskLinks() {
  return tasks.flatMap((task) =>
    task.depends.map((dependencyId) => ({
      from: dependencyId,
      to: task.id,
    })),
  );
}
