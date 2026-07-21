"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getSyncSnapshot,
  publishSyncStatus,
  subscribeSyncStatus,
  type GlobalSyncSnapshot,
} from "@/lib/sync-status";
import { syncKnownLocalResources } from "@/lib/synced-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function formatTime(value: string | null) {
  if (!value) {
    return "\u672a\u540c\u671f";
  }

  try {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return "\u672a\u540c\u671f";
  }
}

function getSummary(snapshot: GlobalSyncSnapshot, user: User | null, configured: boolean) {
  if (!configured) {
    return {
      tone: "local",
      title: "\u30ed\u30fc\u30ab\u30eb\u4fdd\u5b58",
      detail: "Supabase\u672a\u8a2d\u5b9a",
    };
  }

  if (!user) {
    return {
      tone: "local",
      title: "\u3053\u306e\u7aef\u672b\u3060\u3051\u306b\u4fdd\u5b58\u4e2d",
      detail: "\u30ed\u30b0\u30a4\u30f3\u3067\u540c\u671f",
    };
  }

  if (snapshot.phase === "saving") {
    return {
      tone: "saving",
      title: "\u4fdd\u5b58\u4e2d...",
      detail: user.email ?? "\u30ed\u30b0\u30a4\u30f3\u4e2d",
    };
  }

  if (snapshot.phase === "error") {
    return {
      tone: "error",
      title: "\u540c\u671f\u30a8\u30e9\u30fc",
      detail: "\u518d\u8a66\u884c\u3067\u304d\u307e\u3059",
    };
  }

  if (snapshot.pendingLocalChanges || snapshot.phase === "local") {
    return {
      tone: "local",
      title: "\u30ed\u30fc\u30ab\u30eb\u5909\u66f4\u3042\u308a",
      detail: "\u540c\u671f\u5f85\u3061",
    };
  }

  return {
    tone: "cloud",
    title: "\u30af\u30e9\u30a6\u30c9\u540c\u671f\u6e08\u307f",
    detail: user.email ?? "\u30ed\u30b0\u30a4\u30f3\u4e2d",
  };
}

export function SyncStatusIndicator() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [manualSyncing, setManualSyncing] = useState(false);
  const [snapshot, setSnapshot] = useState<GlobalSyncSnapshot>(() => getSyncSnapshot());
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const configured = mounted && Boolean(supabase);
  const summary = getSummary(snapshot, user, configured);
  const isError = summary.tone === "error";

  useEffect(() => subscribeSyncStatus(setSnapshot), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      publishSyncStatus({
        phase: "local",
        mode: "local",
        message:
          "Supabase\u304c\u672a\u8a2d\u5b9a\u306e\u305f\u3081\u3001\u3053\u306e\u7aef\u672b\u3060\u3051\u306b\u4fdd\u5b58\u3057\u3066\u3044\u307e\u3059\u3002",
        pendingLocalChanges: true,
      });
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      publishSyncStatus({
        phase: session?.user ? "local" : "signed-out",
        mode: session?.user ? "cloud" : "local",
        message: session?.user
          ? "\u30ed\u30b0\u30a4\u30f3\u4e2d\u3067\u3059\u3002\u30ed\u30fc\u30ab\u30eb\u30c7\u30fc\u30bf\u306f\u540c\u671f\u5bfe\u8c61\u3068\u3057\u3066\u4fdd\u6301\u3055\u308c\u3066\u3044\u307e\u3059\u3002"
          : "\u3053\u306e\u7aef\u672b\u3060\u3051\u306b\u4fdd\u5b58\u3057\u3066\u3044\u307e\u3059\u3002",
        pendingLocalChanges: Boolean(session?.user),
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleManualSync() {
    setManualSyncing(true);
    publishSyncStatus({
      phase: "saving",
      message: "\u624b\u52d5\u540c\u671f\u4e2d...",
    });

    try {
      await syncKnownLocalResources();
    } finally {
      setManualSyncing(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    publishSyncStatus({
      phase: "signed-out",
      mode: "local",
      message:
        "\u30ed\u30b0\u30a2\u30a6\u30c8\u3057\u307e\u3057\u305f\u3002\u3053\u306e\u7aef\u672b\u3060\u3051\u306b\u4fdd\u5b58\u3057\u3066\u3044\u307e\u3059\u3002",
      pendingLocalChanges: true,
    });
  }

  return (
    <div className="fixed bottom-16 left-3 right-3 z-[60] sm:bottom-4 sm:left-auto sm:right-4 sm:w-[360px]">
      {open ? (
        <section className="mb-2 rounded-xl border border-white/12 bg-slate-950/95 p-4 shadow-2xl shadow-black/45 backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">\u540c\u671f\u72b6\u614b</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {user
                  ? "\u3053\u306e\u30ef\u30fc\u30af\u30b9\u30da\u30fc\u30b9\u306f\u30af\u30e9\u30a6\u30c9\u540c\u671f\u306e\u5bfe\u8c61\u3067\u3059\u3002\u540c\u3058\u30a2\u30ab\u30a6\u30f3\u30c8\u3067\u30ed\u30b0\u30a4\u30f3\u3059\u308b\u3068\u5225\u7aef\u672b\u3067\u3082\u5229\u7528\u3067\u304d\u307e\u3059\u3002"
                  : "\u73fe\u5728\u306e\u5909\u66f4\u306f\u3053\u306e\u7aef\u672b\u3060\u3051\u306b\u4fdd\u5b58\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u5225PC\u30fb\u30b9\u30de\u30db\u3068\u5171\u6709\u3059\u308b\u306b\u306f\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="\u540c\u671f\u30d1\u30cd\u30eb\u3092\u9589\u3058\u308b"
            >
              x
            </button>
          </div>

          <dl className="mt-4 grid gap-2 text-xs">
            <InfoRow label="\u30ed\u30b0\u30a4\u30f3\u72b6\u614b" value={user ? "\u30ed\u30b0\u30a4\u30f3\u4e2d" : "\u672a\u30ed\u30b0\u30a4\u30f3"} />
            <InfoRow label="\u30a2\u30ab\u30a6\u30f3\u30c8" value={user?.email ?? "\u306a\u3057"} />
            <InfoRow
              label="\u4fdd\u5b58\u5148"
              value={user && configured ? "\u30af\u30e9\u30a6\u30c9\u540c\u671f" : "\u30ed\u30fc\u30ab\u30eb\u306e\u307f"}
            />
            <InfoRow label="\u6700\u7d42\u540c\u671f" value={formatTime(snapshot.lastSyncedAt)} />
            <div className="rounded-lg bg-white/[0.035] px-3 py-2">
              <dt className="text-slate-500">\u72b6\u614b</dt>
              <dd className={`mt-1 font-semibold ${isError ? "text-red-200" : "text-slate-100"}`}>
                {snapshot.message}
              </dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={manualSyncing}
              className="rounded-lg border border-sky-200/30 bg-sky-200/[0.08] px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-200/[0.14] disabled:cursor-wait disabled:opacity-60"
            >
              {manualSyncing ? "\u540c\u671f\u4e2d..." : isError ? "\u518d\u8a66\u884c" : "\u624b\u52d5\u540c\u671f"}
            </button>
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                \u30ed\u30b0\u30a2\u30a6\u30c8
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                \u30ed\u30b0\u30a4\u30f3
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
            <span className="block truncate text-[11px] text-slate-400">{summary.detail}</span>
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-slate-500">{formatTime(snapshot.lastSyncedAt)}</span>
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-white/[0.035] px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
