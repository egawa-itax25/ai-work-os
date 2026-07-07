"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getTaskLinks, knowledge, projects, tasks, type TaskRecord } from "@/lib/workspace-data";

type Point = { x: number; y: number };
type DragState =
  | { type: "canvas"; start: Point; origin: Point }
  | { type: "planet"; id: string; start: Point; origin: Point };

const statusTone = {
  todo: {
    glow: "rgba(125, 211, 252, 0.42)",
    core: "from-sky-100 via-cyan-300 to-blue-500",
    ring: "border-cyan-100/35",
    label: "待機中",
    pulse: "",
  },
  doing: {
    glow: "rgba(45, 212, 191, 0.58)",
    core: "from-emerald-100 via-teal-300 to-cyan-500",
    ring: "border-teal-100/45",
    label: "進行中",
    pulse: "important-pulse",
  },
  blocked: {
    glow: "rgba(251, 113, 133, 0.7)",
    core: "from-rose-100 via-red-400 to-fuchsia-600",
    ring: "border-rose-100/60",
    label: "停滞",
    pulse: "blocked-pulse",
  },
  done: {
    glow: "rgba(52, 211, 153, 0.44)",
    core: "from-emerald-100 via-green-300 to-lime-500",
    ring: "border-emerald-100/35",
    label: "完了",
    pulse: "complete-flight",
  },
};

const priorityLabel = {
  low: "低",
  medium: "中",
  high: "高",
};

const energyLabel = {
  low: "軽い",
  medium: "普通",
  high: "深い集中",
};

const noteLabel: Record<string, string> = {
  "Knowledge/mistakes.md": "改善記録",
  "Projects/ai-task-os.md": "仕事基盤プロジェクト",
  "Decisions/2026-07-06-ui-direction.md": "画面方針",
  "Preferences/ui.md": "画面の好み",
};

const timeline = [
  { label: "今日", signal: "今やるべき仕事: 空間キャンバス操作を詰まりから外す", intensity: 78 },
  { label: "明日", signal: "マークダウン取込が進むと、全体の流れは安定します", intensity: 64 },
  { label: "3日後", signal: "キャンバス操作まわりで遅延の兆候があります", intensity: 92 },
  { label: "7日後", signal: "知識グラフがAIエージェント連携を受け止められます", intensity: 58 },
];

const nextTasks = [
  { color: "bg-emerald-300", label: "社内承認", owner: "田中さん" },
  { color: "bg-amber-300", label: "デザイン確認", owner: "佐藤さん" },
];

const layerItems = ["プロジェクト", "依存関係", "担当者", "期限", "エネルギー", "停滞リスク"];

const commandItems = ["仕事を追加", "AIに相談", "レポート生成", "タイマー開始", "メモを残す"];

const initialPlanetPositions: Record<string, Point> = {
  "task-001": { x: 110, y: 175 },
  "task-002": { x: 420, y: 335 },
  "task-003": { x: 610, y: 160 },
  "task-004": { x: 305, y: 580 },
};

export default function DashboardView() {
  const [selectedId, setSelectedId] = useState("task-003");
  const [positions, setPositions] = useState(initialPlanetPositions);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? tasks[0];
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const links = getTaskLinks();

  const aiFocus = useMemo(
    () =>
      [...activeTasks].sort((a, b) => {
        const aScore = a.importance + a.urgency + (a.status === "blocked" ? 2 : 0);
        const bScore = b.importance + b.urgency + (b.status === "blocked" ? 2 : 0);
        return bScore - aScore;
      })[0],
    [activeTasks],
  );

  function startCanvasDrag(client: Point) {
    setDragState({ type: "canvas", start: client, origin: pan });
  }

  function startPlanetDrag(id: string, client: Point) {
    setSelectedId(id);
    setPanelOpen(true);
    setDragState({
      type: "planet",
      id,
      start: client,
      origin: positions[id] ?? { x: 0, y: 0 },
    });
  }

  function movePointer(client: Point) {
    if (!dragState) {
      return;
    }

    const delta = {
      x: client.x - dragState.start.x,
      y: client.y - dragState.start.y,
    };

    if (dragState.type === "canvas") {
      setPan({ x: dragState.origin.x + delta.x, y: dragState.origin.y + delta.y });
      return;
    }

    setPositions((current) => ({
      ...current,
      [dragState.id]: {
        x: dragState.origin.x + delta.x / zoom,
        y: dragState.origin.y + delta.y / zoom,
      },
    }));
  }

  function zoomCanvas(nextZoom: number) {
    setZoom(Math.min(1.35, Math.max(0.72, nextZoom)));
  }

  return (
    <section
      className="relative min-h-screen overflow-x-hidden bg-black/35 text-slate-100 shadow-2xl shadow-black/40 lg:overflow-hidden"
      onPointerMove={(event) => movePointer({ x: event.clientX, y: event.clientY })}
      onPointerUp={() => setDragState(null)}
      onPointerLeave={() => setDragState(null)}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) > 2) {
          zoomCanvas(zoom - event.deltaY * 0.0012);
        }
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,184,166,0.18),transparent_28rem),radial-gradient(circle_at_78%_12%,rgba(56,189,248,0.16),transparent_24rem),radial-gradient(circle_at_50%_92%,rgba(244,63,94,0.12),transparent_24rem),linear-gradient(135deg,#020617_0%,#050816_54%,#020617_100%)]" />
      <div className="star-field absolute inset-0 opacity-80" />
      <div className="aurora-field absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/28 to-transparent" />

      <BrandHeader />
      <TopOverlay activeTasks={activeTasks.length} zoom={zoom} onZoom={zoomCanvas} />

      <MobileCockpit
        activeTasks={activeTasks.length}
        aiFocus={aiFocus}
        selectedTask={selectedTask}
        onSelectTask={(id) => {
          setSelectedId(id);
          setPanelOpen(true);
        }}
      />

      <div className="relative z-10 hidden min-h-screen grid-rows-[1fr_auto] lg:grid">
        <div className="relative min-h-[760px] overflow-hidden">
          <CanvasSurface
            aiFocusId={aiFocus?.id}
            dragState={dragState}
            links={links}
            pan={pan}
            positions={positions}
            selectedId={selectedId}
            zoom={zoom}
            onCanvasPointerDown={startCanvasDrag}
            onPlanetPointerDown={startPlanetDrag}
            onSelect={(id) => {
              setSelectedId(id);
              setPanelOpen(true);
            }}
          />

          <LeftControlPanel />
          <MiniMap />
          <AiMessage />
          <CommandDock />
          <VoicePrompt />
          <Inspector
            isOpen={panelOpen}
            task={selectedTask}
            onClose={() => setPanelOpen(false)}
            onOpen={() => setPanelOpen(true)}
          />
        </div>

        <Timeline />
      </div>
    </section>
  );
}

function MobileCockpit({
  activeTasks,
  aiFocus,
  selectedTask,
  onSelectTask,
}: {
  activeTasks: number;
  aiFocus?: TaskRecord;
  selectedTask: TaskRecord;
  onSelectTask: (id: string) => void;
}) {
  const flowImpact = selectedTask.importance * 12 + selectedTask.urgency * 7;
  const stalledDays = selectedTask.status === "blocked" ? 3 : 0;
  const statusLabel: Record<TaskRecord["status"], string> = {
    todo: "待機中",
    doing: "進行中",
    blocked: "停滞中",
    done: "完了",
  };

  return (
    <div className="relative z-20 min-h-screen px-4 pb-10 pt-36 sm:px-6 lg:hidden">
      <section className="rounded-xl border border-white/12 bg-slate-950/54 p-5 shadow-2xl shadow-black/35 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100">流動スコア</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">仕事の流れは良好です</p>
          </div>
          <div className="text-right">
            <div className="flex items-end justify-end gap-2">
              <span className="text-5xl font-semibold leading-none text-white">94</span>
              <span className="pb-1 text-sm font-semibold text-emerald-200">+6</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">稼働中 {activeTasks}件</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Signal label="現在の焦点" value={aiFocus?.title ?? "確認中"} />
          <Signal label="表示モード" value="スマホ確認" />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/48 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100">AIフォーカス</p>
            <h2 className="mt-2 text-lg font-semibold leading-7 text-white">今見るべき仕事</h2>
          </div>
          <span className="rounded-md border border-cyan-100/15 bg-cyan-100/[0.06] px-2 py-1 text-xs text-cyan-100">
            自動解析
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {tasks.slice(0, 4).map((task) => (
            <button
              key={task.id}
              type="button"
              className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                task.id === selectedTask.id
                  ? "border-cyan-100/40 bg-cyan-100/[0.08]"
                  : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
              }`}
              onClick={() => onSelectTask(task.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-6 text-white">{task.title}</p>
                  <p className="text-xs leading-5 text-slate-400">{task.owner} / {statusLabel[task.status]}</p>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-slate-300">
                  {task.deadline}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/56 p-5 shadow-2xl shadow-black/35 backdrop-blur-2xl">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100">AI解析</p>
          <h2 className="mt-2 text-2xl font-semibold leading-9 text-white">{selectedTask.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{selectedTask.summary}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Signal label="担当" value={selectedTask.owner} />
          <Signal label="期限" value={selectedTask.deadline} />
          <Signal label="重要度" value={`${selectedTask.importance}/5`} />
          <Signal label="緊急度" value={`${selectedTask.urgency}/5`} />
          <Signal label="優先度" value={priorityLabel[selectedTask.priority]} />
          <Signal label="流れへの影響" value={`${flowImpact}%`} />
          <Signal label="停止日数" value={`${stalledDays}日`} />
          <Signal label="必要エネルギー" value={energyLabel[selectedTask.energy]} />
        </div>

        <div className="mt-5 rounded-lg border border-cyan-100/15 bg-cyan-100/[0.045] p-4">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100">AIコメント</p>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            この仕事が現在のボトルネックです。依存する取込導線を先に流すと、3日後の遅延リスクを下げられます。
          </p>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">関連ノート</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTask.related.map((item) => (
              <span
                key={item}
                className="rounded-md border border-white/10 bg-white/[0.055] px-2 py-1 text-xs leading-5 text-slate-300"
              >
                {noteLabel[item] ?? item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/46 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100">画面移動</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { href: "/portfolio", label: "ポートフォリオ" },
            { href: "/tasks", label: "仕事" },
            { href: "/knowledge", label: "知識" },
            { href: "/settings", label: "設定" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
        <Timeline />
      </div>
    </div>
  );
}

function BrandHeader() {
  const cockpitNav = [
    { href: "/portfolio", label: "ポートフォリオ" },
    { href: "/tasks", label: "仕事" },
    { href: "/knowledge", label: "知識" },
    { href: "/settings", label: "設定" },
  ];

  return (
    <div className="absolute left-4 right-4 top-4 z-40 flex flex-wrap items-center gap-3 md:left-5 md:right-auto">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-100/20 bg-white/[0.06] text-sm font-semibold text-cyan-100 shadow-[0_0_24px_rgba(125,211,252,0.18)] backdrop-blur-xl">
          N
        </div>
        <div>
          <p className="text-lg font-semibold leading-5 text-white">AI仕事基盤</p>
          <p className="mt-1 text-[10px] tracking-[0.16em] text-cyan-200/80">
            仕事の流れを動かす空間
          </p>
        </div>
      </div>

      <nav
        aria-label="司令室内ナビゲーション"
        className="flex max-w-full gap-2 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/45 p-1 shadow-xl shadow-black/20 backdrop-blur-2xl"
      >
        {cockpitNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-md px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function TopOverlay({
  activeTasks,
  zoom,
  onZoom,
}: {
  activeTasks: number;
  zoom: number;
  onZoom: (nextZoom: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 hidden gap-3 px-4 py-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-6">
      <div className="hidden items-center gap-3 md:flex">
        <span className="ml-72 h-2 w-2 rounded-full bg-teal-200 shadow-[0_0_20px_rgba(45,212,191,0.9)]" />
        <span className="text-xs font-semibold tracking-[0.18em] text-slate-400">今日の流れ</span>
      </div>

      <div className="pointer-events-auto rounded-lg border border-white/15 bg-white/[0.08] px-6 py-3 text-center shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-cyan-100">流動スコア</p>
        <div className="mt-1 flex items-end justify-center gap-3">
          <span className="text-5xl font-semibold leading-none text-white">94</span>
          <span className="pb-1 text-sm font-semibold text-emerald-200">+6</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-300">仕事の流れは良好です</p>
      </div>

      <div className="hidden items-center justify-end gap-3 md:flex">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-xl">
          <button
            type="button"
            className="h-8 w-8 rounded-md border border-white/10 bg-white/[0.055] text-sm text-slate-100 transition hover:bg-white/10"
            onClick={() => onZoom(zoom - 0.1)}
            title="縮小"
          >
            -
          </button>
          <span className="w-14 text-center text-xs text-slate-300">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="h-8 w-8 rounded-md border border-white/10 bg-white/[0.055] text-sm text-slate-100 transition hover:bg-white/10"
            onClick={() => onZoom(zoom + 0.1)}
            title="拡大"
          >
            +
          </button>
        </div>
        <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-right backdrop-blur-xl">
          <p className="text-[10px] tracking-[0.18em] text-slate-500">稼働中</p>
          <p className="text-sm font-semibold text-slate-100">{activeTasks}件が流れています</p>
        </div>
      </div>
    </div>
  );
}

function LeftControlPanel() {
  return (
    <div className="absolute left-5 top-24 z-30 hidden w-[250px] space-y-5 xl:block">
      <section className="rounded-lg border border-white/10 bg-slate-950/50 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <p className="text-sm leading-6 text-slate-400">今、あなたが集中すべきこと</p>
        <div className="mt-4 rounded-lg border border-violet-300/40 bg-violet-400/10 p-4 shadow-[0_0_34px_rgba(139,92,246,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold leading-7 text-white">契約書の確認</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">顧客確認待ち。対応すると5件が進みます</p>
            </div>
            <span className="h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_20px_rgba(167,139,250,0.9)]" />
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-300">
            <span>45分</span>
            <span className="text-amber-200">★★★★★</span>
            <span className="rounded-md bg-emerald-300/12 px-2 py-1 text-emerald-100">最優先</span>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-400">次に来る重要タスク</p>
        <div className="mt-3 space-y-2">
          {nextTasks.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span>{item.label}</span>
              <span className="text-slate-500">({item.owner})</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-950/48 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
        <p className="text-sm font-semibold text-slate-300">レイヤー</p>
        <div className="mt-3 space-y-2">
          {layerItems.map((item) => (
            <button
              key={item}
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07]"
              title={`${item}を表示`}
            >
              {item}
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-semibold text-slate-300">表示モード</p>
        <div className="mt-3 space-y-2">
          {["銀河", "流れ", "時間軸", "今日"].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                index === 0
                  ? "border-violet-300/50 bg-violet-400/18 text-violet-50"
                  : "border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.07]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniMap() {
  return (
    <div className="absolute right-[392px] top-24 z-30 hidden w-[220px] rounded-lg border border-white/10 bg-slate-950/45 p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl xl:block">
      <div className="relative h-24 overflow-hidden rounded-lg border border-cyan-100/10 bg-black/20">
        {[0, 1, 2, 3, 4, 5, 6].map((item) => (
          <span
            key={item}
            className="absolute h-2 w-2 rounded-full shadow-[0_0_14px_currentColor]"
            style={{
              left: `${16 + item * 12}%`,
              top: `${24 + (item % 3) * 18}%`,
              color: ["#22d3ee", "#a78bfa", "#f59e0b", "#34d399", "#fb7185", "#60a5fa", "#f472b6"][item],
              backgroundColor: "currentColor",
            }}
          />
        ))}
        <span className="absolute left-[38%] top-[22%] h-10 w-16 rounded-sm border border-cyan-100/70" />
      </div>
      <p className="mt-2 text-right text-xs text-slate-400">全体マップ</p>
    </div>
  );
}

function AiMessage() {
  return (
    <div className="absolute bottom-24 left-[270px] z-30 hidden w-[360px] rounded-lg border border-white/10 bg-slate-950/52 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl xl:block">
      <div className="flex gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-violet-300/30 bg-violet-400/10 shadow-[0_0_30px_rgba(139,92,246,0.18)]">
          <span className="h-2 w-2 rounded-full bg-cyan-200 shadow-[18px_0_0_rgba(125,211,252,0.95),0_0_18px_rgba(125,211,252,0.9)]" />
        </div>
        <div>
          <p className="text-xs text-slate-500">AIからのメッセージ</p>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            契約書作成が詰まると、3日後に請求書発行も遅延する可能性があります。
          </p>
          <button className="mt-3 rounded-md border border-violet-300/40 bg-violet-400/15 px-4 py-2 text-sm text-violet-50" type="button">
            対策を見る
          </button>
        </div>
      </div>
    </div>
  );
}

function CommandDock() {
  return (
    <div className="absolute bottom-24 left-1/2 z-30 hidden w-[520px] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/48 px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur-2xl xl:block">
      <p className="text-center text-[11px] tracking-[0.2em] text-cyan-100">クイック操作</p>
      <div className="mt-3 grid grid-cols-5 gap-3">
        {commandItems.map((item, index) => (
          <button key={item} type="button" className="group grid place-items-center gap-2 text-xs text-slate-400">
            <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xl text-slate-100 transition group-hover:bg-white/[0.08]">
              {["+", "✦", "↓", "◴", "✎"][index]}
            </span>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function VoicePrompt() {
  return (
    <div className="absolute bottom-24 right-[392px] z-30 hidden w-[210px] rounded-lg border border-white/10 bg-slate-950/48 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl xl:block">
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 rounded-full bg-violet-500/30 shadow-[0_0_36px_rgba(139,92,246,0.62)]" />
        <div>
          <p className="text-xs text-slate-500">音声で話しかける</p>
          <p className="mt-1 text-sm text-slate-200">「今日の優先タスクは？」</p>
        </div>
      </div>
    </div>
  );
}

function CanvasSurface({
  aiFocusId,
  dragState,
  links,
  pan,
  positions,
  selectedId,
  zoom,
  onCanvasPointerDown,
  onPlanetPointerDown,
  onSelect,
}: {
  aiFocusId?: string;
  dragState: DragState | null;
  links: ReturnType<typeof getTaskLinks>;
  pan: Point;
  positions: Record<string, Point>;
  selectedId: string;
  zoom: number;
  onCanvasPointerDown: (client: Point) => void;
  onPlanetPointerDown: (id: string, client: Point) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`absolute inset-0 cursor-grab overflow-hidden ${dragState?.type === "canvas" ? "cursor-grabbing" : ""}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onCanvasPointerDown({ x: event.clientX, y: event.clientY });
        }
      }}
    >
      <div
        className="canvas-world absolute left-1/2 top-1/2 h-[900px] w-[1120px] origin-center"
        style={{
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
        }}
      >
        <CanvasIntro />
        <FlowMap links={links} positions={positions} />

        {projects.map((project, index) => (
          <div
            key={project.id}
            className="pointer-events-none absolute rounded-full border border-cyan-100/10"
            style={{
              left: 70 + index * 330,
              top: 145 + index * 120,
              width: 650 - index * 120,
              height: 390 - index * 50,
              transform: "rotate(-12deg)",
            }}
          >
            <span className="absolute -top-7 left-20 text-[11px] font-medium tracking-[0.18em] text-slate-500">
              {project.name}
            </span>
          </div>
        ))}

        {tasks.map((task, index) => (
          <Planet
            key={task.id}
            isAiFocus={task.id === aiFocusId}
            isDragging={dragState?.type === "planet" && dragState.id === task.id}
            isSelected={task.id === selectedId}
            onPointerDown={(point) => onPlanetPointerDown(task.id, point)}
            onSelect={() => onSelect(task.id)}
            position={positions[task.id] ?? { x: task.x, y: task.y }}
            task={task}
            index={index}
          />
        ))}

        {knowledge.map((item, index) => (
          <button
            key={item.id}
            className="absolute rounded-full border border-violet-200/20 bg-violet-300/10 px-4 py-2 text-left text-[12px] leading-5 text-violet-100 shadow-[0_0_28px_rgba(167,139,250,0.18)] backdrop-blur-xl transition hover:border-violet-100/40 hover:bg-violet-200/15"
            style={{ left: 160 + index * 245, top: 690 + (index % 2) * 46 }}
            type="button"
            title="関連ノートを表示"
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function CanvasIntro() {
  return (
    <div className="pointer-events-none absolute left-64 top-20 max-w-[390px] rounded-lg border border-white/10 bg-black/22 px-5 py-4 backdrop-blur-xl">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-100">会社全体 / 銀河</p>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        ドラッグで移動、ホイールで拡大縮小。仕事の流れを空間上で直接操作します。
      </p>
    </div>
  );
}

function FlowMap({
  links,
  positions,
}: {
  links: ReturnType<typeof getTaskLinks>;
  positions: Record<string, Point>;
}) {
  const start = { x: 36, y: 445 };
  const end = { x: 1010, y: 210 };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="flowGradient" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(45,212,191,0)" />
          <stop offset="42%" stopColor="rgba(125,211,252,0.86)" />
          <stop offset="100%" stopColor="rgba(244,114,182,0)" />
        </linearGradient>
        <filter id="flowGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text x={start.x} y={start.y - 18} fill="rgba(153,246,228,0.74)" fontSize="12" letterSpacing="4">
        開始
      </text>
      <text x={end.x - 8} y={end.y - 18} fill="rgba(254,205,211,0.74)" fontSize="12" letterSpacing="4">
        完了
      </text>

      <path
        className="main-flow-path"
        d={`M ${start.x} ${start.y} C 250 250, 510 520, ${end.x} ${end.y}`}
        fill="none"
        stroke="url(#flowGradient)"
        strokeWidth="7"
        filter="url(#flowGlow)"
      />

      {links.map((link) => {
        const from = tasks.find((task) => task.id === link.from);
        const to = tasks.find((task) => task.id === link.to);

        if (!from || !to) {
          return null;
        }

        const fromPosition = positions[from.id] ?? { x: from.x, y: from.y };
        const toPosition = positions[to.id] ?? { x: to.x, y: to.y };
        const x1 = fromPosition.x + 94;
        const y1 = fromPosition.y + 94;
        const x2 = toPosition.x + 94;
        const y2 = toPosition.y + 94;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 96;
        const path = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

        return (
          <g key={`${link.from}-${link.to}`}>
            <path d={path} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="18" />
            <path className="flow-path" d={path} fill="none" stroke="url(#flowGradient)" strokeWidth="3" />
          </g>
        );
      })}
    </svg>
  );
}

function Planet({
  task,
  index,
  position,
  isAiFocus,
  isDragging,
  isSelected,
  onPointerDown,
  onSelect,
}: {
  task: TaskRecord;
  index: number;
  position: Point;
  isAiFocus: boolean;
  isDragging: boolean;
  isSelected: boolean;
  onPointerDown: (point: Point) => void;
  onSelect: () => void;
}) {
  const tone = statusTone[task.status];

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown({ x: event.clientX, y: event.clientY });
      }}
      className={`float-planet group absolute z-10 grid h-[188px] w-[188px] touch-none place-items-center rounded-full border bg-white/[0.022] text-center outline-none backdrop-blur-sm transition duration-300 hover:-translate-y-2 hover:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-200 active:scale-95 ${
        isDragging ? "drag-lift" : ""
      } ${tone.pulse} ${isSelected ? "border-white/60" : tone.ring}`}
      style={{
        left: position.x,
        top: position.y,
        animationDelay: `${index * 0.35}s`,
        animationDuration: `${5.5 + index}s`,
        boxShadow: `0 0 48px ${tone.glow}, inset 0 0 38px rgba(255,255,255,0.06)`,
      }}
      title={`${task.title}を選択`}
    >
      {isAiFocus ? <span className="ai-focus-ring absolute inset-[-20px] rounded-full border border-cyan-100/35" /> : null}
      <span className="absolute inset-4 rounded-full border border-white/10 opacity-70" />
      <span className="absolute inset-9 rounded-full border border-white/10 opacity-50" />
      <span
        className={`planet-core absolute h-24 w-24 rounded-full bg-gradient-to-br ${tone.core} opacity-95 shadow-2xl`}
      />
      <span className="relative mt-32 max-w-[150px] px-4">
        <span className="block text-[13px] font-semibold leading-5 text-white">{task.title}</span>
        <span className="mt-1 block text-[10px] tracking-[0.16em] text-slate-400">{tone.label}</span>
      </span>
    </button>
  );
}

function Inspector({
  isOpen,
  task,
  onClose,
  onOpen,
}: {
  isOpen: boolean;
  task: TaskRecord;
  onClose: () => void;
  onOpen: () => void;
}) {
  const flowImpact = task.importance * 12 + task.urgency * 7;
  const stalledDays = task.status === "blocked" ? 3 : 0;

  if (!isOpen) {
    return (
      <button
        type="button"
        className="absolute right-4 top-32 z-30 rounded-lg border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-200 shadow-2xl shadow-black/30 backdrop-blur-2xl transition hover:bg-white/10"
        onClick={onOpen}
        title="解析パネルを開く"
      >
        解析を開く
      </button>
    );
  }

  return (
    <aside className="inspector-panel absolute bottom-5 right-4 top-28 z-30 w-[360px] max-w-[calc(100%-2rem)] overflow-y-auto rounded-lg border border-white/10 bg-slate-950/62 p-5 shadow-2xl shadow-black/35 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-100">AI解析</p>
          <h2 className="mt-2 text-xl font-semibold leading-8 text-white">{task.title}</h2>
        </div>
        <button
          type="button"
          className="h-8 w-8 rounded-md border border-white/10 bg-white/[0.055] text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          title="解析パネルを閉じる"
        >
          ×
        </button>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-300">{task.summary}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Signal label="担当" value={task.owner} />
        <Signal label="期限" value={task.deadline} />
        <Signal label="重要度" value={`${task.importance}/5`} />
        <Signal label="緊急度" value={`${task.urgency}/5`} />
        <Signal label="優先度" value={priorityLabel[task.priority]} />
        <Signal label="流れへの影響" value={`${flowImpact}%`} />
        <Signal label="停止日数" value={`${stalledDays}日`} />
        <Signal label="必要エネルギー" value={energyLabel[task.energy]} />
      </div>

      <section className="mt-5 rounded-lg border border-cyan-100/15 bg-cyan-100/[0.045] p-4">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-100">AIコメント</p>
        <p className="mt-2 text-sm leading-7 text-slate-200">
          この仕事が現在のボトルネックです。依存する取込導線を先に流すと、3日後の遅延リスクを下げられます。
        </p>
      </section>

      <section className="mt-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">関連ノート</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {task.related.map((item) => (
            <span
              key={item}
              className="rounded-md border border-white/10 bg-white/[0.055] px-2 py-1 text-xs leading-5 text-slate-300"
            >
              {noteLabel[item] ?? item}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-400">
        <Signal label="関連人物" value={task.people.join("、")} />
        <Signal label="関連プロジェクト" value={task.project} />
        <Signal label="関連タグ" value={task.tags.join("、")} />
        <Signal label="所要時間" value={task.estimate} />
      </section>

      <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">概念辞典</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">{task.dictionary.join(" / ")}</p>
        <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-slate-500">思考プロセス</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">{task.thoughtProcess}</p>
      </section>
    </aside>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[10px] tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 min-w-0 truncate text-sm font-medium leading-6 text-slate-100">{value}</p>
    </div>
  );
}

function Timeline() {
  return (
    <div className="relative z-20 border-t border-white/10 bg-black/20 px-4 py-4 backdrop-blur-2xl md:px-6">
      <div className="grid gap-3 md:grid-cols-4">
        {timeline.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.16em] text-slate-300">{item.label}</p>
              <span className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(125,211,252,0.9)]" />
            </div>
            <p className="mt-2 min-h-12 text-xs leading-6 text-slate-400">{item.signal}</p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-200 via-cyan-300 to-rose-300"
                style={{ width: `${item.intensity}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
