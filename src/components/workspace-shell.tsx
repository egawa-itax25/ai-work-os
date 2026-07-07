"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { id: "portfolio", href: "/portfolio", label: "ポートフォリオ" },
  { id: "cockpit", href: "/", label: "司令室" },
  { id: "my-tasks", href: "/tasks", label: "自分の仕事" },
  { id: "inbox", href: "/tasks", label: "受信箱" },
  { id: "projects", href: "/projects", label: "プロジェクト" },
  { id: "knowledge", href: "/knowledge", label: "知識" },
  { id: "calendar", href: "/tasks/projects", label: "予定" },
  { id: "analytics", href: "/notifications", label: "分析" },
  { id: "ai", href: "/settings", label: "AI頭脳" },
  { id: "settings", href: "/settings", label: "設定" },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCockpit = pathname === "/";

  return (
    <body>
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(20,184,166,0.22),transparent_28rem),radial-gradient(circle_at_85%_15%,rgba(244,63,94,0.14),transparent_24rem),linear-gradient(135deg,#09090b_0%,#111827_48%,#030712_100%)] text-slate-100">
        <div className="fixed inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:64px_64px]" />
        {!isCockpit ? <aside className="fixed left-4 top-4 z-20 hidden h-[calc(100vh-2rem)] w-64 rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:block">
          <Link href="/" className="block rounded-md border border-white/10 bg-black/20 p-4">
            <span className="text-xs font-semibold tracking-[0.16em] text-teal-200">
              流れの司令室
            </span>
            <span className="mt-1 block text-xl font-semibold leading-7 text-white">
              AI仕事基盤
            </span>
          </Link>

          <nav className="mt-6 space-y-2" aria-label="主要メニュー">
            {navItems.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center justify-between rounded-md border px-3 py-3 text-[13px] font-medium leading-5 transition ${
                    isActive
                      ? "border-teal-300/40 bg-teal-300/12 text-white shadow-lg shadow-teal-950/30"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
                  }`}
                >
                  {item.label}
                  <span className="h-2 w-2 rounded-full bg-current opacity-60" />
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4 rounded-md border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              情報源
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">知識庫を仕事の記憶として扱います</p>
          </div>
        </aside> : null}

        {!isCockpit ? <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="shrink-0 whitespace-nowrap text-base font-semibold text-white">
              AI仕事基盤
            </Link>
            <nav className="flex gap-2 overflow-x-auto text-[13px] text-slate-400">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap rounded-md border border-white/10 px-3 py-2 hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header> : null}

        <main className={isCockpit ? "min-h-screen" : "px-4 py-6 lg:ml-72 lg:px-8 lg:py-8"}>{children}</main>
      </div>
    </body>
  );
}
