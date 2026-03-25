import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExportBundle,
  buildMhtmlDocument,
  buildOdpPresentation,
  buildOnePageHtml,
  buildSnapshotHtml,
} from "../src/modules/export.js";
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

test("buildExportBundle includes markdown, html, odp, and mhtml files in the zip payload", () => {
  const bundle = buildExportBundle({
    markdownSource: "# Deck",
    deckJson: "{\"title\":\"Deck\"}",
    snapshotHtml: "<!doctype html><html><body>Deck</body></html>",
    odpBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    onePageMhtml: "MIME-Version: 1.0",
  });

  const text = new TextDecoder().decode(bundle);
  assert.equal(text.includes("deck.md"), true);
  assert.equal(text.includes("deck.json"), true);
  assert.equal(text.includes("presentation.html"), true);
  assert.equal(text.includes("presentation.odp"), true);
  assert.equal(text.includes("presentation-one-page.mhtml"), true);
  assert.equal(bundle[0], 0x50);
  assert.equal(bundle[1], 0x4b);
});

test("buildOnePageHtml renders all slides visible without navigation controls", () => {
  const html = buildOnePageHtml({
    title: "One page deck",
    cssText: ".slide{color:black;}",
    renderedSlides: [
      { html: "<h1>One</h1>", kind: "title" },
      { html: "<h1>Two</h1>", kind: "content" },
    ],
    metadata: {
      lang: "en-CA",
      theme: "night-slate",
    },
  });

  assert.equal(html.includes('<html lang="en-CA">'), true);
  assert.equal(html.includes('data-theme="night-slate"'), true);
  assert.equal(html.includes("one-page-body"), true);
  assert.equal(html.includes('aria-label="Slide 1"'), true);
  assert.equal(html.includes('aria-label="Slide 2"'), true);
  assert.equal(html.includes("snapshot-controls"), false);
  assert.equal(html.includes("window.print()"), false);
});

test("exported html falls back to default theme for invalid or empty theme metadata", () => {
  const invalidThemeSnapshot = buildSnapshotHtml({
    title: "Invalid theme snapshot",
    cssText: "",
    renderedSlides: [{ html: "<h1>One</h1>", stepCount: 0 }],
    metadata: {
      theme: "not-a-real-theme",
    },
    source: "# One",
  });

  const emptyThemeOnePage = buildOnePageHtml({
    title: "Empty theme one page",
    cssText: "",
    renderedSlides: [{ html: "<h1>One</h1>", kind: "content" }],
    metadata: {
      theme: "",
    },
  });

  assert.equal(invalidThemeSnapshot.includes('data-theme="default-high-contrast"'), true);
  assert.equal(emptyThemeOnePage.includes('data-theme="default-high-contrast"'), true);
});

test("buildOdpPresentation creates an OpenDocument Presentation archive", () => {
  const odp = buildOdpPresentation({
    title: "Deck ODP",
    renderedSlides: [
      {
        html: "<h1>Slide one</h1><p>Intro paragraph</p><ul><li>Point one</li><li>Point two</li></ul>",
        headings: [{ level: 1, text: "Slide one" }],
      },
    ],
    metadata: {
      slideWidth: 1280,
      slideHeight: 720,
    },
  });

  const text = new TextDecoder().decode(odp);
  assert.equal(text.includes("mimetype"), true);
  assert.equal(text.includes("content.xml"), true);
  assert.equal(text.includes("styles.xml"), true);
  assert.equal(text.includes("META-INF/manifest.xml"), true);
  assert.equal(text.includes("application/vnd.oasis.opendocument.presentation"), true);
});

test("buildMhtmlDocument wraps one-page html as a single mhtml document", () => {
  const mhtml = buildMhtmlDocument({
    title: "Deck one page",
    html: "<!doctype html><html><body><h1>Deck</h1></body></html>",
  });

  assert.equal(mhtml.includes("MIME-Version: 1.0"), true);
  assert.equal(mhtml.includes('Content-Type: multipart/related; type="text/html"'), true);
  assert.equal(mhtml.includes("Content-Transfer-Encoding: base64"), true);
  assert.equal(mhtml.includes("PCFkb2N0eXBl"), true);
});
