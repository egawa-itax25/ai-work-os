"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  filterPortfolioProjects,
  getPortfolioStatusLabel,
  getPriorityBreakdown,
  getPriorityScore,
  portfolioFilters,
  portfolioProjects,
  type PortfolioFilter,
  type PortfolioProject,
} from "@/lib/portfolio-data";

type Point = { x: number; y: number };
type DragState = { start: Point; origin: Point } | null;

const boardSize = { width: 1240, height: 620 };

export default function PortfolioView({
  initialFilter,
}: {
  initialFilter: PortfolioFilter;
}) {
  const filter = initialFilter;
  const [selectedId, setSelectedId] = useState(portfolioProjects[0]?.id ?? "");
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.94);
  const [dragState, setDragState] = useState<DragState>(null);
  const [expandedScoreId, setExpandedScoreId] = useState(portfolioProjects[0]?.id ?? "");

  const rankedProjects = useMemo(
    () =>
      [...portfolioProjects].sort(
        (a, b) => getPriorityScore(b) - getPriorityScore(a),
      ),
    [],
  );
  const visibleProjects = useMemo(
    () => filterPortfolioProjects(rankedProjects, filter),
    [filter, rankedProjects],
  );
  const selectedProject =
    visibleProjects.find((project) => project.id === selectedId) ??
    visibleProjects[0] ??
    rankedProjects.find((project) => project.id === selectedId) ??
    rankedProjects[0];
  const actionableProjects = rankedProjects.filter(
    (project) => project.ballHolderType === "self" && project.status !== "done",
  );
  const stalledProjects = rankedProjects.filter(
    (project) => project.status === "stalled",
  );
  const weeklyProgress = Math.round(
    rankedProjects.reduce((total, project) => total + project.progress, 0) /
      rankedProjects.length,
  );

  function moveCanvas(point: Point) {
    if (!dragState) {
      return;
    }

    setPan({
      x: dragState.origin.x + point.x - dragState.start.x,
      y: dragState.origin.y + point.y - dragState.start.y,
    });
  }

  function updateZoom(nextZoom: number) {
    setZoom(Math.min(1.25, Math.max(0.72, nextZoom)));
  }

  return (
    <section className="min-h-screen space-y-5 text-slate-100">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-200">ポートフォリオ</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
            プロジェクトの流れを俯瞰
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
            進捗、優先順位、現在のボール、停滞リスクを同じ基準で比較します。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:min-w-[420px]">
          <Metric label="最優先" value={rankedProjects[0]?.name ?? "なし"} />
          <Metric label="自分のボール" value={`${actionableProjects.length}件`} />
          <Metric label="平均進捗" value={`${weeklyProgress}%`} />
        </div>
      </header>

      <FilterBar active={filter} />

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <ProjectList
          expandedScoreId={expandedScoreId}
          projects={visibleProjects}
          selectedId={selectedProject?.id}
          onExpandScore={setExpandedScoreId}
          onSelect={setSelectedId}
        />

        <ProjectFlowMap
          dragState={dragState}
          pan={pan}
          projects={visibleProjects}
          selectedId={selectedProject?.id}
          zoom={zoom}
          onMove={moveCanvas}
          onPanStart={(point) => setDragState({ start: point, origin: pan })}
          onPanEnd={() => setDragState(null)}
          onSelect={setSelectedId}
          onZoom={updateZoom}
        />

        <PriorityPanel
          project={selectedProject}
          projects={visibleProjects}
          onSelect={setSelectedId}
        />
      </div>

      <BottomSummary
        actionableProjects={actionableProjects}
        stalledProjects={stalledProjects}
        weeklyProgress={weeklyProgress}
      />
    </section>
  );
}

function FilterBar({
  active,
}: {
  active: PortfolioFilter;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/56 p-2 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="flex min-w-max gap-2">
        {portfolioFilters.map((item) => (
          <Link
            key={item.id}
            href={item.id === "all" ? "/portfolio" : `/portfolio?filter=${item.id}`}
            className={`rounded-md border px-3 py-2 text-sm transition duration-200 ${
              active === item.id
                ? "border-sky-200/60 bg-sky-200/12 text-sky-50"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProjectList({
  projects,
  selectedId,
  expandedScoreId,
  onSelect,
  onExpandScore,
}: {
  projects: PortfolioProject[];
  selectedId?: string;
  expandedScoreId: string;
  onSelect: (id: string) => void;
  onExpandScore: (id: string) => void;
}) {
  return (
    <aside className="rounded-lg border border-white/10 bg-slate-950/62 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="border-b border-white/10 px-4 py-4">
        <h2 className="text-base font-semibold text-white">プロジェクト一覧</h2>
        <p className="mt-1 text-sm text-slate-500">優先度順に比較します。</p>
      </div>
      <div className="max-h-[660px] space-y-2 overflow-y-auto p-3">
        {projects.map((project, index) => {
          const score = getPriorityScore(project);
          const isSelected = project.id === selectedId;
          const isExpanded = project.id === expandedScoreId;

          return (
            <article
              key={project.id}
              className={`rounded-lg border p-3 transition duration-200 ${
                isSelected
                  ? "border-sky-200/55 bg-sky-200/[0.08]"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.055]"
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelect(project.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-white">
                      {project.name}
                    </h3>
                  </div>
                  <div className="text-right">
                  <p className="text-xs text-slate-500">優先スコア</p>
                    <p className="text-lg font-semibold text-sky-100">{score}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>進捗 {project.progress}%</span>
                    <StatusPill project={project} />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-sky-200 transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Info label="担当者" value={project.owner} />
                  <Info
                    label="現在のボール"
                    value={`${project.currentBallHolder} / ${project.ballHoldingDays}日`}
                  />
                </div>
              </button>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Link
                  href={`/tasks/projects/${encodeURIComponent(project.name)}/map`}
                  className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-200/50 hover:text-sky-100"
                >
                  フローへ移動
                </Link>
                <button
                  type="button"
                  onClick={() => onExpandScore(isExpanded ? "" : project.id)}
                  className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100"
                >
                  内訳を見る
                </button>
              </div>

              {isExpanded ? <ScoreBreakdown project={project} /> : null}
            </article>
          );
        })}
        {projects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
            条件に一致するプロジェクトはありません。
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function ProjectFlowMap({
  projects,
  selectedId,
  pan,
  zoom,
  dragState,
  onPanStart,
  onPanEnd,
  onMove,
  onSelect,
  onZoom,
}: {
  projects: PortfolioProject[];
  selectedId?: string;
  pan: Point;
  zoom: number;
  dragState: DragState;
  onPanStart: (point: Point) => void;
  onPanEnd: () => void;
  onMove: (point: Point) => void;
  onSelect: (id: string) => void;
  onZoom: (zoom: number) => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/48 shadow-xl shadow-black/25 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">プロジェクトフローマップ</h2>
          <p className="mt-1 text-sm text-slate-500">
            ドラッグで移動、ホイールで拡大縮小できます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZoom(zoom - 0.08)}
            className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]"
            title="縮小"
          >
            -
          </button>
          <span className="w-12 text-center text-xs text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoom(zoom + 0.08)}
            className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]"
            title="拡大"
          >
            +
          </button>
        </div>
      </div>

      <div
        className={`relative h-[660px] overflow-hidden ${dragState ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onPanStart({ x: event.clientX, y: event.clientY });
          }
        }}
        onPointerMove={(event) => onMove({ x: event.clientX, y: event.clientY })}
        onPointerUp={onPanEnd}
        onPointerLeave={onPanEnd}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) > 1) {
            onZoom(zoom - event.deltaY * 0.001);
          }
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.08),transparent_18rem),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />
        <div
          className="absolute left-1/2 top-1/2 origin-center transition-transform duration-200"
          style={{
            width: boardSize.width,
            height: boardSize.height,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {projects.slice(0, -1).map((project, index) => {
              const next = projects[index + 1];
              const x1 = project.x + 118;
              const y1 = project.y + 52;
              const x2 = next.x + 118;
              const y2 = next.y + 52;
              const midX = (x1 + x2) / 2;

              return (
                <path
                  key={`${project.id}-${next.id}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(148,163,184,0.22)"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {projects.map((project, index) => (
            <ProjectNode
              key={project.id}
              index={index}
              project={project}
              selected={project.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectNode({
  project,
  selected,
  index,
  onSelect,
}: {
  project: PortfolioProject;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  const score = getPriorityScore(project);
  const stateClass =
    project.status === "done"
      ? "opacity-45"
      : project.status === "waiting"
        ? "opacity-75"
        : "";

  return (
    <Link
      href={`/tasks/projects/${encodeURIComponent(project.name)}/map`}
      onClick={() => onSelect(project.id)}
      className={`absolute w-[236px] rounded-lg border bg-slate-950/88 p-4 shadow-xl shadow-black/25 transition duration-200 hover:-translate-y-1 hover:border-sky-200/50 hover:bg-slate-900/95 ${
        selected
          ? "border-sky-200/70 ring-2 ring-sky-200/15"
          : index === 0
            ? "border-sky-200/45"
            : "border-white/12"
      } ${stateClass}`}
      style={{ left: project.x, top: project.y }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1 truncate text-sm font-semibold text-white">
            {project.name}
          </h3>
        </div>
        <span className="text-lg font-semibold text-sky-100">{score}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>進捗 {project.progress}%</span>
        <span>{project.currentBallHolder}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-sky-200"
          style={{ width: `${project.progress}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusPill project={project} />
        {project.status === "stalled" ? (
          <span className="h-2 w-2 rounded-full bg-red-300" title="停滞中" />
        ) : null}
        {project.status === "ai-processing" ? (
          <span className="rounded-md border border-violet-300/25 px-2 py-1 text-[10px] text-violet-200">
            AI
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function PriorityPanel({
  project,
  projects,
  onSelect,
}: {
  project?: PortfolioProject;
  projects: PortfolioProject[];
  onSelect: (id: string) => void;
}) {
  if (!project) {
    return null;
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
        <p className="text-sm font-semibold text-white">AIによる優先順位</p>
        <div className="mt-4 space-y-2">
          {projects.slice(0, 4).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition duration-200 ${
                item.id === project.id
                  ? "border-sky-200/50 bg-sky-200/[0.08]"
                  : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
              }`}
            >
              <span className="min-w-0 truncate text-sm text-slate-200">
                {String(index + 1).padStart(2, "0")} {item.name}
              </span>
              <span className="font-semibold text-sky-100">
                {getPriorityScore(item)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-950/62 p-4 shadow-xl shadow-black/25 backdrop-blur-xl">
        <p className="text-xs text-slate-500">選択中</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{project.name}</h2>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-500">優先スコア</p>
            <p className="mt-1 text-4xl font-semibold text-sky-100">
              {getPriorityScore(project)}
            </p>
          </div>
          <StatusPill project={project} />
        </div>

        <ScoreBreakdown project={project} />

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Info label="担当者" value={project.owner} />
          <Info label="現在のボール" value={project.currentBallHolder} />
          <Info label="保持時間" value={`${project.ballHoldingDays}日`} />
          <Info label="停滞数" value={`${project.stalledCount}件`} />
        </div>
      </section>

      {project.aiSuggestion ? (
        <section className="rounded-lg border border-sky-200/15 bg-sky-200/[0.06] p-4 shadow-xl shadow-black/20">
          <p className="text-sm font-semibold text-sky-100">AIインサイト</p>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            {project.aiSuggestion}
          </p>
        </section>
      ) : null}

      {project.risk ? (
        <section className="rounded-lg border border-red-300/20 bg-red-300/[0.06] p-4 shadow-xl shadow-black/20">
          <p className="text-sm font-semibold text-red-100">リスク情報</p>
          <p className="mt-2 text-sm leading-7 text-slate-200">{project.risk}</p>
        </section>
      ) : null}
    </aside>
  );
}

function BottomSummary({
  actionableProjects,
  stalledProjects,
  weeklyProgress,
}: {
  actionableProjects: PortfolioProject[];
  stalledProjects: PortfolioProject[];
  weeklyProgress: number;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <SummaryBlock title="今日のフォーカス">
        {actionableProjects.length > 0 ? (
          actionableProjects.slice(0, 2).map((project) => (
            <SummaryLine key={project.id} project={project} />
          ))
        ) : (
          <p className="text-sm text-slate-500">今すぐ自分が動くプロジェクトはありません。</p>
        )}
      </SummaryBlock>
      <SummaryBlock title="停滞しているプロジェクト">
        {stalledProjects.length > 0 ? (
          stalledProjects.map((project) => <SummaryLine key={project.id} project={project} />)
        ) : (
          <p className="text-sm text-slate-500">停滞中のプロジェクトはありません。</p>
        )}
      </SummaryBlock>
      <SummaryBlock title="今週の進捗サマリー">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-semibold text-white">{weeklyProgress}%</p>
            <p className="mt-1 text-sm text-slate-500">平均進捗</p>
          </div>
          <p className="max-w-[12rem] text-sm leading-6 text-slate-400">
            自分のボールを先に返すと、全体の流れが最も早く改善します。
          </p>
        </div>
      </SummaryBlock>
    </section>
  );
}

function ScoreBreakdown({ project }: { project: PortfolioProject }) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-black/18 p-3">
      {getPriorityBreakdown(project).map((part) => (
        <div key={part.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">{part.label}</span>
          <span className={part.value > 0 ? "font-semibold text-slate-100" : "text-slate-600"}>
            +{part.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ project }: { project: PortfolioProject }) {
  const tone =
    project.status === "stalled"
      ? "border-red-300/30 bg-red-300/10 text-red-100"
      : project.status === "waiting" || project.status === "attention"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
        : project.status === "done"
          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          : project.status === "ai-processing"
            ? "border-violet-300/25 bg-violet-300/10 text-violet-100"
            : "border-white/10 bg-white/[0.045] text-slate-300";

  return (
    <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${tone}`}>
      {getPortfolioStatusLabel(project.status)}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/56 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white/[0.035] px-2 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-slate-200">{value}</p>
    </div>
  );
}

function SummaryBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/56 p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function SummaryLine({ project }: { project: PortfolioProject }) {
  return (
    <Link
      href={`/tasks/projects/${encodeURIComponent(project.name)}/map`}
      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm transition hover:border-sky-200/40 hover:bg-white/[0.06]"
    >
      <span className="truncate text-slate-200">{project.name}</span>
      <span className="shrink-0 text-xs text-slate-500">
        {project.currentBallHolder} / {project.ballHoldingDays}日
      </span>
    </Link>
  );
}
