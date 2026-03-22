import test from "node:test";
import assert from "node:assert/strict";
import { resolveInitialColorMode } from "../src/modules/color-mode.js";

test("resolveInitialColorMode respects saved user choice first", () => {
  assert.deepEqual(resolveInitialColorMode("dark", false), {
    mode: "dark",
    userHasOverride: true,
  });
  assert.deepEqual(resolveInitialColorMode("light", true), {
    mode: "light",
    userHasOverride: true,
  });
});

test("resolveInitialColorMode falls back to system preference when no saved mode exists", () => {
  assert.deepEqual(resolveInitialColorMode(null, true), {
    mode: "dark",
    userHasOverride: false,
  });
  assert.deepEqual(resolveInitialColorMode(undefined, false), {
    mode: "light",
    userHasOverride: false,
  });
});
