import assert from "node:assert/strict";

const {
  buildChildPath,
  getPathName,
  getParentPath,
  isSafeEntryName,
  isWritableTextFileName,
  sortLocalDiskEntries,
} = await import("./local-disk-utils.ts");

const mixedEntries = [
  { isDirectory: false, name: "file-10.txt" },
  { isDirectory: true, name: "项目 2" },
  { isDirectory: false, name: "file-2.txt" },
  { isDirectory: true, name: "项目 1" },
];

assert.equal(buildChildPath("C:\\Users\\demo", "notes.txt"), "C:\\Users\\demo\\notes.txt");
assert.equal(buildChildPath("/Users/demo/", "notes.txt"), "/Users/demo/notes.txt");
assert.equal(getParentPath("C:\\Users\\demo\\notes.txt"), "C:\\Users\\demo");
assert.equal(getParentPath("/Users/demo/notes.txt"), "/Users/demo");
assert.equal(getPathName("C:\\Users\\demo\\notes.txt"), "notes.txt");
assert.equal(getPathName("/Users/demo/notes.txt"), "notes.txt");

assert.equal(isSafeEntryName("notes.txt"), true);
assert.equal(isSafeEntryName(""), false);
assert.equal(isSafeEntryName("../notes.txt"), false);
assert.equal(isSafeEntryName("folder/name"), false);
assert.equal(isSafeEntryName("folder\\name"), false);

assert.equal(isWritableTextFileName("notes.txt"), true);
assert.equal(isWritableTextFileName("README.md"), true);
assert.equal(isWritableTextFileName("config.JSON"), true);
assert.equal(isWritableTextFileName(".env"), true);
assert.equal(isWritableTextFileName("archive.zip"), false);
assert.equal(isWritableTextFileName("photo.png"), false);
assert.equal(isWritableTextFileName("document.pdf"), false);
assert.equal(isWritableTextFileName("spreadsheet.xlsx"), false);

assert.deepEqual(
  sortLocalDiskEntries(mixedEntries).map((entry) => entry.name),
  ["项目 1", "项目 2", "file-2.txt", "file-10.txt"]
);

console.log("local-disk-utils tests passed");
