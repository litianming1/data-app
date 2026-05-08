import {
  buildChildPath,
  getPathName,
  isSafeEntryName,
  sortLocalDiskEntries,
} from "@/lib/local-disk-utils";
import type {
  LocalDiskEntry,
  LocalDiskScanOptions,
  LocalDiskScanProgress,
} from "@/lib/tauri-local-disk";

type BrowserFileSystemHandleKind = "directory" | "file";

type BrowserFileSystemHandle = {
  kind: BrowserFileSystemHandleKind;
  name: string;
};

type BrowserFileSystemFileHandle = BrowserFileSystemHandle & {
  createWritable: () => Promise<{
    close: () => Promise<void>;
    write: (content: string) => Promise<void>;
  }>;
  getFile: () => Promise<File>;
  kind: "file";
};

type BrowserFileSystemDirectoryHandle = BrowserFileSystemHandle & {
  entries: () => AsyncIterableIterator<[
    string,
    BrowserFileSystemDirectoryHandle | BrowserFileSystemFileHandle,
  ]>;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<BrowserFileSystemDirectoryHandle>;
  getFileHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<BrowserFileSystemFileHandle>;
  kind: "directory";
  removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }) => Promise<BrowserFileSystemDirectoryHandle>;
  }
}

export type BrowserLocalDiskRoot = {
  handle: BrowserFileSystemDirectoryHandle;
  name: string;
  path: string;
};

const DEFAULT_SCAN_MAX_DEPTH = 5;
const DEFAULT_SCAN_MAX_ENTRIES = 5000;

export function isBrowserFileSystemSupported() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function selectBrowserDirectory() {
  if (!isBrowserFileSystemSupported() || !window.showDirectoryPicker) {
    return null;
  }

  const handle = await window.showDirectoryPicker({
    id: "ai-app-local-disk",
    mode: "readwrite",
  });

  return {
    handle,
    name: handle.name,
    path: handle.name,
  } satisfies BrowserLocalDiskRoot;
}

export async function readBrowserDirectory(
  root: BrowserLocalDiskRoot,
  path = root.path
): Promise<LocalDiskEntry[]> {
  const directoryHandle = await getDirectoryHandleByPath(root, path);
  const entries: LocalDiskEntry[] = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    const entryPath = buildChildPath(path, name);

    if (handle.kind === "file") {
      const file = await handle.getFile();

      entries.push({
        isDirectory: false,
        isFile: true,
        isSymlink: false,
        modifiedAt: file.lastModified,
        name,
        path: entryPath,
        size: file.size,
      });
      continue;
    }

    entries.push({
      isDirectory: true,
      isFile: false,
      isSymlink: false,
      name,
      path: entryPath,
    });
  }

  return sortLocalDiskEntries(entries);
}

export async function scanBrowserDirectory(
  root: BrowserLocalDiskRoot,
  options: LocalDiskScanOptions = {}
) {
  const maxDepth = options.maxDepth ?? DEFAULT_SCAN_MAX_DEPTH;
  const maxEntries = options.maxEntries ?? DEFAULT_SCAN_MAX_ENTRIES;
  const scannedEntries: LocalDiskEntry[] = [];
  const progress: LocalDiskScanProgress = {
    directories: 0,
    entries: 0,
    files: 0,
    lastPath: root.path,
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
      entries = await readBrowserDirectory(root, path);
    } catch (error) {
      scannedEntries.push({
        depth,
        isDirectory: true,
        isFile: false,
        isSymlink: false,
        name: getPathName(path) || path,
        path,
        scanError:
          error instanceof Error ? error.message : "浏览器无法读取该目录。",
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

      scannedEntries.push({ ...entry, depth });
      progress.entries += 1;
      progress.lastPath = entry.path;

      if (entry.isFile) {
        progress.files += 1;
      }

      options.onProgress?.({ ...progress });

      if (entry.isDirectory) {
        await visitDirectory(entry.path, depth + 1);
      }
    }
  }

  await visitDirectory(root.path, 0);

  return {
    entries: scannedEntries,
    progress,
  };
}

export async function deleteBrowserEntry(
  root: BrowserLocalDiskRoot,
  path: string,
  options?: { recursive?: boolean }
) {
  const parentHandle = await getDirectoryHandleByPath(root, getBrowserParentPath(root, path));

  await parentHandle.removeEntry(getPathName(path), {
    recursive: options?.recursive ?? false,
  });
}

export async function renameBrowserFileEntry(
  root: BrowserLocalDiskRoot,
  path: string,
  newName: string
) {
  if (!isSafeEntryName(newName)) {
    throw new Error("文件名无效，请不要包含路径分隔符或上级目录引用。");
  }

  const parentPath = getBrowserParentPath(root, path);
  const parentHandle = await getDirectoryHandleByPath(root, parentPath);
  const oldFileHandle = await parentHandle.getFileHandle(getPathName(path));
  const oldFile = await oldFileHandle.getFile();
  const newFileHandle = await parentHandle.getFileHandle(newName, { create: true });
  const writable = await newFileHandle.createWritable();

  await writable.write(await oldFile.text());
  await writable.close();
  await parentHandle.removeEntry(getPathName(path));

  return buildChildPath(parentPath, newName);
}

export async function moveBrowserFileEntry(
  root: BrowserLocalDiskRoot,
  path: string,
  targetDirectoryPath: string
) {
  const sourceParentHandle = await getDirectoryHandleByPath(
    root,
    getBrowserParentPath(root, path)
  );
  const targetDirectoryHandle = await getDirectoryHandleByPath(root, targetDirectoryPath);
  const fileName = getPathName(path);
  const oldFileHandle = await sourceParentHandle.getFileHandle(fileName);
  const oldFile = await oldFileHandle.getFile();
  const newFileHandle = await targetDirectoryHandle.getFileHandle(fileName, { create: true });
  const writable = await newFileHandle.createWritable();

  await writable.write(await oldFile.text());
  await writable.close();
  await sourceParentHandle.removeEntry(fileName);

  return buildChildPath(targetDirectoryPath, fileName);
}

export async function writeBrowserTextFile(
  root: BrowserLocalDiskRoot,
  directoryPath: string,
  fileName: string,
  content: string
) {
  if (!isSafeEntryName(fileName)) {
    throw new Error("文件名无效，请不要包含路径分隔符或上级目录引用。");
  }

  const directoryHandle = await getDirectoryHandleByPath(root, directoryPath);
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  await writable.write(content);
  await writable.close();

  return buildChildPath(directoryPath, fileName);
}

async function getDirectoryHandleByPath(root: BrowserLocalDiskRoot, path: string) {
  const segments = getRelativeSegments(root, path);
  let currentHandle = root.handle;

  for (const segment of segments) {
    currentHandle = await currentHandle.getDirectoryHandle(segment);
  }

  return currentHandle;
}

function getBrowserParentPath(root: BrowserLocalDiskRoot, path: string) {
  const segments = getRelativeSegments(root, path);

  if (segments.length === 0) {
    return root.path;
  }

  return [root.path, ...segments.slice(0, -1)].join("/");
}

function getRelativeSegments(root: BrowserLocalDiskRoot, path: string) {
  const normalizedPath = path.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  const normalizedRoot = root.path.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");

  if (!normalizedPath || normalizedPath === normalizedRoot) {
    return [];
  }

  return normalizedPath
    .replace(new RegExp(`^${escapeRegExp(normalizedRoot)}\\/?`), "")
    .split("/")
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
