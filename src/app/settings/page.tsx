import { GlassPanel } from "@/components/glass-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "設定 | AI仕事基盤",
};

const settings = [
  ["知識庫モード", "唯一の情報源"],
  ["テーマ", "暗いガラス"],
  ["タスク削除", "方針により無効"],
  ["マークダウン接続", "計画中"],
  ["動き", "有効"],
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="設定"
        title="システムの好み"
        description="長期的な好みと運用方針を、知識庫と同期できる形で保存します。"
      />

      <GlassPanel className="max-w-3xl p-5">
        <div className="space-y-3">
          {settings.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-black/20 px-4 py-4"
            >
              <span className="text-sm text-slate-400">{label}</span>
              <span className="text-sm font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
