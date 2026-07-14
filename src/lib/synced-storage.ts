type SyncedStateOptions<T> = {
  localKey: string;
  remoteKey: string;
  fallback: T;
  normalize: (value: unknown) => T;
  onValue: (value: T) => void;
};

export async function loadSyncedState<T>({
  localKey,
  remoteKey,
  fallback,
  normalize,
  onValue,
}: SyncedStateOptions<T>) {
  if (typeof window === "undefined") {
    return;
  }

  const localValue = readLocalValue(localKey, normalize, fallback);
  onValue(localValue);

  try {
    const response = await fetch(`/api/workspace-state/${encodeURIComponent(remoteKey)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { value?: unknown };

    if (payload.value === null || typeof payload.value === "undefined") {
      await saveSyncedState(localKey, remoteKey, localValue);
      return;
    }

    const remoteValue = normalize(payload.value);
    window.localStorage.setItem(localKey, JSON.stringify(remoteValue));
    onValue(remoteValue);
  } catch {
    // Local cache remains the fallback when the network or auth session is not ready.
  }
}

export async function saveSyncedState<T>(
  localKey: string,
  remoteKey: string,
  value: T,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(localKey, JSON.stringify(value));

  try {
    await fetch(`/api/workspace-state/${encodeURIComponent(remoteKey)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ value }),
    });
  } catch {
    // Keep local-first behavior. The next logged-in load can push or pull again.
  }
}

function readLocalValue<T>(
  localKey: string,
  normalize: (value: unknown) => T,
  fallback: T,
) {
  const saved = window.localStorage.getItem(localKey);

  if (!saved) {
    return fallback;
  }

  try {
    return normalize(JSON.parse(saved));
  } catch {
    window.localStorage.removeItem(localKey);
    return fallback;
  }
}
