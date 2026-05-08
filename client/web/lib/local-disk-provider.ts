import {
  deleteBrowserEntry,
  isBrowserFileSystemSupported,
  moveBrowserFileEntry,
  readBrowserDirectory,
  renameBrowserFileEntry,
  scanBrowserDirectory,
  selectBrowserDirectory,
  type BrowserLocalDiskRoot,
  writeBrowserTextFile,
} from "@/lib/browser-local-disk";
import {
  buildChildPath,
  getPathName,
  isSafeEntryName,
} from "@/lib/local-disk-utils";
import {
  deleteLocalEntry,
  isTauriRuntime,
  moveLocalEntry,
  readLocalDirectory,
  renameLocalEntry,
  scanLocalDirectory,
  selectLocalDirectory,
  writeLocalTextFile,
  type LocalDiskEntry,
  type LocalDiskScanOptions,
} from "@/lib/tauri-local-disk";

export type LocalDiskRuntime = "browser" | "tauri" | "unsupported";

export type LocalDiskRoot =
  | {
      browserRoot: BrowserLocalDiskRoot;
      name: string;
      path: string;
      runtime: "browser";
    }
  | {
      name: string;
      path: string;
      runtime: "tauri";
    };

export type LocalDiskProvider = {
  deleteEntry: (root: LocalDiskRoot, entry: LocalDiskEntry) => Promise<void>;
  moveEntry: (
    root: LocalDiskRoot,
    entry: LocalDiskEntry,
    targetDirectoryPath: string
  ) => Promise<string>;
  readDirectory: (root: LocalDiskRoot, path?: string) => Promise<LocalDiskEntry[]>;
  renameEntry: (root: LocalDiskRoot, entry: LocalDiskEntry, newName: string) => Promise<string>;
  runtime: LocalDiskRuntime;
  scanDirectory: (
    root: LocalDiskRoot,
    options?: LocalDiskScanOptions
  ) => Promise<{
    entries: LocalDiskEntry[];
    progress: {
      directories: number;
      entries: number;
      files: number;
      lastPath: string;
      truncated: boolean;
    };
  }>;
  selectDirectory: (options?: { recursive?: boolean }) => Promise<LocalDiskRoot | null>;
  supported: boolean;
  supportMessage: string;
  writeTextFile: (
    root: LocalDiskRoot,
    directoryPath: string,
    fileName: string,
    content: string
  ) => Promise<string>;
};

export function getLocalDiskProvider(): LocalDiskProvider {
  if (isTauriRuntime()) {
    return tauriProvider;
  }

  if (isBrowserFileSystemSupported()) {
    return browserProvider;
  }

  return unsupportedProvider;
}

const tauriProvider: LocalDiskProvider = {
  async deleteEntry(_root, entry) {
    await deleteLocalEntry(entry.path, { recursive: entry.isDirectory });
  },
  async moveEntry(_root, entry, targetDirectoryPath) {
    return moveLocalEntry(entry.path, targetDirectoryPath);
  },
  readDirectory(root, path = root.path) {
    return readLocalDirectory(path);
  },
  async renameEntry(_root, entry, newName) {
    assertSafeEntryName(newName);

    return renameLocalEntry(entry.path, newName);
  },
  runtime: "tauri",
  scanDirectory(root, options) {
    return scanLocalDirectory(root.path, options);
  },
  async selectDirectory(options) {
    const path = await selectLocalDirectory({ recursive: options?.recursive ?? true });

    if (!path) {
      return null;
    }

    return {
      name: getPathName(path) || path,
      path,
      runtime: "tauri",
    };
  },
  supported: true,
  supportMessage: "Tauri 桌面端：可管理用户选择目录内的本地文件。",
  async writeTextFile(_root, directoryPath, fileName, content) {
    assertSafeEntryName(fileName);

    const path = buildChildPath(directoryPath, fileName);

    await writeLocalTextFile(path, content);

    return path;
  },
};

const browserProvider: LocalDiskProvider = {
  async deleteEntry(root, entry) {
    if (root.runtime !== "browser") {
      throw new Error("当前目录不是浏览器授权目录。");
    }

    await deleteBrowserEntry(root.browserRoot, entry.path, {
      recursive: entry.isDirectory,
    });
  },
  async moveEntry(root, entry, targetDirectoryPath) {
    if (root.runtime !== "browser") {
      throw new Error("当前目录不是浏览器授权目录。");
    }

    if (entry.isDirectory) {
      throw new Error("浏览器版暂不支持移动目录，请在 Tauri 桌面端操作。");
    }

    return moveBrowserFileEntry(root.browserRoot, entry.path, targetDirectoryPath);
  },
  readDirectory(root, path = root.path) {
    if (root.runtime !== "browser") {
      throw new Error("当前目录不是浏览器授权目录。");
    }

    return readBrowserDirectory(root.browserRoot, path);
  },
  async renameEntry(root, entry, newName) {
    if (root.runtime !== "browser") {
      throw new Error("当前目录不是浏览器授权目录。");
    }

    if (entry.isDirectory) {
      throw new Error("浏览器版暂不支持重命名目录，请在 Tauri 桌面端操作。");
    }

    return renameBrowserFileEntry(root.browserRoot, entry.path, newName);
  },
  runtime: "browser",
  scanDirectory(root, options) {
    if (root.runtime !== "browser") {
      throw new Error("当前目录不是浏览器授权目录。");
    }

    return scanBrowserDirectory(root.browserRoot, options);
  },
  async selectDirectory() {
    const browserRoot = await selectBrowserDirectory();

    if (!browserRoot) {
      return null;
    }

    return {
      browserRoot,
      name: browserRoot.name,
      path: browserRoot.path,
      runtime: "browser",
    };
  },
  supported: true,
  supportMessage: "浏览器版：使用 File System Access API，仅能管理你授权的目录。",
  async writeTextFile(root, directoryPath, fileName, content) {
    if (root.runtime !== "browser") {
      throw new Error("当前目录不是浏览器授权目录。");
    }

    return writeBrowserTextFile(root.browserRoot, directoryPath, fileName, content);
  },
};

const unsupportedProvider: LocalDiskProvider = {
  async deleteEntry() {
    throwUnsupportedError();
  },
  async moveEntry() {
    throwUnsupportedError();
  },
  async readDirectory() {
    throwUnsupportedError();
  },
  async renameEntry() {
    throwUnsupportedError();
  },
  runtime: "unsupported",
  async scanDirectory() {
    throwUnsupportedError();
  },
  async selectDirectory() {
    throwUnsupportedError();
  },
  supported: false,
  supportMessage:
    "当前环境不支持本地文件系统管理。请使用 Tauri 桌面端，或在 Chrome/Edge 中授权目录。",
  async writeTextFile() {
    throwUnsupportedError();
  },
};

function assertSafeEntryName(name: string) {
  if (!isSafeEntryName(name)) {
    throw new Error("名称无效，请不要包含路径分隔符或上级目录引用。");
  }
}

function throwUnsupportedError(): never {
  throw new Error(unsupportedProvider.supportMessage);
}
