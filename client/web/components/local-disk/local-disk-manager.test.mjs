import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./local-disk-manager.tsx", import.meta.url), "utf8");

assert.equal(
  source.includes("didRestoreDirectoryRef"),
  false,
  "LocalDiskManager must not use a one-shot restore ref because React StrictMode can cancel the first restore and leave the UI stuck in restoring state."
);

assert.equal(
  source.includes("本地空间"),
  false,
  "LocalDiskManager should not render the removed local storage placeholder card."
);
assert.equal(
  source.includes("管理范围"),
  false,
  "LocalDiskManager should not render the removed management scope card."
);
assert.equal(
  source.includes("占位统计"),
  false,
  "LocalDiskManager should not render placeholder disk statistics."
);

assert.equal(
  source.includes("操作台"),
  true,
  "LocalDiskManager should expose a compact operation console for high-frequency actions."
);
assert.equal(
  source.includes("搜索文件或路径"),
  true,
  "LocalDiskManager should provide directory entry search to improve operation efficiency."
);
assert.equal(
  source.includes("visibleDirectoryEntries"),
  true,
  "LocalDiskManager should render filtered directory entries instead of always rendering the full list."
);
assert.equal(
  source.includes("max-w-5xl"),
  false,
  "LocalDiskManager should not cap the local disk page width; the page should use the full available workspace width."
);
assert.equal(
  source.includes("data-local-disk-width=\"full\""),
  true,
  "LocalDiskManager should mark the main local disk container as full-width."
);
assert.equal(
  source.includes("function getLocalEntryKey"),
  true,
  "LocalDiskManager should use a stable key helper for dynamic file entries."
);
assert.equal(
  source.includes("key={getLocalEntryKey(entry)}"),
  true,
  "LocalDiskManager should not rely on a single possibly-empty entry path as the list key."
);

console.log("local-disk-manager tests passed");
