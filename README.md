# Markdown Slides Editor

Static, browser-based slide authoring for GitHub Pages.

This project is building a Markdown-driven presentation editor, compiler, and runtime that stays compatible with static hosting. The editor runs entirely in the browser, stores decks locally, and exports portable HTML presentations.

The authoring goal is closer to "Google Slides, but with Markdown" than a simple Markdown-to-slides converter. That includes responsive editing, deck-level review, safe experimentation, and eventually AI-assisted feedback that helps improve presentations without taking control away from the author.

This is intended for real production presentations. It is not a training product or a throwaway demo. The editor and output should help authors present with credibility, clarity, and accessible, trustworthy HTML.

## Current scope

- Markdown editor with live slide preview
- Front matter, optional generated title and closing slides, and slide splitting
- `Note:`, `Resources:`, and `Script:` support for presenter-facing context
- Audience view and presenter view with same-origin sync
- Slide outline and presenter timing support
- Progressive disclosure for lists
- Fixed slide geometry with auto-fit body text and compact density warnings
- Better small-screen support for editor and audience view
- IndexedDB-backed local storage
- In-editor AI prompt generator for briefing Ollama or another LLM
- Source import plus bundled ZIP export for Markdown, JSON, HTML, ODP, and MHTML
- Portable HTML snapshot export
- Print / Save PDF workflow with print-friendly slide pages
- Optional caption/transcript support from local `whisper.cpp` or a configured transcript service
- Built-in theme presets plus optional external CSS override
- Accessible light/dark mode that respects system preference and supports manual override
- Presenter panel layout controls and countdown timer
- Accessibility checks in code for headings, links, image alt text, and notes
- Repo-level guidance for accessibility and coding agents

## Run locally

```bash
npm install
npm test
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/`
- `http://localhost:4173/present/`
- `http://localhost:4173/presenter/`

## Project docs

- `ACCESSIBILITY.md`: accessibility posture, validation expectations, and contributor guidance
- `AGENTS.md`: repository instructions for coding agents and automation tools
- `LICENSE`: AGPLv3 license for the project
- `STYLES.md`: writing, design, and styling standards for the app and repository docs
- `.github/copilot-instructions.md`: onboarding notes for GitHub Copilot coding agent
- `TODO.md`: future roadmap and integration ideas
- `docs/accessibility-checklist.md`: project accessibility checklist
- `docs/ai-authoring-workflow.md`: recommended workflow and prompt template for AI-assisted deck drafting
- `docs/editor-vision.md`: longer-term product direction for the editor and runtime
- `docs/layout-syntax.md`: layout directives for centered content, columns, media blocks, callouts, and quotes
- `docs/manual-a11y-testing.md`: Sa11y-assisted and manual accessibility review workflow
- `docs/resources.md`: accessibility references and source material

The editor also includes an `AI Prompt` button that builds a structured briefing prompt from the current deck metadata, slide topics, and references. Use that to brief an LLM, then paste the returned Markdown back into the editor for review and refinement.

On smaller screens, the editor provides `Edit`, `Preview`, and `Support` pane tabs so you can work in a pinch without trying to keep every panel visible at once.

## AI disclosure

Disclosure of AI use is important to this project.

### AI used to build this repository

- OpenAI Codex, a GPT-5-based coding agent in the Codex desktop environment, was used during repository setup and early development.
  It was used to scaffold the initial static application, write and revise project documentation, add tests, and update planning and guidance files.

### AI used when running the program

- No AI is required to run the program by default.
- The current application runs as a static browser app with no required runtime dependency on an LLM or remote AI service.
- Optional speech-to-text can be enabled for presentations when a local `whisper.cpp` process or a compatible transcript service is available.

### Browser-based AI in the current application

- Browser-based AI is not currently enabled in this application.
- No part of the current shipped editor or presentation runtime executes an in-browser LLM.
- Caption UI stays hidden unless a transcript source is actually available.

### Planned AI direction

- Optional AI-assisted review and editing may be added later.
- If implemented, AI use should be disclosed clearly, kept optional, and separated from the static baseline experience.

## Routes

- `/` editor
- `/present` audience presentation
- `/presenter` presenter view

The repository includes `404.html` so GitHub Pages can redirect deep links back into the single-page app.

## Architecture

- `index.html` loads the app shell
- `src/main.js` routes between editor, audience, and presenter views
- `src/modules/parser.js` parses front matter, slides, and presenter support sections
- `src/modules/markdown.js` renders the current supported Markdown subset
- `src/modules/a11y.js` contains accessibility lint rules
- `src/modules/captions.js` handles caption-source detection, transcript parsing, and transcript polling
- `src/modules/export.js` generates the standalone snapshot HTML
- `src/modules/presentation-state.js` manages reveal-step navigation and duration metadata
- `src/modules/presenter-timer.js` manages presenter countdown timer state
- `src/modules/slide-layout.js` manages slide dimensions and body-text fitting
- `src/modules/theme.js` applies built-in themes and optional external stylesheet overrides
- `src/modules/color-mode.js` manages accessible light/dark mode
- `src/modules/storage.js` handles IndexedDB-first persistence
- `styles/app.css` contains the UI and presentation styling

## Accessibility and AI

Accessibility applies to both the editor UI and the generated slide output. The project is targeting accessible HTML, keyboard navigation, visible focus states, and reduced-motion support.

Whisper-style speech-to-text remains optional. AI-related controls should only be exposed when local or API-backed AI is actually available. Static GitHub Pages mode should continue to work without any server or AI dependency.

Longer term, the editor should support optional LLM-assisted slide review and revision workflows, including local-first integrations such as Ollama, comment-style suggestions, and strong undo/redo support for all applied changes.

The project should be reusable by others, including teams such as CivicActions and W3C, but it should not depend on their adoption to justify product quality. The baseline should stand on its own.

The accessibility approach should actively build on strong public guidance, especially Intopia's presentation accessibility recommendations, while also promoting resources from Inklusiv and related accessibility communities.

## Source format

```md
---
title: My presentation
lang: en
theme: default-high-contrast
durationMinutes: 20
slideWidth: 1280
slideHeight: 720
themeStylesheet: https://example.com/presentation-theme.css
captionsProvider: whisper.cpp
captionsSource: http://localhost:4173/whisper-demo/transcript.json
titleSlide: true
subtitle: A better slide workflow
date: 2026-03-22
location: Toronto
speakers: Alice Example; Bob Example
titleSlideQr: true
closingSlide: true
closingTitle: Questions?
closingPrompt: Thanks for listening.
contactEmail: hello@example.com
contactUrl: https://ox.ca
socialLinks: Mastodon @[email protected]; Bluesky @ox.ca
presentationUrl: https://ox.ca/slides/demo-deck
---

# Slide title

Visible content.

- Visible point
- [>] Reveal this point later in presentation mode

Note:
Speaker notes go here.

Resources:
- [Reference article](https://example.com/article)

Script:
Optional full script text can go here for delivery support or to share with attendees in advance.

---

# Next slide
```

Use `- [>]` inside a list item to mark content for progressive disclosure in audience and snapshot presentation modes.

By default, slides target a 1280x720 presentation surface. Set `slideWidth` and `slideHeight` in front matter if you need a different fixed presentation size.

Set `titleSlide: true` in front matter to generate an optional opening title slide from front matter fields like `title`, `subtitle`, `date`, `location`, and `speakers`.

Set `titleSlideQr: true` to show the published-deck QR code on the title slide when `presentationUrl` or `publishedUrl` is available. Use `titleSlideQrUrl` if you want the title-slide QR to point somewhere else.

Set `closingSlide: true` to generate an optional final slide for questions and follow-up. The closing slide can include `closingTitle`, `closingPrompt`, `contactEmail`, `contactUrl`, `socialLinks`, and `presentationUrl`. When `presentationUrl` is present, the app renders a QR code that points to the published deck.

Inside a slide, you can also add optional `Resources:` and `Script:` sections after the visible content. These do not appear on the audience slide, but they are available in the editor and presenter support panels so references, URLs, and a fuller written script can travel with the deck source.

The editor warns when a slide looks too dense for the target presentation frame, and the slide body text will shrink before the heading does to help keep content on-screen without scrolling.

The editor also supports layout directives such as `::center`, `::column-left`, `::column-right`, `::media-left`, `::media-right`, `::callout`, and `::quote`. See `docs/layout-syntax.md` for examples.

## Optional captions

Live captions are optional and remain hidden unless a transcript source is actually available.

Two supported paths:

- local `whisper.cpp`, typically writing `whisper-demo/transcript.json`
- a compatible service endpoint exposed through `captionsSource`

Expected transcript shape:

```json
{
  "active": true,
  "generated": "2026-03-22T16:00:00Z",
  "text": "Current live transcript text"
}
```

If you run the app on `localhost`, it automatically checks `./whisper-demo/transcript.json` and only shows caption UI when that file becomes available.

For explicit configuration, use front matter such as:

```md
---
captionsProvider: whisper.cpp
captionsSource: http://localhost:4173/whisper-demo/transcript.json
---
```

or:

```md
---
captionsProvider: service
captionsSource: https://captions.example.com/presentation/transcript.json
---
```

Local helper scripts:

- `npm run dev:whisper` starts a `whisper.cpp` `whisper-stream` process and writes `whisper-demo/transcript.json`
- `npm run dev:transcript -- --src ./some-transcript.txt` mirrors a text or JSON file into the same transcript format for testing

This follows the same local-first pattern used in `whisper-slides`: the deck stays static, while a local or service-backed transcript source is polled only when available.

## Export

The primary export action downloads a ZIP bundle containing:

- `deck.md` for future editing
- `deck.json` for machine-readable workflows and integrations
- `presentation.html` for presenting or sharing
- `presentation.odp` for OpenDocument Presentation workflows, including PowerPoint import
- `presentation-one-page.mhtml` for a single-file one-page deck handoff

`Advanced` also includes `Email Deck`, which opens a mail draft with the editor URL and, when the deck is short enough, the Markdown source. This is intended as a practical mobile-to-desktop handoff aid and may be limited by mail client body-size limits.

The exported HTML is portable, but it is not always fully self-contained. If you use `themeStylesheet` or QR-code features that depend on remote resources, the exported presentation still needs network access to load those external assets.

For PDF output, use `Print / Save PDF`. That opens a printable snapshot and triggers the browser print dialog so you can print or save the deck as PDF. This project prefers HTML as the primary accessible format, but the print stylesheet aims to produce a cleaner one-slide-per-page PDF workflow when people need it.

Browser-generated PDFs vary in how much accessibility structure they preserve, so HTML should remain the canonical presentation format whenever possible.

## Theming

Built-in themes can be selected from the editor UI or set in front matter with `theme`.

Available built-in themes:

- `default-high-contrast`
- `paper-warm`
- `night-slate`
- `civic-bright`

For custom branding, set `themeStylesheet` to a CSS URL. That stylesheet is loaded after the built-in theme so it can override colors, typography, spacing, and other presentation styles.

## Color mode

The editor and presenter interfaces support accessible light and dark modes.

- By default, the app follows the browser or operating system preference.
- A manual toggle is available in the editor and presenter headers.
- The selected mode is saved locally in the browser.
- Audience view also respects the saved choice and supports `D` as a keyboard toggle.

## Presenter view

Presenter view includes:

- current slide and next slide panels
- a configurable countdown timer based on `durationMinutes`
- `-1 min`, `+1 min`, `Pause`, and `Reset` controls
- a bottom progress line that shifts from green to red as time runs down
- presenter support content from `Note:`, `Resources:`, and `Script:`

## Audience view

Audience view keeps the slide surface clean for the audience. Text zoom is controlled from presenter view so the presenter can adjust readability without putting extra controls on the audience screen.

- `A-` in presenter view makes the slide text smaller in both presenter and audience views
- `A` in presenter view resets the zoom in both views
- `A+` in presenter view makes the slide text larger in both views
- keyboard shortcuts `-`, `0`, and `+` do the same from presenter view
