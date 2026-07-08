import Link from "next/link";
import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";
import { initialTasks, isOverdue } from "@/app/tasks/task-data";

export const metadata = {
  title: "分析 | AI仕事基盤",
};

const activeTasks = initialTasks.filter((task) => task.status !== "done");
const overdueTasks = activeTasks.filter((task) => isOverdue(task.dueDate));
const myBallTasks = activeTasks.filter((task) => task.currentBallHolder === "あなた");
const projectCount = new Set(initialTasks.map((task) => task.project)).size;

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="分析"
        title="仕事の流れを読む"
        description="期限、停滞、自分が持っているボールを俯瞰し、次に動かす場所を見つけます。"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="進行中の仕事" value={activeTasks.length} />
        <MetricCard label="期限リスク" value={overdueTasks.length} urgent />
        <MetricCard label="自分のボール" value={myBallTasks.length} />
        <MetricCard label="プロジェクト" value={projectCount} />
      </div>

      <GlassPanel className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">優先して見る場所</h2>
            <p className="mt-1 text-sm text-slate-400">
              詳細な分析は今後AI計算へ置き換えます。現在は確認しやすい入口を用意しています。
            </p>
          </div>
          <Link
            href="/portfolio?filter=self"
            className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-4 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            自分が動かす案件を見る
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}

function MetricCard({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return (
    <GlassPanel className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={urgent ? "mt-2 text-3xl font-semibold text-red-200" : "mt-2 text-3xl font-semibold text-white"}>
        {value}
      </p>
    </GlassPanel>
  );
}
