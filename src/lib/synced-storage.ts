import {
  getRegisteredSyncResources,
  publishSyncStatus,
  registerSyncResource,
} from "@/lib/sync-status";

type SyncedStateOptions<T> = {
  localKey: string;
  remoteKey: string;
  fallback: T;
  normalize: (value: unknown) => T;
  onValue: (value: T) => void;
  onStatus?: (result: SyncResult) => void;
};

export type SyncStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "local"
  | "signed-out"
  | "error";

export type SyncResult = {
  status: SyncStatus;
  message: string;
  httpStatus?: number;
};

export type SyncLoadSource =
  | "fallback"
  | "local"
  | "remote"
  | "merged"
  | "signed-out"
  | "error";

export type SyncLoadResult = SyncResult & {
  source: SyncLoadSource;
  hadLocal: boolean;
  hadRemote: boolean;
  uploaded?: boolean;
};

type RemotePayload = {
  value?: unknown;
  updatedAt?: string | null;
};

type LocalMeta = {
  updatedAt: string;
};

const syncMetaPrefix = "ai-work-os:sync-meta:";
const backupPrefix = "ai-work-os:backup:";
const maxBackups = 8;

const messages = {
  checking: "\u30af\u30e9\u30a6\u30c9\u540c\u671f\u3092\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059\u3002",
  firstUpload:
    "\u3053\u306e\u7aef\u672b\u306e\u30c7\u30fc\u30bf\u3092\u30af\u30e9\u30a6\u30c9\u3078\u521d\u56de\u540c\u671f\u3057\u307e\u3057\u305f\u3002",
  noRemote:
    "\u30af\u30e9\u30a6\u30c9\u306b\u4fdd\u5b58\u6e08\u307f\u30c7\u30fc\u30bf\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002",
  merged:
    "\u3053\u306e\u7aef\u672b\u3060\u3051\u306b\u3042\u3063\u305f\u30c7\u30fc\u30bf\u3092\u30af\u30e9\u30a6\u30c9\u3078\u7d71\u5408\u3057\u307e\u3057\u305f\u3002",
  uploaded:
    "\u3053\u306e\u7aef\u672b\u306e\u65b0\u3057\u3044\u30c7\u30fc\u30bf\u3092\u30af\u30e9\u30a6\u30c9\u3078\u53cd\u6620\u3057\u307e\u3057\u305f\u3002",
  synced: "\u30af\u30e9\u30a6\u30c9\u540c\u671f\u6e08\u307f\u3067\u3059\u3002",
  serverOnly: "\u30d6\u30e9\u30a6\u30b6\u5916\u3067\u306f\u4fdd\u5b58\u3057\u307e\u305b\u3093\u3002",
  syncFailed: "\u30af\u30e9\u30a6\u30c9\u540c\u671f\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
  signedOut:
    "\u30ed\u30b0\u30a4\u30f3\u3059\u308b\u3068PC\u3068\u30b9\u30de\u30db\u3067\u540c\u671f\u3067\u304d\u307e\u3059\u3002",
  checkFailed:
    "\u3053\u306e\u7aef\u672b\u306b\u4fdd\u5b58\u3057\u3066\u3044\u307e\u3059\u3002\u30af\u30e9\u30a6\u30c9\u78ba\u8a8d\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
  saveFailed:
    "\u3053\u306e\u7aef\u672b\u306b\u4fdd\u5b58\u3057\u3066\u3044\u307e\u3059\u3002\u30af\u30e9\u30a6\u30c9\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
};

export async function loadSyncedState<T>({
  localKey,
  remoteKey,
  fallback,
  normalize,
  onValue,
  onStatus,
}: SyncedStateOptions<T>): Promise<SyncLoadResult | undefined> {
  if (typeof window === "undefined") {
    return undefined;
  }

  registerSyncResource({ localKey, remoteKey });
  const local = readLocalValue(localKey, normalize, fallback);
  const localValue = local.value;
  const localMeta = readLocalMeta(localKey);
  onValue(localValue);
  setSyncStatus(onStatus, {
    status: "loading",
    message: messages.checking,
  });

  try {
    const response = await fetch(`/api/workspace-state/${encodeURIComponent(remoteKey)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const result = await createHttpResult(response);
      setSyncStatus(onStatus, result);
      return {
        ...result,
        source: response.status === 401 ? "signed-out" : "error",
        hadLocal: local.exists,
        hadRemote: false,
      };
    }

    const payload = (await response.json()) as RemotePayload;
    const hasRemote = payload.value !== null && typeof payload.value !== "undefined";

    if (!hasRemote) {
      if (local.exists && !isEmptySyncedValue(localValue)) {
        const result = await saveSyncedState(localKey, remoteKey, localValue);
        const loadResult: SyncLoadResult = {
          ...result,
          message: result.status === "synced" ? messages.firstUpload : result.message,
          source: "local",
          hadLocal: true,
          hadRemote: false,
          uploaded: result.status === "synced",
        };
        setSyncStatus(onStatus, loadResult);
        return loadResult;
      }

      const loadResult: SyncLoadResult = {
        status: "synced",
        message: messages.noRemote,
        source: "fallback",
        hadLocal: false,
        hadRemote: false,
      };
      setSyncStatus(onStatus, loadResult);
      return loadResult;
    }

    const remoteValue = normalize(payload.value);
    const remoteUpdatedAt = payload.updatedAt ?? "";
    const merged = mergeLocalOnlyItems(localValue, remoteValue);

    if (local.exists && merged.changed) {
      if (!areEqualJson(localValue, merged.value)) {
        writeLocalBackup(localKey, localValue);
      }
      window.localStorage.setItem(localKey, JSON.stringify(merged.value));
      onValue(merged.value);

      const result = await saveSyncedState(localKey, remoteKey, merged.value);
      const loadResult: SyncLoadResult = {
        ...result,
        message: result.status === "synced" ? messages.merged : result.message,
        source: "merged",
        hadLocal: true,
        hadRemote: true,
        uploaded: result.status === "synced",
      };
      setSyncStatus(onStatus, loadResult);
      return loadResult;
    }

    if (shouldUploadLocal(local, localMeta, localValue, remoteValue, remoteUpdatedAt)) {
      const result = await saveSyncedState(localKey, remoteKey, localValue);
      const loadResult: SyncLoadResult = {
        ...result,
        message: result.status === "synced" ? messages.uploaded : result.message,
        source: "local",
        hadLocal: true,
        hadRemote: true,
        uploaded: result.status === "synced",
      };
      setSyncStatus(onStatus, loadResult);
      return loadResult;
    }

    if (local.exists && !areEqualJson(localValue, remoteValue)) {
      writeLocalBackup(localKey, localValue);
    }

    window.localStorage.setItem(localKey, JSON.stringify(remoteValue));
    if (remoteUpdatedAt) {
      writeLocalMeta(localKey, remoteUpdatedAt);
    }
    onValue(remoteValue);

    const loadResult: SyncLoadResult = {
      status: "synced",
      message: messages.synced,
      source: "remote",
      hadLocal: local.exists,
      hadRemote: true,
    };
    setSyncStatus(onStatus, loadResult);
    return loadResult;
  } catch (error) {
    const loadResult: SyncLoadResult = {
      status: "local",
      message: error instanceof Error ? `${messages.checkFailed}: ${error.message}` : messages.checkFailed,
      source: "error",
      hadLocal: local.exists,
      hadRemote: false,
    };
    setSyncStatus(onStatus, loadResult);
    return loadResult;
  }
}

export async function saveSyncedState<T>(
  localKey: string,
  remoteKey: string,
  value: T,
): Promise<SyncResult> {
  if (typeof window === "undefined") {
    return {
      status: "idle",
      message: messages.serverOnly,
    };
  }

  registerSyncResource({ localKey, remoteKey });
  const updatedAt = new Date().toISOString();
  window.localStorage.setItem(localKey, JSON.stringify(value));
  writeLocalMeta(localKey, updatedAt);
  emitSyncStatus({
    status: "saving",
    message: "保存中...",
  });

  try {
    const response = await fetch(`/api/workspace-state/${encodeURIComponent(remoteKey)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      const result = await createHttpResult(response);
      emitSyncStatus(result);
      return result;
    }

    const payload = (await response.json().catch(() => null)) as { updatedAt?: string } | null;
    if (payload?.updatedAt) {
      writeLocalMeta(localKey, payload.updatedAt);
    }

    const result: SyncResult = {
      status: "synced",
      message: messages.synced,
    };
    emitSyncStatus(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      status: "local",
      message: error instanceof Error ? `${messages.saveFailed}: ${error.message}` : messages.saveFailed,
    };
    emitSyncStatus(result);
    return result;
  }
}

export async function syncKnownLocalResources() {
  if (typeof window === "undefined") {
    return [];
  }

  const results: SyncResult[] = [];

  for (const resource of getRegisteredSyncResources()) {
    const saved = window.localStorage.getItem(resource.localKey);

    if (!saved) {
      continue;
    }

    try {
      results.push(
        await saveSyncedState(resource.localKey, resource.remoteKey, JSON.parse(saved) as unknown),
      );
    } catch (error) {
      const result: SyncResult = {
        status: "error",
        message: error instanceof Error ? error.message : "手動同期に失敗しました。",
      };
      emitSyncStatus(result);
      results.push(result);
    }
  }

  if (results.length === 0) {
    const result: SyncResult = {
      status: "local",
      message: "同期対象のローカルデータはまだ読み込まれていません。",
    };
    emitSyncStatus(result);
    return [result];
  }

  return results;
}

function readLocalValue<T>(
  localKey: string,
  normalize: (value: unknown) => T,
  fallback: T,
): { value: T; exists: boolean } {
  const saved = window.localStorage.getItem(localKey);

  if (!saved) {
    return { value: fallback, exists: false };
  }

  try {
    return { value: normalize(JSON.parse(saved)), exists: true };
  } catch {
    writeLocalBackup(localKey, saved);
    window.localStorage.removeItem(localKey);
    window.localStorage.removeItem(getMetaKey(localKey));
    return { value: fallback, exists: false };
  }
}

async function createHttpResult(response: Response): Promise<SyncResult> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  const message = payload?.error || response.statusText || messages.syncFailed;

  if (response.status === 401) {
    return {
      status: "signed-out",
      httpStatus: response.status,
      message: messages.signedOut,
    };
  }

  return {
    status: "error",
    httpStatus: response.status,
    message,
  };
}

function shouldUploadLocal<T>(
  local: { value: T; exists: boolean },
  localMeta: LocalMeta | null,
  localValue: T,
  remoteValue: T,
  remoteUpdatedAt: string,
) {
  if (!local.exists || isEmptySyncedValue(localValue)) {
    return false;
  }

  if (isEmptySyncedValue(remoteValue)) {
    return true;
  }

  if (localMeta?.updatedAt) {
    if (!remoteUpdatedAt) {
      return true;
    }

    return Date.parse(localMeta.updatedAt) > Date.parse(remoteUpdatedAt);
  }

  return getValueWeight(localValue) > getValueWeight(remoteValue);
}

function mergeLocalOnlyItems<T>(localValue: T, remoteValue: T): { value: T; changed: boolean } {
  if (!Array.isArray(localValue) || !Array.isArray(remoteValue)) {
    return { value: remoteValue, changed: false };
  }

  const remoteIds = new Set(
    remoteValue.flatMap((item) => (hasStableId(item) ? [item.id] : [])),
  );
  const localOnlyItems = localValue.filter((item) => hasStableId(item) && !remoteIds.has(item.id));

  if (localOnlyItems.length === 0) {
    return { value: remoteValue, changed: false };
  }

  return { value: [...remoteValue, ...localOnlyItems] as T, changed: true };
}

function hasStableId(value: unknown): value is { id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string" &&
    (value as { id: string }).id.length > 0
  );
}

function readLocalMeta(localKey: string): LocalMeta | null {
  const saved = window.localStorage.getItem(getMetaKey(localKey));

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<LocalMeta>;
    return typeof parsed.updatedAt === "string" ? { updatedAt: parsed.updatedAt } : null;
  } catch {
    return null;
  }
}

function writeLocalMeta(localKey: string, updatedAt: string) {
  window.localStorage.setItem(getMetaKey(localKey), JSON.stringify({ updatedAt }));
}

function writeLocalBackup(localKey: string, value: unknown) {
  try {
    const key = `${backupPrefix}${localKey}`;
    const saved = window.localStorage.getItem(key);
    const backups = saved ? (JSON.parse(saved) as unknown[]) : [];
    const nextBackups = [
      {
        createdAt: new Date().toISOString(),
        value,
      },
      ...backups,
    ].slice(0, maxBackups);

    window.localStorage.setItem(key, JSON.stringify(nextBackups));
  } catch {
    // Backup is a safety net. Sync should continue even when storage is full.
  }
}

function getMetaKey(localKey: string) {
  return `${syncMetaPrefix}${localKey}`;
}

function isEmptySyncedValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return value === null || typeof value === "undefined" || value === "";
}

function getValueWeight(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length + value.reduce((total, item) => total + getValueWeight(item), 0);
  }

  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, item) => total + getValueWeight(item), 1);
  }

  return value ? 1 : 0;
}

function areEqualJson(left: unknown, right: unknown) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function setSyncStatus(onStatus: ((result: SyncResult) => void) | undefined, result: SyncResult) {
  onStatus?.(result);
  emitSyncStatus(result);
}

function emitSyncStatus(result: SyncResult) {
  if (typeof window === "undefined") {
    return;
  }

  const nextStatus = {
    phase: result.status,
    mode: result.status === "synced" ? "cloud" : result.status === "idle" ? "unknown" : "local",
    message: result.message,
    httpStatus: result.httpStatus,
    pendingLocalChanges: result.status === "local" || result.status === "signed-out",
  } satisfies Parameters<typeof publishSyncStatus>[0];

  if (result.status === "synced") {
    publishSyncStatus({
      ...nextStatus,
      lastSyncedAt: new Date().toISOString(),
    });
  } else {
    publishSyncStatus(nextStatus);
  }

  window.dispatchEvent(new CustomEvent("ai-work-os:sync-status", { detail: result }));
}
