"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getSyncSnapshot,
  publishSyncStatus,
  subscribeSyncStatus,
  type GlobalSyncSnapshot,
} from "@/lib/sync-status";
import { syncKnownLocalResources } from "@/lib/synced-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthUser = {
  id: string;
  email: string | null;
};

type AuthStatusResponse = {
  configured: boolean;
  user: AuthUser | null;
  error?: string;
};

function formatTime(value: string | null) {
  if (!value) {
    return "未同期";
  }

  try {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return "未同期";
  }
}

function getSummary(
  snapshot: GlobalSyncSnapshot,
  user: AuthUser | null,
  configured: boolean,
  checking: boolean,
) {
  if (checking) {
    return { tone: "saving", title: "ログイン状態を確認中...", detail: "少しお待ちください" };
  }

  if (!configured) {
    return { tone: "local", title: "ローカル保存", detail: "クラウド同期は未設定" };
  }

  if (!user) {
    return { tone: "local", title: "この端末だけに保存中", detail: "ログインで同期" };
  }

  if (snapshot.phase === "saving") {
    return { tone: "saving", title: "保存中...", detail: user.email ?? "ログイン中" };
  }

  if (snapshot.phase === "error") {
    return { tone: "error", title: "同期エラー", detail: "再試行できます" };
  }

  if (snapshot.pendingLocalChanges || snapshot.phase === "local") {
    return { tone: "local", title: "ローカル変更あり", detail: "同期待ち" };
  }

  return { tone: "cloud", title: "クラウド同期済み", detail: user.email ?? "ログイン中" };
}

export function SyncStatusIndicator() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [manualSyncing, setManualSyncing] = useState(false);
  const [snapshot, setSnapshot] = useState<GlobalSyncSnapshot>(() => getSyncSnapshot());
  const summary = getSummary(snapshot, user, configured, checking);
  const isError = summary.tone === "error" || Boolean(authError && configured);
  const visibleLastSyncedAt = user ? snapshot.lastSyncedAt : null;
  const visibleMessage = user
    ? snapshot.message
    : configured
      ? "現在の変更はこの端末だけに保存されています。ログインすると別端末と共有できます。"
      : "クラウド同期が未設定のため、この端末だけに保存しています。";

  const refreshAuthStatus = useCallback(async () => {
    setChecking(true);

    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const result = (await response.json()) as AuthStatusResponse;
      setConfigured(result.configured);
      setUser(result.user);
      setAuthError(result.error ?? null);

      if (!result.configured) {
        publishSyncStatus({
          phase: "local",
          mode: "local",
          message: "クラウド同期が未設定のため、この端末だけに保存しています。",
          pendingLocalChanges: true,
          lastSyncedAt: null,
        });
      } else if (!result.user) {
        publishSyncStatus({
          phase: "signed-out",
          mode: "local",
          message: "現在の変更はこの端末だけに保存されています。",
          pendingLocalChanges: true,
          lastSyncedAt: null,
        });
      }
      return result;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "ログイン状態を確認できませんでした。");
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => subscribeSyncStatus(setSnapshot), []);

  useEffect(() => {
    void refreshAuthStatus();
    const supabase = createSupabaseBrowserClient();
    const subscription = supabase?.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshAuthStatus(), 100);
    });

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshAuthStatus();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      subscription?.data.subscription.unsubscribe();
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshAuthStatus]);

  async function handleManualSync() {
    const authStatus = await refreshAuthStatus();
    if (!authStatus?.user) {
      publishSyncStatus({
        phase: "signed-out",
        mode: "local",
        message: "手動同期にはログインが必要です。",
        pendingLocalChanges: true,
        lastSyncedAt: null,
      });
      return;
    }

    setManualSyncing(true);
    publishSyncStatus({ phase: "saving", message: "手動同期中..." });
    try {
      await syncKnownLocalResources();
    } finally {
      setManualSyncing(false);
    }
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    await refreshAuthStatus();
  }

  return (
    <div className="fixed bottom-16 left-3 right-3 z-[60] sm:bottom-4 sm:left-auto sm:right-4 sm:w-[360px]">
      {open ? (
        <section className="mb-2 rounded-xl border border-white/12 bg-slate-950/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">同期状態</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {user
                  ? "このワークスペースはクラウドに同期されています。同じアカウントでログインすると別端末でも利用できます。"
                  : "現在の変更はこの端末だけに保存されています。別PC・スマホと共有するにはログインしてください。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="同期パネルを閉じる"
            >
              ×
            </button>
          </div>

          <dl className="mt-4 grid gap-2 text-xs">
            <InfoRow label="ログイン状態" value={checking ? "確認中" : user ? "ログイン中" : "未ログイン"} />
            <InfoRow label="アカウント" value={user?.email ?? "なし"} />
            <InfoRow label="保存先" value={user && configured ? "クラウド同期" : "ローカルのみ"} />
            <InfoRow label="最終同期" value={formatTime(visibleLastSyncedAt)} />
            <div className="rounded-lg bg-white/[0.035] px-3 py-2">
              <dt className="text-slate-400">状態</dt>
              <dd className={`mt-1 font-semibold ${isError ? "text-red-200" : "text-slate-100"}`}>
                {authError && configured ? `認証確認エラー: ${authError}` : visibleMessage}
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={manualSyncing || checking || !user}
              className="rounded-lg border border-sky-200/30 bg-sky-200/[0.08] px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-200/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {manualSyncing ? "同期中..." : isError ? "再試行" : "手動同期"}
            </button>
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                ログアウト
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                ログイン
              </Link>
            )}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left shadow-xl shadow-black/35 backdrop-blur-2xl transition ${
          isError
            ? "border-red-300/35 bg-red-950/75 text-red-50 hover:bg-red-950/90"
            : "border-sky-200/20 bg-slate-950/82 text-slate-100 hover:border-sky-200/35 hover:bg-slate-900/90"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isError
                ? "bg-red-300"
                : summary.tone === "cloud"
                  ? "bg-emerald-300"
                  : summary.tone === "saving"
                    ? "bg-sky-300"
                    : "bg-amber-200"
            }`}
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold">{summary.title}</span>
            <span className="block truncate text-[11px] text-slate-300">{summary.detail}</span>
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-slate-400">{formatTime(visibleLastSyncedAt)}</span>
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="min-w-0 truncate font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
