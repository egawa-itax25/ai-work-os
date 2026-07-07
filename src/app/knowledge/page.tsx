import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";
import { knowledge } from "@/lib/workspace-data";

export const metadata = {
  title: "知識 | AI仕事基盤",
};

export default function KnowledgePage() {
  return (
    <div>
      <PageHeader
        eyebrow="知識"
        title="再利用できる文脈"
        description="知識は原因、解決策、環境、設計判断、次回に活かす学びとして蓄積します。"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {knowledge.map((item) => (
          <GlassPanel key={item.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md border border-teal-300/30 bg-teal-300/10 px-2 py-1 text-xs text-teal-100">
                {item.kind}
              </span>
              <span className="text-xs text-slate-500">{item.date}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/[0.06] px-2 py-1 text-xs text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
