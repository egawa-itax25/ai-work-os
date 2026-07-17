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

  const local = readLocalValue(localKey, normalize, fallback);
  const localValue = local.value;
  const localMeta = readLocalMeta(localKey);
  onValue(localValue);
  setSyncStatus(onStatus, {
    status: "loading",
    message: "クラウド同期を確認しています。",
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
          message:
            result.status === "synced"
              ? "この端末のデータをクラウドへ初回同期しました。"
              : result.message,
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
        message: "クラウドに保存済みデータはまだありません。",
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
        message:
          result.status === "synced"
            ? "この端末だけにあったデータをクラウドへ統合しました。"
            : result.message,
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
        message:
          result.status === "synced"
            ? "この端末の新しいデータをクラウドへ反映しました。"
            : result.message,
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
      message: "クラウド同期済みです。",
      source: "remote",
      hadLocal: local.exists,
      hadRemote: true,
    };
    setSyncStatus(onStatus, loadResult);
    return loadResult;
  } catch (error) {
    const loadResult: SyncLoadResult = {
      status: "local",
      message:
        error instanceof Error
          ? `この端末に保存しています。クラウド確認に失敗しました: ${error.message}`
          : "この端末に保存しています。クラウド確認に失敗しました。",
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
      message: "ブラウザ外では保存しません。",
    };
  }

  const updatedAt = new Date().toISOString();
  window.localStorage.setItem(localKey, JSON.stringify(value));
  writeLocalMeta(localKey, updatedAt);

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
      message: "クラウド同期済みです。",
    };
    emitSyncStatus(result);
    return result;
  } catch (error) {
    const result: SyncResult = {
      status: "local",
      message:
        error instanceof Error
          ? `この端末に保存しています。クラウド保存に失敗しました: ${error.message}`
          : "この端末に保存しています。クラウド保存に失敗しました。",
    };
    emitSyncStatus(result);
    return result;
  }
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
  const message = payload?.error || response.statusText || "クラウド同期に失敗しました。";

  if (response.status === 401) {
    return {
      status: "signed-out",
      httpStatus: response.status,
      message: "ログインするとPCとスマホで同期できます。",
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

  window.dispatchEvent(new CustomEvent("ai-work-os:sync-status", { detail: result }));
}
