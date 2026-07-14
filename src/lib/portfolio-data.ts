export type PortfolioStatus =
  | "healthy"
  | "attention"
  | "waiting"
  | "stalled"
  | "ai-processing"
  | "done";

export type BallHolderType = "self" | "customer" | "member" | "ai" | "none";

export type PortfolioProjectOrigin = "manual" | "task";

export type PriorityScorePart = {
  label: string;
  value: number;
};

export type PortfolioProject = {
  id: string;
  origin: PortfolioProjectOrigin;
  rank: number;
  name: string;
  objective: string;
  owner: string;
  dueDate: string;
  currentBallHolder: string;
  ballHolderType: BallHolderType;
  ballHoldingDays: number;
  progress: number;
  status: PortfolioStatus;
  stalledCount: number;
  deadlineRisk: "none" | "attention" | "critical";
  businessImportance: number;
  downstreamImpact: number;
  dueImpact: number;
  nextMilestone: string;
  aiSuggestion?: string;
  risk?: string;
  x: number;
  y: number;
};

export type PortfolioFilter =
  | "all"
  | "self"
  | "waiting"
  | "ai-processing"
  | "stalled"
  | "healthy"
  | "attention"
  | "done";

export const portfolioFilters: { id: PortfolioFilter; label: string }[] = [
  { id: "all", label: "すべてのプロジェクト" },
  { id: "self", label: "自分がボールを保持" },
  { id: "waiting", label: "相手待ち" },
  { id: "ai-processing", label: "AI処理中" },
  { id: "stalled", label: "停滞中" },
  { id: "healthy", label: "順調" },
  { id: "attention", label: "要注意" },
  { id: "done", label: "完了" },
];

export const portfolioStorageKey = "ai-work-os:portfolio-projects:v1";
export const portfolioRemoteStorageKey = "portfolio-projects";

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "portfolio-a-renewal",
    origin: "task",
    rank: 1,
    name: "A社リニューアル",
    objective: "既存サイトを営業導線として再設計し、問い合わせ率を改善する。",
    owner: "山田太郎",
    dueDate: "2026-07-18",
    currentBallHolder: "あなた",
    ballHolderType: "self",
    ballHoldingDays: 1,
    progress: 68,
    status: "attention",
    stalledCount: 0,
    deadlineRisk: "attention",
    businessImportance: 15,
    downstreamImpact: 25,
    dueImpact: 28,
    nextMilestone: "設計書を顧客確認へ回す",
    aiSuggestion: "設計書作成を完了すると後続3件が進みます。",
    risk: "確認待ちが増えると来週の実装開始がずれます。",
    x: 150,
    y: 120,
  },
  {
    id: "portfolio-b-system",
    origin: "task",
    rank: 2,
    name: "B社システム導入",
    objective: "基幹システムとの連携を安定させ、手作業の転記を減らす。",
    owner: "佐藤花子",
    dueDate: "2026-07-22",
    currentBallHolder: "顧客",
    ballHolderType: "customer",
    ballHoldingDays: 5,
    progress: 54,
    status: "waiting",
    stalledCount: 1,
    deadlineRisk: "attention",
    businessImportance: 12,
    downstreamImpact: 22,
    dueImpact: 20,
    nextMilestone: "顧客から要件回答を受け取る",
    aiSuggestion: "顧客回答待ちが5日続いています。",
    risk: "回答が明日までに来ない場合、3日遅れる可能性があります。",
    x: 520,
    y: 180,
  },
  {
    id: "portfolio-closing",
    origin: "task",
    rank: 3,
    name: "決算業務効率化",
    objective: "決算資料の収集と分類を自動化し、レビュー時間を短縮する。",
    owner: "田中一郎",
    dueDate: "2026-07-26",
    currentBallHolder: "AI",
    ballHolderType: "ai",
    ballHoldingDays: 0,
    progress: 42,
    status: "ai-processing",
    stalledCount: 0,
    deadlineRisk: "none",
    businessImportance: 14,
    downstreamImpact: 15,
    dueImpact: 18,
    nextMilestone: "AI分類結果を確認する",
    aiSuggestion: "AIの資料整理がまもなく完了します。",
    x: 850,
    y: 110,
  },
  {
    id: "portfolio-recruiting",
    origin: "task",
    rank: 4,
    name: "採用プロジェクト",
    objective: "候補者体験を崩さず、面談から評価までのリードタイムを短縮する。",
    owner: "鈴木美咲",
    dueDate: "2026-07-15",
    currentBallHolder: "人事チーム",
    ballHolderType: "member",
    ballHoldingDays: 3,
    progress: 31,
    status: "stalled",
    stalledCount: 2,
    deadlineRisk: "critical",
    businessImportance: 10,
    downstreamImpact: 12,
    dueImpact: 22,
    nextMilestone: "面談日程を確定する",
    aiSuggestion: "面談日程の確定で停滞2件が解消します。",
    risk: "候補者対応が止まっています。",
    x: 330,
    y: 390,
  },
  {
    id: "portfolio-ops",
    origin: "task",
    rank: 5,
    name: "運用安定化",
    objective: "通知と監視を整え、障害対応の初動を安定させる。",
    owner: "山田太郎",
    dueDate: "2026-07-30",
    currentBallHolder: "あなた",
    ballHolderType: "self",
    ballHoldingDays: 0,
    progress: 76,
    status: "healthy",
    stalledCount: 0,
    deadlineRisk: "none",
    businessImportance: 9,
    downstreamImpact: 8,
    dueImpact: 10,
    nextMilestone: "監視項目を棚卸しする",
    x: 720,
    y: 430,
  },
  {
    id: "portfolio-archive",
    origin: "task",
    rank: 6,
    name: "社内ナレッジ移行",
    objective: "散らばった社内知識をVaultへ移し、AI検索の土台を作る。",
    owner: "AI",
    dueDate: "2026-07-12",
    currentBallHolder: "なし",
    ballHolderType: "none",
    ballHoldingDays: 0,
    progress: 100,
    status: "done",
    stalledCount: 0,
    deadlineRisk: "none",
    businessImportance: 6,
    downstreamImpact: 4,
    dueImpact: 0,
    nextMilestone: "移行済みノートを最終確認する",
    x: 1050,
    y: 330,
  },
];

export type StoredPortfolioProject = Partial<PortfolioProject> & {
  id: string;
  name: string;
};

export function normalizePortfolioProjects(
  projects: StoredPortfolioProject[],
): PortfolioProject[] {
  return projects.map((project, index) => ({
    id: project.id,
    origin: project.origin ?? "manual",
    rank: project.rank ?? index + 1,
    name: project.name,
    objective: project.objective ?? "",
    owner: project.owner ?? "未設定",
    dueDate: project.dueDate ?? "",
    currentBallHolder: project.currentBallHolder ?? "未設定",
    ballHolderType: project.ballHolderType ?? "member",
    ballHoldingDays: project.ballHoldingDays ?? 0,
    progress: clampNumber(project.progress ?? 0, 0, 100),
    status: project.status ?? "healthy",
    stalledCount: project.stalledCount ?? 0,
    deadlineRisk: project.deadlineRisk ?? "none",
    businessImportance: project.businessImportance ?? 8,
    downstreamImpact: project.downstreamImpact ?? 8,
    dueImpact: project.dueImpact ?? 8,
    nextMilestone: project.nextMilestone ?? "次の一手を決める",
    aiSuggestion: project.aiSuggestion,
    risk: project.risk,
    x: project.x ?? 120 + ((index * 180) % 820),
    y: project.y ?? 120 + ((index * 110) % 420),
  }));
}

export function normalizePortfolioProjectList(value: unknown): PortfolioProject[] {
  return Array.isArray(value) ? normalizePortfolioProjects(value) : portfolioProjects;
}

export function getPriorityBreakdown(project: PortfolioProject): PriorityScorePart[] {
  return [
    { label: "期限への影響", value: project.dueImpact },
    { label: "後続タスクへの影響", value: project.downstreamImpact },
    {
      label: "自分がボールを保持",
      value: project.ballHolderType === "self" ? 20 : 0,
    },
    { label: "事業重要度", value: project.businessImportance },
    {
      label: "停滞リスク",
      value: project.status === "stalled" ? 16 : project.stalledCount * 4,
    },
  ];
}

export function getPriorityScore(project: PortfolioProject) {
  return Math.min(
    100,
    getPriorityBreakdown(project).reduce((total, part) => total + part.value, 0),
  );
}

export function filterPortfolioProjects(
  projects: PortfolioProject[],
  filter: PortfolioFilter,
) {
  if (filter === "all") {
    return projects;
  }

  if (filter === "self") {
    return projects.filter((project) => project.ballHolderType === "self");
  }

  return projects.filter((project) => project.status === filter);
}

export function getPortfolioStatusLabel(status: PortfolioStatus) {
  const labels: Record<PortfolioStatus, string> = {
    healthy: "順調",
    attention: "要注意",
    waiting: "相手待ち",
    stalled: "停滞中",
    "ai-processing": "AI処理中",
    done: "完了",
  };

  return labels[status];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
