"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const defaultNavItems = [
  { id: "portfolio", href: "/portfolio", label: "ポートフォリオ" },
  { id: "cockpit", href: "/", label: "司令室" },
  { id: "my-tasks", href: "/tasks", label: "自分の仕事" },
  { id: "inbox", href: "/inbox", label: "受信箱" },
  { id: "projects", href: "/projects", label: "プロジェクト" },
  { id: "knowledge", href: "/knowledge", label: "知識" },
  { id: "calendar", href: "/tasks/projects", label: "予定" },
  { id: "settings", href: "/settings", label: "設定" },
  { id: "completed", href: "/completed", label: "完了済み" },
  { id: "trash", href: "/trash", label: "削除済み" },
  { id: "analytics", href: "/analytics", label: "分析" },
  { id: "ai", href: "/ai", label: "AI頭脳" },
];

const navOrderStorageKey = "ai-work-os:navigation-order";
const hiddenPrimaryNavIds = new Set(["cockpit", "inbox", "knowledge", "analytics", "ai"]);
const primaryNavIds = new Set(["calendar", "portfolio", "my-tasks", "projects"]);
const utilityNavIds = new Set(["settings", "completed", "trash"]);

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCockpit = pathname === "/";
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [orderedNavIds, setOrderedNavIds] = useState(() => defaultNavItems.map((item) => item.id));
  const [draggingNavId, setDraggingNavId] = useState<string | null>(null);
  const showDesktopNavigation = !navigationCollapsed;
  const navItems = orderedNavIds
    .map((id) => defaultNavItems.find((item) => item.id === id))
    .filter((item): item is (typeof defaultNavItems)[number] => Boolean(item))
    .filter((item) => !hiddenPrimaryNavIds.has(item.id));
  const primaryNavItems = navItems.filter((item) => primaryNavIds.has(item.id));
  const utilityNavItems = navItems.filter((item) => utilityNavIds.has(item.id));

  useEffect(() => {
    const saved = window.localStorage.getItem("ai-work-os:navigation-collapsed");

    if (saved === "true") {
      setNavigationCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(navOrderStorageKey);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return;
      }

      const knownIds = new Set(defaultNavItems.map((item) => item.id));
      const savedIds = parsed.filter((id): id is string => typeof id === "string" && knownIds.has(id));
      const missingIds = defaultNavItems.map((item) => item.id).filter((id) => !savedIds.includes(id));

      setOrderedNavIds([...savedIds, ...missingIds]);
    } catch {
      window.localStorage.removeItem(navOrderStorageKey);
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

  function moveNavigationItem(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    setOrderedNavIds((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      window.localStorage.setItem(navOrderStorageKey, JSON.stringify(next));

      return next;
    });
  }

  function resetNavigationOrder() {
    const next = defaultNavItems.map((item) => item.id);
    setOrderedNavIds(next);
    window.localStorage.setItem(navOrderStorageKey, JSON.stringify(next));
    setDraggingNavId(null);
  }

  const mainClassName = isCockpit
    ? `min-h-screen ${showDesktopNavigation ? "lg:ml-64" : ""}`
    : `px-4 py-6 lg:px-8 lg:py-8 ${showDesktopNavigation ? "lg:ml-64" : ""}`;

  function isNavActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/tasks") {
      return pathname === "/tasks";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNavItem(item: (typeof defaultNavItems)[number]) {
    const isActive = isNavActive(item.href);
    const isDragging = draggingNavId === item.id;

    return (
      <Link
        key={item.id}
        href={item.href}
        draggable
        onDragStart={(event) => {
          setDraggingNavId(item.id);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.id);
        }}
        onDragEnd={() => setDraggingNavId(null)}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const sourceId = event.dataTransfer.getData("text/plain");
          moveNavigationItem(sourceId, item.id);
          setDraggingNavId(null);
        }}
        className={`group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-[13px] leading-5 transition active:cursor-grabbing ${
          isActive
            ? "bg-white/[0.095] text-white"
            : "text-zinc-300 hover:bg-white/[0.065] hover:text-white"
        } ${isDragging ? "scale-[0.98] opacity-55" : ""}`}
        title="ドラッグで並び替え"
      >
        <span className="w-4 text-center text-[12px] text-zinc-500 transition group-hover:text-zinc-300">
          {navIcon(item.id)}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="text-[11px] text-zinc-600 opacity-0 transition group-hover:opacity-100">⋮⋮</span>
      </Link>
    );
  }

  return (
    <body>
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(20,184,166,0.22),transparent_28rem),radial-gradient(circle_at_85%_15%,rgba(244,63,94,0.14),transparent_24rem),linear-gradient(135deg,#09090b_0%,#111827_48%,#030712_100%)] text-slate-100">
        <div className="fixed inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:64px_64px]" />

        {showDesktopNavigation ? (
          <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 border-r border-white/10 bg-zinc-950/82 px-3 py-4 shadow-2xl shadow-black/35 backdrop-blur-2xl lg:flex lg:flex-col">
            <div className="flex items-center justify-between px-2">
              <Link href="/" className="min-w-0 text-[15px] font-semibold tracking-normal text-white">
                <span>AI仕事基盤</span>
                <span className="ml-1 text-teal-300">OS</span>
              </Link>
              <button
                type="button"
                onClick={() => setDesktopNavigationCollapsed(true)}
                className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                title="メニューを隠す"
                aria-label="メニューを隠す"
              >
                ×
              </button>
            </div>

            <nav className="mt-5 space-y-5" aria-label="主要メニュー">
              <section className="space-y-1">
                <button
                  type="button"
                  onClick={() => setCreateMenuOpen(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-zinc-100 transition hover:bg-white/[0.065]"
                >
                  <span className="w-4 text-center text-zinc-400">＋</span>
                  <span>新しく作成</span>
                </button>
              </section>

              <SidebarGroup title="メニュー">{primaryNavItems.map(renderNavItem)}</SidebarGroup>

              <SidebarGroup title="管理">{utilityNavItems.map(renderNavItem)}</SidebarGroup>
            </nav>

            <div className="mt-auto border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={resetNavigationOrder}
                className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-500 transition hover:bg-white/[0.045] hover:text-zinc-300"
              >
                並び順をリセット
              </button>
              <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-zinc-400">
                知識庫を仕事の記録として扱います。
              </p>
            </div>
          </aside>
        ) : null}

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

        {!isCockpit ? (
          <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl lg:hidden">
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
          </header>
        ) : null}

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

function SidebarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 px-2 text-[11px] font-semibold tracking-normal text-zinc-500">{title}</h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function navIcon(id: string) {
  switch (id) {
    case "calendar":
      return "予定";
    case "portfolio":
      return "流";
    case "my-tasks":
      return "自";
    case "projects":
      return "案";
    case "settings":
      return "設";
    case "completed":
      return "完";
    case "trash":
      return "削";
    default:
      return "・";
  }
}
