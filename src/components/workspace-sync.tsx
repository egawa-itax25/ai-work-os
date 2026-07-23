"use client";

import { useEffect, useRef, useState } from "react";
import { storageKey as taskStorageKey } from "@/app/tasks/task-data";
import { portfolioStorageKey } from "@/lib/portfolio-data";
import { trashStorageKey } from "@/lib/trash-data";

type WorkspacePayload = {
  version: 1;
  data: Record<string, string | null>;
};

type WorkspaceRow = {
  state: WorkspacePayload;
  revision: number;
  updated_at: string;
};

type SyncMeta = {
  userId: string;
  revision: number;
  hash: string;
};

export type WorkspaceSyncStatus =
  | "checking"
  | "syncing"
  | "synced"
  | "offline"
  | "local-only"
  | "unavailable"
  | "conflict";

const connectionStorageKey = "ai-work-os:portfolio-connections:v1";
const navigationOrderStorageKey = "ai-work-os:navigation-order";
const syncMetaStorageKey = "ai-work-os:sync-meta:v1";
const syncConflictStorageKey = "ai-work-os:sync-conflict-backup:v1";
const syncNoticeStorageKey = "ai-work-os:sync-notice:v1";
const durableStorageKeys = [
  portfolioStorageKey,
  taskStorageKey,
  connectionStorageKey,
  trashStorageKey,
  navigationOrderStorageKey,
] as const;

export function useWorkspaceSync(enabled: boolean) {
  const [ready, setReady] = useState(!enabled);
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<WorkspaceSyncStatus>(
    enabled ? "checking" : "local-only",
  );
  const revisionRef = useRef(0);
  const syncedHashRef = useRef("");
  const userIdRef = useRef("");
  const busyRef = useRef(false);
  const nextRetryAtRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      setStatus("local-only");
      return;
    }

    stoppedRef.current = false;
    let localTimer: number | undefined;
    let remoteTimer: number | undefined;
    const savedNotice = window.sessionStorage.getItem(syncNoticeStorageKey);

    if (savedNotice) {
      setNotice(savedNotice);
      window.sessionStorage.removeItem(syncNoticeStorageKey);
    }

    function recordSyncedWorkspaceLocal(
      userId: string,
      revision: number,
      payload: WorkspacePayload,
    ) {
      const hash = hashPayload(payload);
      revisionRef.current = revision;
      syncedHashRef.current = hash;
      cachePayload(userId, payload);
      window.localStorage.setItem(
        syncMetaStorageKey,
        JSON.stringify({ userId, revision, hash } satisfies SyncMeta),
      );
    }

    async function initialize() {
      setReady(false);
      setStatus("checking");

      const response = await fetchWorkspace();

      if (stoppedRef.current) {
        return;
      }

      if (response.kind === "unauthenticated") {
        protectSignedOutCache();
        setStatus("local-only");
        setReady(true);
        return;
      }

      if (response.kind === "unavailable") {
        setStatus(response.offline ? "offline" : "unavailable");
        setReady(true);
        return;
      }

      const { userId } = response;
      userIdRef.current = userId;
      const storedMeta = readSyncMeta();
      const switchedAccount = Boolean(storedMeta?.userId && storedMeta.userId !== userId);

      if (switchedAccount && storedMeta) {
        cachePayload(storedMeta.userId, capturePayload());
      }

      if (response.workspace) {
        const remotePayload = normalizePayload(response.workspace.state);
        const localPayload = switchedAccount
          ? readCachedPayload(userId) ?? emptyPayload()
          : capturePayload();
        const localHash = hashPayload(localPayload);
        const localChangedSinceSync =
          storedMeta?.userId === userId && storedMeta.hash !== localHash;
        const remoteAdvanced =
          storedMeta?.userId === userId && response.workspace.revision > storedMeta.revision;

        if (
          !storedMeta &&
          hasPayloadData(localPayload) &&
          localHash !== hashPayload(remotePayload)
        ) {
          preserveConflict(localPayload, response.workspace);
          setNotice(
            "クラウド側の状態を優先し、この端末にあった内容をバックアップしました。",
          );
        }

        if (localChangedSinceSync && !remoteAdvanced) {
          applyPayload(localPayload);
          await writeWorkspace(localPayload, response.workspace.revision);
        } else {
          if (localChangedSinceSync && remoteAdvanced) {
            preserveConflict(localPayload, response.workspace);
          }

          applyPayload(remotePayload);
          recordSyncedWorkspaceLocal(userId, response.workspace.revision, remotePayload);
        }
      } else {
        const initialPayload = switchedAccount
          ? readCachedPayload(userId) ?? emptyPayload()
          : capturePayload();
        applyPayload(initialPayload);
        await writeWorkspace(initialPayload, 0);
      }

      if (stoppedRef.current) {
        return;
      }

      setReady(true);
      if (revisionRef.current > 0) {
        setStatus("synced");
      } else {
        setStatus(window.navigator.onLine ? "unavailable" : "offline");
      }
      localTimer = window.setInterval(syncLocalChanges, 1200);
      remoteTimer = window.setInterval(checkRemoteChanges, 15000);
    }

    async function syncLocalChanges() {
      if (
        busyRef.current ||
        !userIdRef.current ||
        !window.navigator.onLine ||
        Date.now() < nextRetryAtRef.current
      ) {
        return;
      }

      const payload = capturePayload();

      if (hashPayload(payload) === syncedHashRef.current) {
        return;
      }

      await writeWorkspace(payload, revisionRef.current);
    }

    async function checkRemoteChanges() {
      if (
        busyRef.current ||
        !userIdRef.current ||
        !window.navigator.onLine ||
        Date.now() < nextRetryAtRef.current
      ) {
        return;
      }

      const response = await fetchWorkspace();

      if (response.kind !== "ready" || !response.workspace) {
        if (response.kind === "unavailable") {
          setStatus(response.offline ? "offline" : "unavailable");
        }
        return;
      }

      if (response.workspace.revision <= revisionRef.current) {
        setStatus("synced");
        return;
      }

      const localPayload = capturePayload();

      if (hashPayload(localPayload) !== syncedHashRef.current) {
        preserveConflict(localPayload, response.workspace);
      }

      const remotePayload = normalizePayload(response.workspace.state);
      applyPayload(remotePayload);
      recordSyncedWorkspaceLocal(response.userId, response.workspace.revision, remotePayload);
      window.sessionStorage.setItem(
        syncNoticeStorageKey,
        "別デバイスの更新を同期しました。",
      );
      window.location.reload();
    }

    async function writeWorkspace(payload: WorkspacePayload, expectedRevision: number) {
      if (busyRef.current || !userIdRef.current) {
        return;
      }

      busyRef.current = true;
      setStatus("syncing");

      try {
        const response = await fetch("/api/workspace-state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: payload, expectedRevision }),
        });
        const result = (await response.json()) as {
          workspace?: WorkspaceRow | null;
        };

        if (response.status === 409 && result.workspace) {
          preserveConflict(payload, result.workspace);
          const remotePayload = normalizePayload(result.workspace.state);
          applyPayload(remotePayload);
          recordSyncedWorkspaceLocal(userIdRef.current, result.workspace.revision, remotePayload);
          setStatus("conflict");
          window.sessionStorage.setItem(
            syncNoticeStorageKey,
            "別デバイスの更新を優先し、この端末の内容をバックアップしました。",
          );
          window.location.reload();
          return;
        }

        if (!response.ok || !result.workspace) {
          nextRetryAtRef.current = Date.now() + 5000;
          setStatus(window.navigator.onLine ? "unavailable" : "offline");
          return;
        }

        nextRetryAtRef.current = 0;
        recordSyncedWorkspaceLocal(userIdRef.current, result.workspace.revision, payload);
        setStatus("synced");
      } catch {
        nextRetryAtRef.current = Date.now() + 5000;
        setStatus(window.navigator.onLine ? "unavailable" : "offline");
      } finally {
        busyRef.current = false;
      }
    }

    function handleOffline() {
      setStatus("offline");
    }

    function handleOnline() {
      void checkRemoteChanges().then(syncLocalChanges);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    void initialize();

    return () => {
      stoppedRef.current = true;
      if (localTimer) window.clearInterval(localTimer);
      if (remoteTimer) window.clearInterval(remoteTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled]);

  return {
    ready,
    status,
    notice,
    dismissNotice: () => setNotice(""),
  };
}

export function WorkspaceSyncBadge({ status }: { status: WorkspaceSyncStatus }) {
  const labels: Record<WorkspaceSyncStatus, string> = {
    checking: "同期確認中…",
    syncing: "同期中…",
    synced: "同期済み",
    offline: "オフライン",
    "local-only": "この端末のみ",
    unavailable: "同期を利用できません",
    conflict: "競合を保護しました",
  };
  const tone =
    status === "synced"
      ? "border-emerald-300/25 text-emerald-100"
      : status === "offline" || status === "unavailable" || status === "conflict"
        ? "border-amber-300/30 text-amber-100"
        : "border-white/10 text-slate-400";

  return (
    <span
      role="status"
      aria-live="polite"
      className={`rounded-md border bg-slate-950/85 px-2 py-1 text-[11px] shadow-lg shadow-black/20 backdrop-blur-xl ${tone}`}
    >
      {labels[status]}
    </span>
  );
}

async function fetchWorkspace(): Promise<
  | { kind: "ready"; userId: string; workspace: WorkspaceRow | null }
  | { kind: "unauthenticated" }
  | { kind: "unavailable"; offline: boolean }
> {
  try {
    const response = await fetch("/api/workspace-state", { cache: "no-store" });

    if (response.status === 401) {
      return { kind: "unauthenticated" };
    }

    if (!response.ok) {
      return { kind: "unavailable", offline: !window.navigator.onLine };
    }

    const result = (await response.json()) as {
      userId?: string;
      status?: "ready" | "empty";
      workspace?: WorkspaceRow;
    };

    if (!result.userId) {
      return { kind: "unavailable", offline: false };
    }

    return {
      kind: "ready",
      userId: result.userId,
      workspace: result.status === "ready" ? result.workspace ?? null : null,
    };
  } catch {
    return { kind: "unavailable", offline: !window.navigator.onLine };
  }
}

function capturePayload(): WorkspacePayload {
  return {
    version: 1,
    data: Object.fromEntries(
      durableStorageKeys.map((key) => [key, window.localStorage.getItem(key)]),
    ),
  };
}

function emptyPayload(): WorkspacePayload {
  return {
    version: 1,
    data: Object.fromEntries(durableStorageKeys.map((key) => [key, null])),
  };
}

function normalizePayload(value: WorkspacePayload): WorkspacePayload {
  return {
    version: 1,
    data: Object.fromEntries(
      durableStorageKeys.map((key) => [
        key,
        typeof value?.data?.[key] === "string" ? value.data[key] : null,
      ]),
    ),
  };
}

function applyPayload(payload: WorkspacePayload) {
  durableStorageKeys.forEach((key) => {
    const value = payload.data[key];

    if (typeof value === "string") {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  });
}

function readSyncMeta(): SyncMeta | null {
  const saved = window.localStorage.getItem(syncMetaStorageKey);

  if (!saved) return null;

  try {
    const value = JSON.parse(saved) as Partial<SyncMeta>;
    return typeof value.userId === "string" &&
      Number.isSafeInteger(value.revision) &&
      typeof value.hash === "string"
      ? (value as SyncMeta)
      : null;
  } catch {
    return null;
  }
}

function cachePayload(userId: string, payload: WorkspacePayload) {
  if (!userId) return;
  window.localStorage.setItem(`ai-work-os:sync-cache:${userId}`, JSON.stringify(payload));
}

function readCachedPayload(userId: string) {
  const saved = window.localStorage.getItem(`ai-work-os:sync-cache:${userId}`);

  if (!saved) return null;

  try {
    return normalizePayload(JSON.parse(saved) as WorkspacePayload);
  } catch {
    return null;
  }
}

function preserveConflict(localPayload: WorkspacePayload, remote: WorkspaceRow) {
  window.localStorage.setItem(
    syncConflictStorageKey,
    JSON.stringify({
      createdAt: new Date().toISOString(),
      remoteRevision: remote.revision,
      localPayload,
    }),
  );
}

function protectSignedOutCache() {
  const meta = readSyncMeta();

  if (!meta?.userId) return;
  cachePayload(meta.userId, capturePayload());
  applyPayload(emptyPayload());
  window.localStorage.removeItem(syncMetaStorageKey);
}

function hashPayload(payload: WorkspacePayload) {
  const text = JSON.stringify(payload);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function hasPayloadData(payload: WorkspacePayload) {
  return Object.values(payload.data).some((value) => typeof value === "string");
}
