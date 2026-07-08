import Link from "next/link";
import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "AI頭脳 | AI仕事基盤",
};

const insights = [
  "設計書作成を完了すると後続3件が進みます。",
  "顧客回答待ちが続いている案件を確認してください。",
  "AI処理中の整理結果はポートフォリオへ反映する設計です。",
];

export default function AiPage() {
  return (
    <div>
      <PageHeader
        eyebrow="AI頭脳"
        title="仕事の流れを読むAI"
        description="チャットではなく、優先順位、停滞、ボールの所在、関連知識を解析する中枢です。"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <GlassPanel className="p-5">
          <h2 className="text-lg font-semibold text-white">現在の判断</h2>
          <div className="mt-4 space-y-3">
            {insights.map((insight) => (
              <div key={insight} className="rounded-md border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300">
                {insight}
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-sm font-semibold text-sky-100">次に見る場所</p>
          <div className="mt-4 grid gap-2">
            <Link href="/portfolio" className="rounded-md border border-sky-200/35 bg-sky-200/[0.08] px-4 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-200/[0.14]">
              ポートフォリオへ
            </Link>
            <Link href="/knowledge" className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">
              関連知識を見る
            </Link>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
