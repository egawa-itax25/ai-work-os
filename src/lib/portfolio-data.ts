export type PortfolioStatus =
  | "healthy"
  | "attention"
  | "waiting"
  | "stalled"
  | "ai-processing"
  | "done";

export type BallHolderType = "self" | "customer" | "member" | "ai" | "none";

export type PriorityScorePart = {
  label: string;
  value: number;
};

export type PortfolioProject = {
  id: string;
  rank: number;
  name: string;
  owner: string;
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

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "portfolio-a-renewal",
    rank: 1,
    name: "A社リニューアル",
    owner: "山田太郎",
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
    aiSuggestion: "設計書作成を完了すると後続3件が進みます。",
    risk: "確認待ちが増えると来週の実装開始がずれます。",
    x: 150,
    y: 120,
  },
  {
    id: "portfolio-b-system",
    rank: 2,
    name: "B社システム導入",
    owner: "佐藤花子",
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
    aiSuggestion: "顧客回答待ちが5日続いています。",
    risk: "回答が明日までに来ない場合、3日遅れる可能性があります。",
    x: 520,
    y: 180,
  },
  {
    id: "portfolio-closing",
    rank: 3,
    name: "決算業務効率化",
    owner: "田中一郎",
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
    aiSuggestion: "AIの資料整理がまもなく完了します。",
    x: 850,
    y: 110,
  },
  {
    id: "portfolio-recruiting",
    rank: 4,
    name: "採用プロジェクト",
    owner: "鈴木美咲",
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
    aiSuggestion: "面談日程の確定で停滞2件が解消します。",
    risk: "候補者対応が止まっています。",
    x: 330,
    y: 390,
  },
  {
    id: "portfolio-ops",
    rank: 5,
    name: "運用安定化",
    owner: "山田太郎",
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
    x: 720,
    y: 430,
  },
  {
    id: "portfolio-archive",
    rank: 6,
    name: "社内ナレッジ移行",
    owner: "AI",
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
    x: 1050,
    y: 330,
  },
];

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
