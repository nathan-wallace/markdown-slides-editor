import test from "node:test";
import assert from "node:assert/strict";
import { parseSource } from "../src/modules/parser.js";
import { renderMarkdown } from "../src/modules/markdown.js";
import { renderDeck } from "../src/modules/render.js";
import { removeFrontMatterValue, updateFrontMatterValue } from "../src/modules/source-format.js";
import { lintDeck } from "../src/modules/a11y.js";

test("parseSource extracts front matter, slides, and notes", () => {
  const source = `---
title: Demo
lang: en
---

# One

Body

Note:
Private note

Resources:
- [Reference](https://example.com)

Script:
Full script text.

---

# Two`;

  const deck = parseSource(source);
  assert.equal(deck.metadata.title, "Demo");
  assert.equal(deck.slides.length, 2);
  assert.equal(deck.slides[0].notes, "Private note");
  assert.equal(deck.slides[0].resources, "- [Reference](https://example.com)");
  assert.equal(deck.slides[0].script, "Full script text.");
});

test("parseSource prepends an optional title slide from front matter", () => {
  const source = `---
title: Demo deck
titleSlide: true
subtitle: Better presentations
date: 2026-03-22
location: Toronto
speakers: Alice Example; Bob Example
---

# Slide one`;

  const deck = parseSource(source);
  assert.equal(deck.slides.length, 2);
  assert.equal(deck.slides[0].kind, "title");
  assert.equal(deck.slides[0].title, "Demo deck");
  assert.equal(deck.slides[0].speakers, "Alice Example; Bob Example");
});

test("lintDeck flags missing alt text and generic links", () => {
  const source = `# Slide

[click here](https://example.com)

![](https://example.com/image.png)`;

  const deck = parseSource(source);
  const rendered = renderDeck(deck);
  const issues = lintDeck(deck, rendered.renderedSlides);
  assert.equal(issues.some((issue) => issue.message.includes("non-descriptive link")), true);
  assert.equal(issues.some((issue) => issue.message.includes("without alt text")), true);
});

test("renderMarkdown supports ordered lists and progressive disclosure markers", () => {
  const rendered = renderMarkdown(`# Slide

1. First item
2. [>] Reveal item`);

  assert.equal(rendered.html.includes("<ol>"), true);
  assert.equal(rendered.html.includes('class="next"'), true);
  assert.equal(rendered.stepCount, 1);
});

test("renderDeck renders title-slide metadata into semantic HTML", () => {
  const source = `---
title: Demo deck
titleSlide: true
subtitle: Better presentations
date: 2026-03-22
location: Toronto
speakers: Alice Example; Bob Example
---

# Slide one`;

  const deck = parseSource(source);
  const rendered = renderDeck(deck);
  assert.equal(rendered.renderedSlides[0].html.includes("<h1>Demo deck</h1>"), true);
  assert.equal(rendered.renderedSlides[0].html.includes("<dt>Date</dt>"), true);
  assert.equal(rendered.renderedSlides[0].html.includes("<dt>Speakers</dt>"), true);
  assert.equal(rendered.renderedSlides[0].html.includes("<ul class=\"title-slide__speakers\">"), true);
});

test("renderDeck renders resources and script sections for presenter support", () => {
  const source = `# Slide

Visible content.

Note:
Speaker notes.

Resources:
- [Reference](https://example.com)

Script:
Full script text.`;

  const deck = parseSource(source);
  const rendered = renderDeck(deck);
  assert.equal(rendered.renderedSlides[0].resourcesHtml.includes("<a href=\"https://example.com\">Reference</a>"), true);
  assert.equal(rendered.renderedSlides[0].scriptHtml.includes("<p>Full script text.</p>"), true);
});

test("parseSource appends an optional closing slide from front matter", () => {
  const source = `---
title: Demo deck
closingSlide: true
closingTitle: Questions?
closingPrompt: Thanks for listening.
contactEmail: hello@example.com
contactUrl: https://example.com
socialLinks: Mastodon @example; Bluesky @example.com
presentationUrl: https://ox.ca/demo-deck
---

# Slide one`;

  const deck = parseSource(source);
  assert.equal(deck.slides.length, 2);
  assert.equal(deck.slides[1].kind, "closing");
  assert.equal(deck.slides[1].presentationUrl, "https://ox.ca/demo-deck");
});

test("renderDeck renders a closing slide with contact details and qr code", () => {
  const source = `---
title: Demo deck
closingSlide: true
closingTitle: Questions?
contactEmail: hello@example.com
contactUrl: https://example.com
socialLinks: Mastodon @example; Bluesky @example.com
presentationUrl: https://ox.ca/demo-deck
---

# Slide one`;

  const deck = parseSource(source);
  const rendered = renderDeck(deck);
  const closingSlide = rendered.renderedSlides[1];
  assert.equal(closingSlide.html.includes("<h1>Questions?</h1>"), true);
  assert.equal(closingSlide.html.includes("mailto:hello@example.com"), true);
  assert.equal(closingSlide.html.includes("api.qrserver.com"), true);
});

test("renderDeck can show the presentation qr code on the title slide", () => {
  const source = `---
title: Demo deck
titleSlide: true
titleSlideQr: true
presentationUrl: https://ox.ca/demo-deck
---

# Slide one`;

  const deck = parseSource(source);
  const rendered = renderDeck(deck);
  assert.equal(rendered.renderedSlides[0].html.includes("api.qrserver.com"), true);
});

test("updateFrontMatterValue adds and updates theme metadata", () => {
  const base = "# Slide";
  const withTheme = updateFrontMatterValue(base, "theme", "night-slate");
  assert.equal(withTheme.includes("theme: night-slate"), true);

  const updated = updateFrontMatterValue(withTheme, "theme", "civic-bright");
  assert.equal(updated.includes("theme: civic-bright"), true);
});

test("removeFrontMatterValue removes optional theme stylesheet metadata", () => {
  const source = `---
title: Demo
themeStylesheet: https://example.com/theme.css
---

# Slide`;

  const updated = removeFrontMatterValue(source, "themeStylesheet");
  assert.equal(updated.includes("themeStylesheet"), false);
});
