import Link from "next/link";
import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";
import { initialTasks, isOverdue } from "@/app/tasks/task-data";

export const metadata = {
  title: "受信箱 | AI仕事基盤",
};

const inboxItems = initialTasks
  .filter((task) => task.status !== "done")
  .slice(0, 6);

export default function InboxPage() {
  return (
    <div>
      <PageHeader
        eyebrow="受信箱"
        title="流れ込んできた仕事"
        description="まだ整理が必要な依頼、確認待ち、次に分類する仕事を一時的に受け止めます。"
      />

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">未整理の入口</h2>
            <p className="mt-1 text-sm text-slate-400">
              予定やプロジェクトへ送る前の仕事を確認します。
            </p>
          </div>
          <Link
            href="/tasks/projects"
            className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-4 py-2 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]"
          >
            予定へ送る
          </Link>
        </div>

        <div className="mt-4 divide-y divide-white/10">
          {inboxItems.map((task) => (
            <div key={task.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-semibold text-white">{task.title}</p>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">{task.description}</p>
              </div>
              <span className="text-sm text-slate-300">{task.project}</span>
              <span className={isOverdue(task.dueDate) ? "text-sm font-semibold text-red-200" : "text-sm text-slate-400"}>
                {task.dueDate}
              </span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
