import test from "node:test";
import assert from "node:assert/strict";
import { buildSnapshotHtml } from "../src/modules/export.js";
import { buildThemeLinkTag } from "../src/modules/theme.js";

test("buildThemeLinkTag includes an external stylesheet only when configured", () => {
  assert.equal(buildThemeLinkTag({}), "");
  assert.equal(
    buildThemeLinkTag({ themeStylesheet: "https://example.com/theme.css" }),
    '<link rel="stylesheet" href="https://example.com/theme.css" />',
  );
});

test("buildSnapshotHtml includes theme data, step counts, and embedded source payload", () => {
  const html = buildSnapshotHtml({
    title: "Deck snapshot",
    cssText: ".slide{color:black;}",
    renderedSlides: [
      { html: "<h1>One</h1>", stepCount: 2 },
      { html: "<h1>Two</h1>", stepCount: 0 },
    ],
    metadata: {
      lang: "en-CA",
      theme: "night-slate",
      themeStylesheet: "https://example.com/theme.css",
    },
    source: "# One",
  });

  assert.equal(html.includes('<html lang="en-CA">'), true);
  assert.equal(html.includes('data-theme="night-slate"'), true);
  assert.equal(html.includes('href="https://example.com/theme.css"'), true);
  assert.equal(html.includes('data-step-count="2"'), true);
  assert.equal(html.includes('<script id="deck-source" type="application/json">'), true);
  assert.equal(html.includes('"slideCount":2'), true);
});

test("buildSnapshotHtml escapes closing script tags inside embedded source", () => {
  const html = buildSnapshotHtml({
    title: "Escaping test",
    cssText: "",
    renderedSlides: [{ html: "<h1>One</h1>", stepCount: 0 }],
    metadata: {},
    source: "</script><script>alert('x')</script>",
  });

  assert.equal(html.includes("</script><script>alert"), false);
  assert.equal(html.includes("<\\/script><script>alert"), true);
});
