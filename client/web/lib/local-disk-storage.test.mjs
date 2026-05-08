import assert from "node:assert/strict";

const {
  LOCAL_DISK_ROOT_STORAGE_KEY,
  clearPersistedLocalDiskRoot,
  persistLocalDiskRoot,
  readPersistedLocalDiskRoot,
  toPersistedLocalDiskRoot,
} = await import("./local-disk-storage.ts");

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const storage = createMemoryStorage();
const tauriRoot = {
  name: "Downloads",
  path: "D:\\Users\\demo\\Downloads",
  runtime: "tauri",
};

persistLocalDiskRoot(storage, tauriRoot);

assert.deepEqual(readPersistedLocalDiskRoot(storage), {
  name: "Downloads",
  path: "D:\\Users\\demo\\Downloads",
  runtime: "tauri",
});

assert.deepEqual(JSON.parse(storage.getItem(LOCAL_DISK_ROOT_STORAGE_KEY)), {
  name: "Downloads",
  path: "D:\\Users\\demo\\Downloads",
  runtime: "tauri",
});

assert.deepEqual(
  toPersistedLocalDiskRoot({
    browserRoot: { handle: {}, name: "Work", path: "Work" },
    name: "Work",
    path: "Work",
    runtime: "browser",
  }),
  {
    name: "Work",
    path: "Work",
    runtime: "browser",
  }
);

storage.setItem(LOCAL_DISK_ROOT_STORAGE_KEY, "not-json");
assert.equal(readPersistedLocalDiskRoot(storage), null);
assert.equal(storage.getItem(LOCAL_DISK_ROOT_STORAGE_KEY), null);

storage.setItem(
  LOCAL_DISK_ROOT_STORAGE_KEY,
  JSON.stringify({ name: "Downloads", path: "D:\\Users\\demo\\Downloads", runtime: "unsupported" })
);
assert.equal(readPersistedLocalDiskRoot(storage), null);
assert.equal(storage.getItem(LOCAL_DISK_ROOT_STORAGE_KEY), null);

persistLocalDiskRoot(storage, tauriRoot);
clearPersistedLocalDiskRoot(storage);
assert.equal(readPersistedLocalDiskRoot(storage), null);

console.log("local-disk-storage tests passed");
