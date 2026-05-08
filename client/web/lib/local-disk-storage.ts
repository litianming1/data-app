export const LOCAL_DISK_ROOT_STORAGE_KEY = "ai-app.local-disk.last-root.v1";

export type PersistedLocalDiskRoot = {
  name: string;
  path: string;
  runtime: "browser" | "tauri";
};

type StorageLike = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

export function toPersistedLocalDiskRoot(root: PersistedLocalDiskRoot) {
  return {
    name: root.name,
    path: root.path,
    runtime: root.runtime,
  } satisfies PersistedLocalDiskRoot;
}

export function persistLocalDiskRoot(storage: StorageLike, root: PersistedLocalDiskRoot) {
  storage.setItem(
    LOCAL_DISK_ROOT_STORAGE_KEY,
    JSON.stringify(toPersistedLocalDiskRoot(root))
  );
}

export function readPersistedLocalDiskRoot(storage: StorageLike) {
  const rawValue = storage.getItem(LOCAL_DISK_ROOT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(rawValue);

    if (!isPersistedLocalDiskRoot(value)) {
      clearPersistedLocalDiskRoot(storage);
      return null;
    }

    return value;
  } catch {
    clearPersistedLocalDiskRoot(storage);
    return null;
  }
}

export function clearPersistedLocalDiskRoot(storage: StorageLike) {
  storage.removeItem(LOCAL_DISK_ROOT_STORAGE_KEY);
}

function isPersistedLocalDiskRoot(value: unknown): value is PersistedLocalDiskRoot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const root = value as Record<string, unknown>;

  return (
    (root.runtime === "browser" || root.runtime === "tauri") &&
    typeof root.name === "string" &&
    root.name.trim().length > 0 &&
    typeof root.path === "string" &&
    root.path.trim().length > 0
  );
}
