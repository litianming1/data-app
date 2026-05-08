import {
  buildChildPath,
  getParentPath,
  getPathName,
  sortLocalDiskEntries,
} from "@/lib/local-disk-utils";

export type LocalDiskEntry = {
  depth?: number;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
  modifiedAt?: number;
  name: string;
  path: string;
  scanError?: string;
  size?: number;
};

export type LocalDiskScanProgress = {
  directories: number;
  entries: number;
  files: number;
  lastPath: string;
  truncated: boolean;
};

export type LocalDiskScanOptions = {
  maxDepth?: number;
  maxEntries?: number;
  onProgress?: (progress: LocalDiskScanProgress) => void;
  signal?: AbortSignal;
};

const DEFAULT_SCAN_MAX_DEPTH = 5;
const DEFAULT_SCAN_MAX_ENTRIES = 5000;

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function selectLocalDirectory(options?: { recursive?: boolean }) {
  if (!isTauriRuntime()) {
    return null;
  }

  const { open } = await import("@tauri-apps/plugin-dialog");

  return open({
    canCreateDirectories: true,
    directory: true,
    multiple: false,
    recursive: options?.recursive ?? false,
    title: "选择本地目录",
  });
}

export async function readLocalDirectory(path: string): Promise<LocalDiskEntry[]> {
  const { readDir, stat } = await import("@tauri-apps/plugin-fs");
  const entries = await readDir(path);

  const localEntries = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = buildChildPath(path, entry.name);

      try {
        const info = await stat(entryPath);

        return {
          isDirectory: entry.isDirectory,
          isFile: entry.isFile,
          isSymlink: entry.isSymlink,
          modifiedAt: info.mtime?.getTime(),
          name: entry.name,
          path: entryPath,
          size: info.size,
        };
      } catch {
        return {
          isDirectory: entry.isDirectory,
          isFile: entry.isFile,
          isSymlink: entry.isSymlink,
          name: entry.name,
          path: entryPath,
        };
      }
    })
  );

  return sortLocalDiskEntries(localEntries);
}

export async function scanLocalDirectory(
  rootPath: string,
  options: LocalDiskScanOptions = {}
) {
  const maxDepth = options.maxDepth ?? DEFAULT_SCAN_MAX_DEPTH;
  const maxEntries = options.maxEntries ?? DEFAULT_SCAN_MAX_ENTRIES;
  const scannedEntries: LocalDiskEntry[] = [];
  const progress: LocalDiskScanProgress = {
    directories: 0,
    entries: 0,
    files: 0,
    lastPath: rootPath,
    truncated: false,
  };

  async function visitDirectory(path: string, depth: number) {
    options.signal?.throwIfAborted();

    if (depth > maxDepth || scannedEntries.length >= maxEntries) {
      progress.truncated = true;
      return;
    }

    let entries: LocalDiskEntry[];

    try {
      entries = await readLocalDirectory(path);
    } catch (error) {
      scannedEntries.push({
        depth,
        isDirectory: true,
        isFile: false,
        isSymlink: false,
        name: getPathName(path) || path,
        path,
        scanError:
          error instanceof Error ? error.message : "读取目录失败，可能没有权限。",
      });
      return;
    }

    progress.directories += 1;

    for (const entry of entries) {
      options.signal?.throwIfAborted();

      if (scannedEntries.length >= maxEntries) {
        progress.truncated = true;
        return;
      }

      const entryWithDepth = { ...entry, depth };
      scannedEntries.push(entryWithDepth);
      progress.entries += 1;
      progress.lastPath = entry.path;

      if (entry.isFile) {
        progress.files += 1;
      }

      options.onProgress?.({ ...progress });

      if (entry.isDirectory && !entry.isSymlink) {
        await visitDirectory(entry.path, depth + 1);
      }
    }
  }

  await visitDirectory(rootPath, 0);

  return {
    entries: scannedEntries,
    progress,
  };
}

export async function deleteLocalEntry(path: string, options?: { recursive?: boolean }) {
  const { remove } = await import("@tauri-apps/plugin-fs");

  await remove(path, { recursive: options?.recursive ?? false });
}

export async function renameLocalEntry(path: string, newName: string) {
  const { rename } = await import("@tauri-apps/plugin-fs");
  const newPath = buildChildPath(getParentPath(path), newName);

  await rename(path, newPath);

  return newPath;
}

export async function moveLocalEntry(path: string, targetDirectoryPath: string) {
  const { rename } = await import("@tauri-apps/plugin-fs");
  const newPath = buildChildPath(targetDirectoryPath, getPathName(path));

  await rename(path, newPath);

  return newPath;
}

export async function writeLocalTextFile(path: string, content: string) {
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  await writeTextFile(path, content);
}

export { buildChildPath as joinLocalPath };
