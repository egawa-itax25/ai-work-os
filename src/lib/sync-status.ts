export type GlobalSyncPhase =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "local"
  | "signed-out"
  | "error";

export type GlobalSyncMode = "local" | "cloud" | "unknown";

export type GlobalSyncSnapshot = {
  phase: GlobalSyncPhase;
  mode: GlobalSyncMode;
  message: string;
  lastSyncedAt: string | null;
  lastUpdatedAt: string;
  pendingLocalChanges: boolean;
  httpStatus?: number;
};

export type SyncResource = {
  localKey: string;
  remoteKey: string;
};

export type GlobalSyncPatch = Partial<GlobalSyncSnapshot>;

const defaultSnapshot: GlobalSyncSnapshot = {
  phase: "idle",
  mode: "unknown",
  message: "\u540c\u671f\u72b6\u614b\u3092\u78ba\u8a8d\u4e2d\u3067\u3059\u3002",
  lastSyncedAt: null,
  lastUpdatedAt: new Date(0).toISOString(),
  pendingLocalChanges: false,
};

const subscribers = new Set<(snapshot: GlobalSyncSnapshot) => void>();
const resources = new Map<string, SyncResource>();
let currentSnapshot = defaultSnapshot;

export function getSyncSnapshot() {
  return currentSnapshot;
}

export function subscribeSyncStatus(callback: (snapshot: GlobalSyncSnapshot) => void) {
  subscribers.add(callback);
  callback(currentSnapshot);

  return () => {
    subscribers.delete(callback);
  };
}

export function publishSyncStatus(patch: GlobalSyncPatch) {
  currentSnapshot = {
    ...currentSnapshot,
    ...patch,
    lastUpdatedAt: new Date().toISOString(),
  };

  subscribers.forEach((callback) => callback(currentSnapshot));
}

export function registerSyncResource(resource: SyncResource) {
  resources.set(resource.remoteKey, resource);
}

export function getRegisteredSyncResources() {
  return [...resources.values()];
}
