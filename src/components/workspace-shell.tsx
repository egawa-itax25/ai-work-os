"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const showDesktopNavigation = !navigationCollapsed;

  useEffect(() => {
    const saved = window.localStorage.getItem("ai-work-os:navigation-collapsed");

    if (saved === "true") {
      setNavigationCollapsed(true);
    }
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setCreateMenuOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function dispatchCreate(type: "project" | "task") {
    window.dispatchEvent(new CustomEvent("ai-work-os:create", { detail: { type } }));
    setCreateMenuOpen(false);
  }

  function setDesktopNavigationCollapsed(collapsed: boolean) {
    setNavigationCollapsed(collapsed);
    window.localStorage.setItem("ai-work-os:navigation-collapsed", String(collapsed));
  }

  const mainClassName = isCockpit
    ? `min-h-screen ${showDesktopNavigation ? "lg:ml-72" : ""}`
    : `px-4 py-6 lg:px-8 lg:py-8 ${showDesktopNavigation ? "lg:ml-72" : ""}`;

  return (
    <body>
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(20,184,166,0.22),transparent_28rem),radial-gradient(circle_at_85%_15%,rgba(244,63,94,0.14),transparent_24rem),linear-gradient(135deg,#09090b_0%,#111827_48%,#030712_100%)] text-slate-100">
        <div className="fixed inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:64px_64px]" />
        {showDesktopNavigation ? <aside className="fixed left-4 top-4 z-20 hidden h-[calc(100vh-2rem)] w-64 rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:block">
          <Link href="/" className="block rounded-md border border-white/10 bg-black/20 p-4">
            <span className="text-xs font-semibold tracking-[0.16em] text-teal-200">
              流れの司令室
            </span>
            <span className="mt-1 block text-xl font-semibold leading-7 text-white">
              AI仕事基盤
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setDesktopNavigationCollapsed(true)}
            className="mt-3 w-full rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-teal-200/30 hover:bg-white/[0.06] hover:text-white"
            title="メニューを隠す"
          >
            メニューを隠す
          </button>

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

        {!showDesktopNavigation ? (
          <button
            type="button"
            onClick={() => setDesktopNavigationCollapsed(false)}
            className="fixed left-4 top-4 z-50 hidden rounded-lg border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-2xl transition hover:border-teal-200/35 hover:bg-white/[0.08] lg:block"
            title="メニューを表示"
          >
            メニュー
          </button>
        ) : null}

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

        {!isCockpit ? (
          <div className="fixed right-4 top-4 z-40 hidden lg:block">
            <button
              type="button"
              onClick={() => setCreateMenuOpen(true)}
              className="rounded-md border border-sky-200/30 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-sky-50 shadow-xl shadow-black/30 backdrop-blur-xl transition hover:bg-sky-200/[0.12]"
              title="作成メニューを開く。ショートカットは Ctrl+Shift+N です。"
            >
              ＋ 作成
            </button>
          </div>
        ) : null}

        {createMenuOpen ? (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]"
            onMouseDown={() => setCreateMenuOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">作成</p>
                  <p className="mt-1 text-xs text-slate-500">今の画面の文脈で追加します。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateMenuOpen(false)}
                  className="h-8 w-8 rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.06]"
                  title="閉じる"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 grid gap-2">
                <button
                  type="button"
                  onClick={() => dispatchCreate("project")}
                  className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:border-sky-200/40 hover:bg-sky-200/[0.08]"
                >
                  プロジェクトを作成
                </button>
                <button
                  type="button"
                  onClick={() => dispatchCreate("task")}
                  className="rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:border-sky-200/40 hover:bg-sky-200/[0.08]"
                >
                  タスクを作成
                </button>
                <div className="my-1 border-t border-white/10" />
                <button type="button" disabled className="rounded-lg px-4 py-3 text-left text-sm text-slate-600">
                  メモを作成
                </button>
                <button type="button" disabled className="rounded-lg px-4 py-3 text-left text-sm text-slate-600">
                  AIへ指示
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <main className={mainClassName}>{children}</main>
      </div>
    </body>
  );
}
