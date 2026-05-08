"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceChrome } from "@/components/layout/workspace-shell";
import {
  getLocalDiskProvider,
  type LocalDiskRoot,
} from "@/lib/local-disk-provider";
import {
  getParentPath,
  isSafeEntryName,
  isWritableTextFileName,
} from "@/lib/local-disk-utils";
import {
  clearPersistedLocalDiskRoot,
  persistLocalDiskRoot,
  readPersistedLocalDiskRoot,
} from "@/lib/local-disk-storage";
import type {
  LocalDiskEntry,
  LocalDiskScanProgress,
} from "@/lib/tauri-local-disk";
import {
  AlertCircleIcon,
  ArchiveIcon,
  CircleIcon,
  DownloadIcon,
  FileIcon,
  FolderOpenIcon,
  HardDriveIcon,
  ImageIcon,
  LoaderCircleIcon,
  MoveRightIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ScanSearchIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const localDiskSections = ["下载内容", "本地文件", "图片素材", "压缩包", "待清理"];

const localFiles: Array<{
  icon: typeof FileIcon;
  label: string;
  meta: string;
}> = [];

type LocalDiskAction =
  | { entry: LocalDiskEntry; type: "delete" | "move" | "rename" | "write" }
  | { type: "write" }
  | null;

function getLocalEntryIcon(entry: LocalDiskEntry) {
  if (entry.isDirectory) {
    return FolderOpenIcon;
  }

  const extension = entry.name.split(".").pop()?.toLowerCase() ?? "";

  if (["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) {
    return ImageIcon;
  }

  if (["7z", "gz", "rar", "tar", "zip"].includes(extension)) {
    return ArchiveIcon;
  }

  return FileIcon;
}

function getLocalEntryMeta(entry: LocalDiskEntry) {
  const details = [entry.isDirectory ? "文件夹" : "本地文件"];

  if (entry.isSymlink) {
    details.push("符号链接");
  }

  if (typeof entry.size === "number" && entry.isFile) {
    details.push(formatFileSize(entry.size));
  }

  if (entry.modifiedAt) {
    details.push(new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(entry.modifiedAt));
  }

  return details.join(" · ");
}

function getLocalEntryKey(entry: LocalDiskEntry) {
  return [
    entry.path || entry.name,
    entry.name,
    entry.depth ?? "root",
    entry.isDirectory ? "directory" : "file",
    entry.isSymlink ? "symlink" : "entry",
  ].join("::");
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function getInitialProgress(rootPath = ""): LocalDiskScanProgress {
  return {
    directories: 0,
    entries: 0,
    files: 0,
    lastPath: rootPath,
    truncated: false,
  };
}

function getInitialLocalDiskNotice() {
  if (typeof window === "undefined") {
    return null;
  }

  const currentProvider = getLocalDiskProvider();
  const persistedRoot = readPersistedLocalDiskRoot(window.localStorage);

  if (currentProvider.runtime !== "browser" || persistedRoot?.runtime !== "browser") {
    return null;
  }

  return `已记住上次浏览器目录：${persistedRoot.path}。浏览器需要重新授权，请点击“选择目录”继续。`;
}

export function LocalDiskManager() {
  const [action, setAction] = useState<LocalDiskAction>(null);
  const [confirmName, setConfirmName] = useState("");
  const [directoryEntries, setDirectoryEntries] = useState<LocalDiskEntry[]>([]);
  const [entryQuery, setEntryQuery] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("notes.txt");
  const [isOperating, setIsOperating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSelectingDirectory, setIsSelectingDirectory] = useState(false);
  const [isRestoringDirectory, setIsRestoringDirectory] = useState(false);
  const [localDiskError, setLocalDiskError] = useState<string | null>(null);
  const [localDiskNotice, setLocalDiskNotice] = useState<string | null>(
    getInitialLocalDiskNotice
  );
  const [renameValue, setRenameValue] = useState("");
  const [scanProgress, setScanProgress] = useState<LocalDiskScanProgress>(() =>
    getInitialProgress()
  );
  const [selectedRoot, setSelectedRoot] = useState<LocalDiskRoot | null>(null);
  const [targetDirectoryPath, setTargetDirectoryPath] = useState("");
  const scanAbortControllerRef = useRef<AbortController | null>(null);

  const sidebarContent = useMemo(
    () => (
      <>
        <p className="mb-2 px-1 font-medium text-[11px] text-muted-foreground">
          本地分类
        </p>
        <div className="space-y-1 pb-3">
          {localDiskSections.map((item) => (
            <button
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              key={item}
              type="button"
            >
              <CircleIcon className="size-3.5 text-muted-foreground/60" />
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      </>
    ),
    []
  );

  const chrome = useMemo(
    () => ({
      description: "管理下载到本地的内容、文件与缓存",
      sidebarContent,
      title: "本地磁盘",
    }),
    [sidebarContent]
  );

  useWorkspaceChrome(chrome);

  const hasSelectedDirectory = selectedRoot !== null;
  const selectedPath = selectedRoot?.path ?? "";
  const currentProvider = getLocalDiskProvider();
  const deleteEntry = action?.type === "delete" ? action.entry : null;
  const canConfirmDelete = deleteEntry?.isDirectory ? confirmName === deleteEntry.name : true;
  const canSubmitWrite = action?.type !== "write" || isWritableTextFileName(fileName);
  const visibleDirectoryEntries = useMemo(() => {
    const query = entryQuery.trim().toLowerCase();

    if (!query) {
      return directoryEntries;
    }

    return directoryEntries.filter((entry) =>
      `${entry.name} ${entry.path}`.toLowerCase().includes(query)
    );
  }, [directoryEntries, entryQuery]);

  useEffect(() => {
    const persistedRoot = readPersistedLocalDiskRoot(window.localStorage);

    if (!persistedRoot || !currentProvider.supported) {
      return;
    }

    if (persistedRoot.runtime === "browser") {
      return;
    }

    if (currentProvider.runtime !== "tauri") {
      return;
    }

    let isCancelled = false;
    const root = {
      name: persistedRoot.name,
      path: persistedRoot.path,
      runtime: "tauri" as const,
    };

    async function restorePersistedDirectory() {
      setIsRestoringDirectory(true);
      setLocalDiskError(null);

      try {
        const entries = await currentProvider.readDirectory(root);

        if (isCancelled) {
          return;
        }

        setDirectoryEntries(entries);
        setScanProgress(getInitialProgress(root.path));
        setSelectedRoot(root);
        setTargetDirectoryPath(root.path);
        setLocalDiskNotice(`已自动恢复上次目录：${root.path}`);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        clearPersistedLocalDiskRoot(window.localStorage);
        setLocalDiskError(
          error instanceof Error
            ? `已记住上次目录，但自动读取失败：${error.message}`
            : "已记住上次目录，但自动读取失败，请重新选择目录。"
        );
        setLocalDiskNotice("已清除失效的目录记忆，请重新选择目录。");
      } finally {
        if (!isCancelled) {
          setIsRestoringDirectory(false);
        }
      }
    }

    void restorePersistedDirectory();

    return () => {
      isCancelled = true;
    };
  }, [currentProvider]);

  const refreshDirectory = useCallback(
    async (root = selectedRoot) => {
      if (!root) {
        return;
      }

      setLocalDiskError(null);

      try {
        const entries = await currentProvider.readDirectory(root);

        setDirectoryEntries(entries);
        setScanProgress(getInitialProgress(root.path));
      } catch (error) {
        setLocalDiskError(
          error instanceof Error ? error.message : "读取本地目录失败，请检查权限后重试。"
        );
      }
    },
    [currentProvider, selectedRoot]
  );

  const handleSelectDirectory = useCallback(async () => {
    setLocalDiskError(null);
    setLocalDiskNotice(null);

    if (!currentProvider.supported) {
      setLocalDiskError(currentProvider.supportMessage);
      return;
    }

    setIsSelectingDirectory(true);

    try {
      const root = await currentProvider.selectDirectory({ recursive: true });

      if (!root) {
        return;
      }

      const entries = await currentProvider.readDirectory(root);
      let persistNotice = "已记住该目录，下次会自动恢复。";

      try {
        persistLocalDiskRoot(window.localStorage, root);
      } catch {
        persistNotice = "已选择目录，但浏览器阻止保存本地记忆。";
      }

      setDirectoryEntries(entries);
      setScanProgress(getInitialProgress(root.path));
      setSelectedRoot(root);
      setTargetDirectoryPath(root.path);
      setLocalDiskNotice(
        root.runtime === "browser"
          ? `${currentProvider.supportMessage} 已记住目录名称，下次会提示重新授权。`
          : `${currentProvider.supportMessage} ${persistNotice}`
      );
    } catch (error) {
      setLocalDiskError(
        error instanceof Error
          ? error.message
          : "读取本地目录失败，请检查目录权限后重试。"
      );
    } finally {
      setIsSelectingDirectory(false);
    }
  }, [currentProvider]);

  const handleScanDirectory = useCallback(async () => {
    if (!selectedRoot) {
      setLocalDiskError("请先选择一个目录再开始递归扫描。");
      return;
    }

    scanAbortControllerRef.current?.abort();
    scanAbortControllerRef.current = new AbortController();
    setIsScanning(true);
    setLocalDiskError(null);
    setLocalDiskNotice("正在递归扫描授权目录，默认限制 5 层 / 5000 项，可随时停止。");
    setScanProgress(getInitialProgress(selectedRoot.path));

    try {
      const result = await currentProvider.scanDirectory(selectedRoot, {
        maxDepth: 5,
        maxEntries: 5000,
        onProgress: setScanProgress,
        signal: scanAbortControllerRef.current.signal,
      });

      setDirectoryEntries(result.entries);
      setScanProgress(result.progress);
      setLocalDiskNotice(
        result.progress.truncated
          ? "扫描已达到安全限制，结果已截断。"
          : "递归扫描完成，结果显示在列表中。"
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setLocalDiskNotice("扫描已停止，已保留当前目录列表。\u200b");
        return;
      }

      setLocalDiskError(error instanceof Error ? error.message : "递归扫描失败。");
    } finally {
      setIsScanning(false);
      scanAbortControllerRef.current = null;
    }
  }, [currentProvider, selectedRoot]);

  const openAction = useCallback(
    (nextAction: LocalDiskAction) => {
      setAction(nextAction);
      setConfirmName("");
      setLocalDiskError(null);
      setLocalDiskNotice(null);

      if (nextAction?.type === "rename") {
        setRenameValue(nextAction.entry.name);
      }

      if (nextAction?.type === "move") {
        setTargetDirectoryPath(selectedRoot?.path ?? "");
      }

      if (nextAction?.type === "write") {
        if ("entry" in nextAction && nextAction.entry) {
          setFileName(nextAction.entry.name);
          setTargetDirectoryPath(getParentPath(nextAction.entry.path));
        } else {
          setFileName("notes.txt");
          setTargetDirectoryPath(selectedRoot?.path ?? "");
        }

        setFileContent("");
      }
    },
    [selectedRoot]
  );

  const closeAction = useCallback(() => {
    setAction(null);
    setConfirmName("");
    setFileContent("");
    setRenameValue("");
  }, []);

  const handleSubmitAction = useCallback(async () => {
    if (!action || !selectedRoot) {
      return;
    }

    setIsOperating(true);
    setLocalDiskError(null);
    setLocalDiskNotice(null);

    try {
      if (action.type === "delete" && "entry" in action) {
        await currentProvider.deleteEntry(selectedRoot, action.entry);
        setLocalDiskNotice(`已删除：${action.entry.name}`);
      }

      if (action.type === "rename" && "entry" in action) {
        if (!isSafeEntryName(renameValue)) {
          throw new Error("名称无效，请不要包含路径分隔符或上级目录引用。");
        }

        await currentProvider.renameEntry(selectedRoot, action.entry, renameValue.trim());
        setLocalDiskNotice(`已重命名为：${renameValue.trim()}`);
      }

      if (action.type === "move" && "entry" in action) {
        await currentProvider.moveEntry(selectedRoot, action.entry, targetDirectoryPath.trim());
        setLocalDiskNotice(`已移动：${action.entry.name}`);
      }

      if (action.type === "write") {
        if (!isSafeEntryName(fileName)) {
          throw new Error("文件名无效，请不要包含路径分隔符或上级目录引用。");
        }

        if (!isWritableTextFileName(fileName)) {
          throw new Error("暂不支持写入该文件类型，请选择 .txt、.md、.json、.csv、.log 等文本文件。");
        }

        await currentProvider.writeTextFile(
          selectedRoot,
          targetDirectoryPath.trim() || selectedRoot.path,
          fileName.trim(),
          fileContent
        );
        setLocalDiskNotice(`已写入文本文件：${fileName.trim()}`);
      }

      closeAction();
      await refreshDirectory(selectedRoot);
    } catch (error) {
      setLocalDiskError(error instanceof Error ? error.message : "文件操作失败。");
    } finally {
      setIsOperating(false);
    }
  }, [
    action,
    closeAction,
    currentProvider,
    fileContent,
    fileName,
    refreshDirectory,
    renameValue,
    selectedRoot,
    targetDirectoryPath,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-6">
      <div className="w-full" data-local-disk-width="full">
        <section className="rounded-[2rem] border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
          <div className="mb-5 rounded-3xl border bg-muted/30 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <HardDriveIcon className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-muted-foreground text-xs">操作台</p>
                  <h2 className="font-semibold text-2xl tracking-tight">
                    本地文件管理
                  </h2>
                  <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
                    选择目录后即可扫描、查找、写入和管理文件，常用操作集中在这里。
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  className="h-10 shrink-0 rounded-xl px-4"
                  disabled={isSelectingDirectory || isRestoringDirectory}
                  onClick={() => void handleSelectDirectory()}
                  title="选择真实本地目录"
                  type="button"
                >
                  {isSelectingDirectory || isRestoringDirectory ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <FolderOpenIcon className="size-4" />
                  )}
                  {isRestoringDirectory
                    ? "恢复目录中"
                    : isSelectingDirectory
                      ? "读取目录中"
                      : "选择目录"}
                </Button>
                <Button
                  className="h-10 rounded-xl px-4"
                  disabled={!hasSelectedDirectory || isScanning}
                  onClick={() => void refreshDirectory()}
                  type="button"
                  variant="outline"
                >
                  <RefreshCwIcon className="size-4" />
                  刷新
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0 rounded-2xl border bg-background/80 px-4 py-3">
                <p className="font-medium text-muted-foreground text-xs">当前目录</p>
                <p className="mt-1 truncate font-medium text-sm" title={selectedPath || "尚未选择目录"}>
                  {selectedPath || "尚未选择目录"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  disabled={!hasSelectedDirectory || isScanning}
                  onClick={() => void handleScanDirectory()}
                  type="button"
                  variant="outline"
                >
                  {isScanning ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <ScanSearchIcon className="size-4" />
                  )}
                  递归扫描
                </Button>
                <Button
                  disabled={!isScanning}
                  onClick={() => scanAbortControllerRef.current?.abort()}
                  type="button"
                  variant="outline"
                >
                  <SquareIcon className="size-4" />
                  停止扫描
                </Button>
                <Button
                  disabled={!hasSelectedDirectory}
                  onClick={() => openAction({ type: "write" })}
                  type="button"
                  variant="outline"
                >
                  <PlusIcon className="size-4" />
                  写入文件
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { icon: DownloadIcon, label: "当前条目", value: `${directoryEntries.length} 项` },
                { icon: FileIcon, label: "已扫描文件", value: `${scanProgress.files} 个` },
                { icon: Trash2Icon, label: "扫描目录", value: `${scanProgress.directories} 个` },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm shadow-sm"
                    key={item.label}
                  >
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </span>
                );
              })}
              {scanProgress.truncated && (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1.5 text-amber-600 text-xs dark:text-amber-300">
                  结果已截断，缩小目录或分批扫描
                </span>
              )}
            </div>
          </div>

          {!currentProvider.supported && (
            <Alert className="mb-5">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>当前环境不支持完整文件系统管理</AlertTitle>
              <AlertDescription>{currentProvider.supportMessage}</AlertDescription>
            </Alert>
          )}

          {localDiskError && (
            <Alert className="mb-5" variant="destructive">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>文件操作失败</AlertTitle>
              <AlertDescription>{localDiskError}</AlertDescription>
            </Alert>
          )}

          {localDiskNotice && (
            <Alert className="mb-5">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>本地磁盘</AlertTitle>
              <AlertDescription>{localDiskNotice}</AlertDescription>
            </Alert>
          )}

          <div className="mt-5 rounded-[1.5rem] border bg-muted/30 p-4">
            <div className="mb-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
              <div>
                <h3 className="font-semibold text-sm">
                  {hasSelectedDirectory ? "目录内容" : "最近本地内容"}
                </h3>
                <p className="mt-1 text-muted-foreground text-xs">
                  {hasSelectedDirectory
                    ? `${visibleDirectoryEntries.length} / ${directoryEntries.length} 项 · 授权范围内`
                    : "选择目录后显示真实内容"}
                </p>
              </div>
              <div className="relative">
                <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  className="h-9 rounded-xl bg-background pl-9"
                  disabled={!hasSelectedDirectory || directoryEntries.length === 0}
                  onChange={(event) => setEntryQuery(event.target.value)}
                  placeholder="搜索文件或路径"
                  value={entryQuery}
                />
              </div>
            </div>
            <div className="grid gap-2">
              {hasSelectedDirectory && directoryEntries.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-card/70 px-4 py-8 text-center shadow-sm">
                  <FolderOpenIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <p className="font-medium text-sm">这个目录是空的</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    写入一个文本文件，或者选择其他目录继续管理。
                  </p>
                </div>
              )}

              {hasSelectedDirectory &&
                directoryEntries.length > 0 &&
                visibleDirectoryEntries.length === 0 && (
                  <div className="rounded-2xl border border-dashed bg-card/70 px-4 py-8 text-center shadow-sm">
                    <SearchIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <p className="font-medium text-sm">没有匹配的文件</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      换个关键词，或清空搜索后继续操作。
                    </p>
                  </div>
                )}

              {hasSelectedDirectory &&
                visibleDirectoryEntries.map((entry) => {
                  const Icon = getLocalEntryIcon(entry);

                  return (
                    <div
                      className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm md:flex-row md:items-center"
                      key={getLocalEntryKey(entry)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-sm" title={entry.name}>
                            {entry.depth !== undefined && entry.depth > 0
                              ? `${"—".repeat(Math.min(entry.depth, 6))} ${entry.name}`
                              : entry.name}
                          </p>
                          <p className="truncate text-muted-foreground text-xs" title={entry.path}>
                            {entry.scanError
                              ? `扫描错误 · ${entry.scanError}`
                              : `${getLocalEntryMeta(entry)} · ${entry.path}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 md:justify-end">
                        <Button
                          disabled={Boolean(entry.scanError)}
                          onClick={() => openAction({ entry, type: "rename" })}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <PencilIcon className="size-3.5" />
                          重命名
                        </Button>
                        <Button
                          disabled={Boolean(entry.scanError)}
                          onClick={() => openAction({ entry, type: "move" })}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <MoveRightIcon className="size-3.5" />
                          移动
                        </Button>
                        <Button
                          disabled={
                            entry.isDirectory ||
                            Boolean(entry.scanError) ||
                            !isWritableTextFileName(entry.name)
                          }
                          onClick={() => openAction({ entry, type: "write" })}
                          size="sm"
                          title={
                            isWritableTextFileName(entry.name)
                              ? "写入文本内容"
                              : "该文件类型暂不支持文本写入"
                          }
                          type="button"
                          variant="ghost"
                        >
                          <FileIcon className="size-3.5" />
                          写入
                        </Button>
                        <Button
                          disabled={Boolean(entry.scanError)}
                          onClick={() => openAction({ entry, type: "delete" })}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2Icon className="size-3.5" />
                          删除
                        </Button>
                      </div>
                    </div>
                  );
                })}

              {!hasSelectedDirectory &&
                localFiles.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
                      key={item.label}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{item.label}</p>
                        <p className="truncate text-muted-foreground text-xs">{item.meta}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={action !== null} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getDialogTitle(action)}</DialogTitle>
            <DialogDescription>{getDialogDescription(action, selectedRoot)}</DialogDescription>
          </DialogHeader>

          {action?.type === "delete" && "entry" in action && (
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{action.entry.name}</p>
                <p className="mt-1 break-all text-muted-foreground text-xs">{action.entry.path}</p>
              </div>
              {action.entry.isDirectory && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">
                    删除目录会递归永久删除内容。请输入目录名确认：{action.entry.name}
                  </p>
                  <Input
                    onChange={(event) => setConfirmName(event.target.value)}
                    placeholder={action.entry.name}
                    value={confirmName}
                  />
                </div>
              )}
            </div>
          )}

          {action?.type === "rename" && "entry" in action && (
            <div className="space-y-2">
              <Input
                autoFocus
                onChange={(event) => setRenameValue(event.target.value)}
                placeholder="新名称"
                value={renameValue}
              />
              <p className="text-muted-foreground text-xs">不能包含 /、\\ 或 ..。</p>
            </div>
          )}

          {action?.type === "move" && "entry" in action && (
            <div className="space-y-2">
              <Input
                autoFocus
                onChange={(event) => setTargetDirectoryPath(event.target.value)}
                placeholder={selectedRoot?.path ?? "目标目录路径"}
                value={targetDirectoryPath}
              />
              <p className="text-muted-foreground text-xs">
                Tauri 端建议选择已授权目录；Web 端仅支持当前授权目录内的目标路径。
              </p>
            </div>
          )}

          {action?.type === "write" && (
            <div className="space-y-3">
              <Input
                onChange={(event) => setTargetDirectoryPath(event.target.value)}
                placeholder={selectedRoot?.path ?? "写入目录"}
                value={targetDirectoryPath}
              />
              <Input
                onChange={(event) => setFileName(event.target.value)}
                placeholder="文件名，例如 notes.txt"
                value={fileName}
              />
              <p className="text-muted-foreground text-xs">
                仅支持文本类文件，例如 .txt、.md、.json、.csv、.log、.yaml、.ts、.tsx、.py、.env。
              </p>
              <Textarea
                className="min-h-40"
                onChange={(event) => setFileContent(event.target.value)}
                placeholder="输入要写入的文本内容。若文件已存在，将覆盖文本内容。"
                value={fileContent}
              />
            </div>
          )}

          <DialogFooter>
            <Button disabled={isOperating} onClick={closeAction} type="button" variant="outline">
              取消
            </Button>
            <Button
              disabled={
                isOperating ||
                (action?.type === "delete" && !canConfirmDelete) ||
                (action?.type === "rename" && !isSafeEntryName(renameValue)) ||
                (action?.type === "write" && (!isSafeEntryName(fileName) || !canSubmitWrite))
              }
              onClick={() => void handleSubmitAction()}
              type="button"
              variant={action?.type === "delete" ? "destructive" : "default"}
            >
              {isOperating && <LoaderCircleIcon className="size-4 animate-spin" />}
              {getDialogSubmitLabel(action)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDialogTitle(action: LocalDiskAction) {
  if (action?.type === "delete") {
    return "确认删除";
  }

  if (action?.type === "rename") {
    return "重命名文件";
  }

  if (action?.type === "move") {
    return "移动文件";
  }

  return "写入文本文件";
}

function getDialogDescription(action: LocalDiskAction, root: LocalDiskRoot | null) {
  if (!root) {
    return "请先选择一个本地目录。";
  }

  if (action?.type === "delete") {
    return "此操作会修改真实文件系统，删除后无法从应用内恢复。";
  }

  if (action?.type === "rename") {
    return "只修改名称，不允许输入路径。";
  }

  if (action?.type === "move") {
    return "将文件移动到授权目录内的目标目录。";
  }

  return `写入到 ${root.path} 或其授权子目录。`;
}

function getDialogSubmitLabel(action: LocalDiskAction) {
  if (action?.type === "delete") {
    return "永久删除";
  }

  if (action?.type === "rename") {
    return "保存名称";
  }

  if (action?.type === "move") {
    return "移动";
  }

  return "写入";
}
