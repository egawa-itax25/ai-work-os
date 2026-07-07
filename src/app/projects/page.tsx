import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";
import { projects } from "@/lib/workspace-data";

export const metadata = {
  title: "プロジェクト | AI仕事基盤",
};

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="プロジェクト"
        title="プロジェクトの記憶"
        description="各プロジェクトは状態、道筋、版、残り作業、詰まりを保持し、将来の知識庫同期に備えます。"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <GlassPanel key={project.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
                  版 {project.version}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">{project.name}</h2>
              </div>
              <span className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
                {project.state === "active" ? "稼働中" : project.state === "planning" ? "計画中" : "停滞"}
              </span>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-200">道筋</h3>
              <div className="mt-3 space-y-2">
                {project.roadmap.map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-black/20 p-3">
                <p className="text-xs tracking-[0.16em] text-slate-500">残り作業</p>
                <p className="mt-1 text-2xl font-semibold text-white">{project.todo}</p>
              </div>
              <div className="rounded-md bg-black/20 p-3">
                <p className="text-xs tracking-[0.16em] text-slate-500">詰まり</p>
                <p className="mt-1 text-sm leading-5 text-slate-300">{project.blocker}</p>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
