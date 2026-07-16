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

export async function loadSyncedState<T>({
  localKey,
  remoteKey,
  fallback,
  normalize,
  onValue,
  onStatus,
}: SyncedStateOptions<T>) {
  if (typeof window === "undefined") {
    return;
  }

  const local = readLocalValue(localKey, normalize, fallback);
  const localValue = local.value;
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
      setSyncStatus(onStatus, await createHttpResult(response));
      return;
    }

    const payload = (await response.json()) as { value?: unknown };

    if (payload.value === null || typeof payload.value === "undefined") {
      if (local.exists && !isEmptySyncedValue(localValue)) {
        const result = await saveSyncedState(localKey, remoteKey, localValue);
        setSyncStatus(onStatus, result);
        return;
      }

      setSyncStatus(onStatus, {
        status: "local",
        message: "この端末に保存しています。同期するにはログイン後に編集してください。",
      });
      return;
    }

    const remoteValue = normalize(payload.value);
    window.localStorage.setItem(localKey, JSON.stringify(remoteValue));
    onValue(remoteValue);
    setSyncStatus(onStatus, {
      status: "synced",
      message: "クラウド同期済みです。",
    });
  } catch (error) {
    setSyncStatus(onStatus, {
      status: "local",
      message:
        error instanceof Error
          ? `この端末に保存しています。クラウド確認に失敗しました: ${error.message}`
          : "この端末に保存しています。クラウド確認に失敗しました。",
    });
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

  window.localStorage.setItem(localKey, JSON.stringify(value));

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
    window.localStorage.removeItem(localKey);
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

function isEmptySyncedValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return value === null || typeof value === "undefined" || value === "";
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
