import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyDeckTheme,
  BUILT_IN_THEME_IDS,
  DEFAULT_THEME_ID,
} from "../src/modules/theme.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(__dirname, "../styles/app.css");

function getDataThemeSelectors(cssText) {
  const selectors = new Set();
  const selectorPattern = /:root\[data-theme="([^"]+)"\]\s*\{/g;
  let match = selectorPattern.exec(cssText);
  while (match) {
    selectors.add(match[1]);
    match = selectorPattern.exec(cssText);
  }
  return selectors;
}

test("built-in theme ids each have a matching CSS data-theme selector", () => {
  const cssText = fs.readFileSync(cssPath, "utf8");
  const cssSelectors = getDataThemeSelectors(cssText);

  for (const themeId of BUILT_IN_THEME_IDS) {
    assert.equal(cssSelectors.has(themeId), true, `Missing CSS selector for ${themeId}`);
  }
});

test("CSS data-theme selectors have no orphaned themes missing from JS", () => {
  const cssText = fs.readFileSync(cssPath, "utf8");
  const cssSelectors = getDataThemeSelectors(cssText);
  const knownThemes = new Set(BUILT_IN_THEME_IDS);

  for (const selectorThemeId of cssSelectors) {
    assert.equal(
      knownThemes.has(selectorThemeId),
      true,
      `Unknown CSS theme selector found: ${selectorThemeId}`,
    );
  }
});

test("applyDeckTheme deterministically falls back to default for unknown themes", () => {
  const originalDocument = globalThis.document;

  const themeLink = { href: "", disabled: true };
  const fakeDocument = {
    documentElement: {
      dataset: {},
      style: {
        setProperty() {},
      },
    },
    head: {
      append() {},
    },
    querySelector(selector) {
      if (selector === "#deck-theme-stylesheet") {
        return themeLink;
      }
      return null;
    },
    createElement() {
      return themeLink;
    },
  };

  globalThis.document = fakeDocument;

  try {
    applyDeckTheme({ theme: "totally-unknown-theme" });
    assert.equal(fakeDocument.documentElement.dataset.theme, DEFAULT_THEME_ID);
  } finally {
    globalThis.document = originalDocument;
  }
});
