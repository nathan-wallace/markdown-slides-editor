import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRESENTER_PANELS,
  loadPresenterLayout,
  movePresenterPanel,
  normalizePresenterPanels,
  PRESENTER_LAYOUT_STORAGE_KEY,
  resizePresenterPanel,
  savePresenterLayout,
} from "../src/modules/presenter-layout.js";

function createStorageMock(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) {
    values.set(PRESENTER_LAYOUT_STORAGE_KEY, initialValue);
  }
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("normalizePresenterPanels restores missing panels and clamps spans", () => {
  const normalized = normalizePresenterPanels([{ id: "current", span: 99 }]);
  assert.equal(normalized.length, DEFAULT_PRESENTER_PANELS.length);
  assert.equal(normalized.find((panel) => panel.id === "current").span, 12);
  assert.equal(normalized.some((panel) => panel.id === "notes"), true);
  assert.equal(normalized.some((panel) => panel.id === "captions"), true);
});

test("resizePresenterPanel changes only the targeted panel span", () => {
  const resized = resizePresenterPanel(DEFAULT_PRESENTER_PANELS, "timer", 2);
  assert.equal(resized.find((panel) => panel.id === "timer").span, 5);
  assert.equal(resized.find((panel) => panel.id === "current").span, 5);
});

test("movePresenterPanel reorders panels without losing them", () => {
  const moved = movePresenterPanel(DEFAULT_PRESENTER_PANELS, "notes", -2);
  assert.equal(moved.length, DEFAULT_PRESENTER_PANELS.length);
  assert.equal(moved[1].id, "notes");
});

test("savePresenterLayout and loadPresenterLayout round-trip through storage", () => {
  const storage = createStorageMock();
  const layout = movePresenterPanel(DEFAULT_PRESENTER_PANELS, "outline", -1);
  savePresenterLayout(layout, storage);
  const loaded = loadPresenterLayout(storage);
  assert.equal(loaded[4].id, "outline");
});

test("loadPresenterLayout falls back to defaults for invalid JSON", () => {
  const storage = createStorageMock("{invalid");
  const loaded = loadPresenterLayout(storage);
  assert.deepEqual(
    loaded.map((panel) => panel.id),
    DEFAULT_PRESENTER_PANELS.map((panel) => panel.id),
  );
});
