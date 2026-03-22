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
- IndexedDB-backed local storage
- Source import plus bundled ZIP export for Markdown and presentation HTML
- Portable HTML snapshot export
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

Then open `http://localhost:4173`.

## Project docs

- `ACCESSIBILITY.md`: accessibility posture, validation expectations, and contributor guidance
- `AGENTS.md`: repository instructions for coding agents and automation tools
- `STYLES.md`: writing, design, and styling standards for the app and repository docs
- `.github/copilot-instructions.md`: onboarding notes for GitHub Copilot coding agent
- `TODO.md`: future roadmap and integration ideas
- `docs/accessibility-checklist.md`: project accessibility checklist
- `docs/resources.md`: accessibility references and source material

## AI disclosure

Disclosure of AI use is important to this project.

### AI used to build this repository

- OpenAI Codex, a GPT-5-based coding agent in the Codex desktop environment, was used during repository setup and early development.
  It was used to scaffold the initial static application, write and revise project documentation, add tests, and update planning and guidance files.

### AI used when running the program

- No AI is required to run the program today.
- The current application runs as a static browser app with no built-in runtime dependency on an LLM or remote AI service.

### Browser-based AI in the current application

- Browser-based AI is not currently enabled in this application.
- No part of the current shipped editor or presentation runtime executes an in-browser LLM.

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
- `src/modules/export.js` generates the standalone snapshot HTML
- `src/modules/presentation-state.js` manages reveal-step navigation and duration metadata
- `src/modules/presenter-timer.js` manages presenter countdown timer state
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
themeStylesheet: https://example.com/presentation-theme.css
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

Set `titleSlide: true` in front matter to generate an optional opening title slide from front matter fields like `title`, `subtitle`, `date`, `location`, and `speakers`.

Set `titleSlideQr: true` to show the published-deck QR code on the title slide when `presentationUrl` or `publishedUrl` is available. Use `titleSlideQrUrl` if you want the title-slide QR to point somewhere else.

Set `closingSlide: true` to generate an optional final slide for questions and follow-up. The closing slide can include `closingTitle`, `closingPrompt`, `contactEmail`, `contactUrl`, `socialLinks`, and `presentationUrl`. When `presentationUrl` is present, the app renders a QR code that points to the published deck.

Inside a slide, you can also add optional `Resources:` and `Script:` sections after the visible content. These do not appear on the audience slide, but they are available in the editor and presenter support panels so references, URLs, and a fuller written script can travel with the deck source.

## Export

The primary export action downloads a ZIP bundle containing:

- `deck.md` for future editing
- `presentation.html` for presenting or sharing

`Export Deck JSON` remains available in the Advanced menu for machine-readable workflows.

The exported HTML is portable, but it is not always fully self-contained. If you use `themeStylesheet` or QR-code features that depend on remote resources, the exported presentation still needs network access to load those external assets.

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
