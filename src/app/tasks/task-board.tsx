"use client";

import { article as MotionArticle } from "motion/react-client";
import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";
import { lanes, TaskRecord, tasks as seedTasks } from "@/lib/workspace-data";

const priorityTone = {
  high: "border-rose-300/40 bg-rose-300/10 text-rose-100",
  medium: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  low: "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

const priorityLabel = {
  high: "高",
  medium: "中",
  low: "低",
};

const statusLabel = {
  todo: "待機中",
  doing: "進行中",
  blocked: "停滞",
  done: "完了",
};

const energyLabel = {
  low: "軽い",
  medium: "普通",
  high: "深い集中",
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState<TaskRecord[]>(seedTasks);
  const [activeTaskId, setActiveTaskId] = useState(seedTasks[0]?.id ?? "");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0];
  const laneGroups = useMemo(
    () =>
      lanes.map((lane) => ({
        ...lane,
        tasks: tasks.filter((task) => task.lane === lane.id),
      })),
    [tasks],
  );

  function moveTask(taskId: string, lane: TaskRecord["lane"]) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, lane } : task)),
    );
  }

  function completeTask(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: "done" } : task,
      ),
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="仕事"
        title="知識庫につながる仕事ボード"
        description="優先度、重要度、緊急度、見積、エネルギー、期限、依存関係、プロジェクト、タグを持つ仕事データです。"
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 lg:grid-cols-3">
          {laneGroups.map((lane) => (
            <GlassPanel
              key={lane.id}
              className={`min-h-[640px] p-4 transition ${
                draggingId ? "border-teal-300/30" : ""
              }`}
            >
              <div
                className="h-full"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData("application/task-id");
                  moveTask(taskId, lane.id);
                  setDraggingId(null);
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {lane.label}
                  </h2>
                  <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-400">
                    {lane.tasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {lane.tasks.map((task, index) => (
                    <MotionArticle
                      key={task.id}
                      draggable
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onDragStartCapture={(event) => {
                        event.dataTransfer.setData("application/task-id", task.id);
                        setDraggingId(task.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => setActiveTaskId(task.id)}
                      className={`cursor-grab rounded-lg border p-4 shadow-xl shadow-black/20 backdrop-blur-xl transition active:cursor-grabbing ${
                        activeTaskId === task.id
                          ? "border-teal-300/50 bg-teal-300/10"
                          : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                        <span className={`rounded-md border px-2 py-1 text-[11px] ${priorityTone[task.priority]}`}>
                          {priorityLabel[task.priority]}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        {task.summary}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <Meta label="状態" value={statusLabel[task.status]} />
                        <Meta label="エネルギー" value={energyLabel[task.energy]} />
                        <Meta label="見積" value={task.estimate} />
                        <Meta label="期限" value={task.deadline} />
                      </div>
                    </MotionArticle>
                  ))}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>

        <GlassPanel className="p-5">
          {activeTask ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">
                選択中
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">{activeTask.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{activeTask.summary}</p>

              <div className="mt-5 grid gap-2 text-sm">
                <Detail label="プロジェクト" value={activeTask.project} />
                <Detail label="重要度" value={String(activeTask.importance)} />
                <Detail label="緊急度" value={String(activeTask.urgency)} />
                <Detail label="依存関係" value={activeTask.depends.length ? `${activeTask.depends.length}件` : "なし"} />
                <Detail label="タグ" value={activeTask.tags.join("、")} />
              </div>

              <button
                type="button"
                onClick={() => completeTask(activeTask.id)}
                className="mt-5 w-full rounded-md border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                完了にする
              </button>
            </div>
          ) : null}
        </GlassPanel>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/20 px-2 py-2">
      <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-600">
        {label}
      </span>
      <span className="mt-1 block truncate text-slate-300">{value}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}
