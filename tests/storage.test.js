import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  clearStoredDocuments,
  loadSource,
  removeSource,
  saveSource,
} from "../src/modules/storage.js";

function createLocalStorageMock(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test("storage helpers fall back to localStorage when indexedDB is unavailable", async (t) => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.indexedDB = undefined;
  globalThis.localStorage = createLocalStorageMock();

  t.after(() => {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.localStorage = originalLocalStorage;
  });

  await saveSource(STORAGE_KEY, "# Slide");
  assert.equal(await loadSource(STORAGE_KEY), "# Slide");

  await removeSource(STORAGE_KEY);
  assert.equal(await loadSource(STORAGE_KEY), null);
});

test("clearStoredDocuments clears the localStorage fallback key", async (t) => {
  const originalIndexedDb = globalThis.indexedDB;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.indexedDB = undefined;
  globalThis.localStorage = createLocalStorageMock({
    [STORAGE_KEY]: "# Saved deck",
  });

  t.after(() => {
    globalThis.indexedDB = originalIndexedDb;
    globalThis.localStorage = originalLocalStorage;
  });

  await clearStoredDocuments();
  assert.equal(await loadSource(STORAGE_KEY), null);
});
