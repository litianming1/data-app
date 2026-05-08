export type SortableLocalDiskEntry = {
  isDirectory: boolean;
  name: string;
};

const pathSeparatorPattern = /[\\/]/;
const writableTextExtensions = new Set([
  "bat",
  "c",
  "cfg",
  "conf",
  "cpp",
  "cs",
  "css",
  "csv",
  "env",
  "go",
  "h",
  "html",
  "ini",
  "java",
  "js",
  "json",
  "jsx",
  "log",
  "md",
  "mjs",
  "ps1",
  "py",
  "rs",
  "sh",
  "sql",
  "svg",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);
const writableTextFileNames = new Set([
  ".env",
  ".env.local",
  ".gitignore",
  "dockerfile",
  "license",
  "makefile",
  "readme",
]);

export function buildChildPath(parent: string, name: string) {
  const separator = parent.includes("\\") ? "\\" : "/";
  const normalizedParent = parent.replace(/[\\/]+$/, "");

  return `${normalizedParent}${separator}${name}`;
}

export function getParentPath(path: string) {
  const normalizedPath = path.replace(/[\\/]+$/, "");
  const separatorIndex = Math.max(
    normalizedPath.lastIndexOf("\\"),
    normalizedPath.lastIndexOf("/")
  );

  if (separatorIndex <= 0) {
    return normalizedPath.slice(0, separatorIndex + 1);
  }

  return normalizedPath.slice(0, separatorIndex);
}

export function getPathName(path: string) {
  const normalizedPath = path.replace(/[\\/]+$/, "");
  const separatorIndex = Math.max(
    normalizedPath.lastIndexOf("\\"),
    normalizedPath.lastIndexOf("/")
  );

  return normalizedPath.slice(separatorIndex + 1);
}

export function isSafeEntryName(name: string) {
  const trimmedName = name.trim();

  return (
    trimmedName.length > 0 &&
    trimmedName !== "." &&
    trimmedName !== ".." &&
    !trimmedName.includes("..") &&
    !pathSeparatorPattern.test(trimmedName)
  );
}

export function isWritableTextFileName(name: string) {
  const normalizedName = name.trim().toLowerCase();

  if (!isSafeEntryName(normalizedName)) {
    return false;
  }

  if (writableTextFileNames.has(normalizedName)) {
    return true;
  }

  const extension = normalizedName.split(".").pop();

  return Boolean(extension && extension !== normalizedName && writableTextExtensions.has(extension));
}

export function sortLocalDiskEntries<Entry extends SortableLocalDiskEntry>(
  entries: Entry[]
) {
  return [...entries].sort((first, second) => {
    if (first.isDirectory !== second.isDirectory) {
      return first.isDirectory ? -1 : 1;
    }

    return first.name.localeCompare(second.name, "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base",
    });
  });
}
