# AGENTS.md

## Project Overview

- This repository is a small, static browser app for authoring Markdown-based slide decks and previewing them as accessible HTML presentations.
- The current implementation is plain JavaScript, HTML, and CSS with no frontend framework and no bundler.
- The long-term direction is to align the generated presentation runtime with `whisper-slides`, preserve strong W3C-style accessible slide markup, and expose Whisper speech-to-text only when local or API-backed AI is actually available.
- GitHub Pages static hosting is a core constraint. Do not introduce a server requirement for the default experience.
- Leveraging local browser persistence is important. Prefer browser-side caching and storage over network-dependent state when adding features for the default static workflow.
- Read `STYLES.md` alongside this file when making UI, wording, or presentation-style changes.

## Setup Commands

- Check runtime versions first:
  - `node -v` validated with `v18.20.8`
  - `npm -v` validated with `10.8.2`
  - `python3 --version` validated with `Python 3.9.6`
- Install dependencies with `npm install`
  - Validated result in this repo: succeeds in about 244ms and reports no vulnerabilities.
  - Today this is effectively a no-op because the repo has no package dependencies, but it is still safe to run.
- Run tests with `npm test`
  - Validated result: passes with Node’s built-in test runner in about 50ms.
- Run the app locally with `python3 -m http.server 4173`
  - This is the documented local dev server for the current static app.
  - In the Codex sandbox this required elevated permission and then served successfully; follow-up `curl` checks could not connect from a separate sandboxed process, so treat that as an environment limitation, not a repo failure.
  - On a normal local machine, open `http://localhost:4173`.

## Always-Do Validation Flow

- Always run `npm install` before validating changes, even though it is currently a no-op.
- Always run `npm test` before finishing a change.
- If you touch presentation behavior, also run the local static server and manually verify:
  - `/` editor
  - `/present/` audience view
  - `/presenter/` presenter view
- If you touch export, verify that the main `Export` ZIP still contains the expected bundle files.
- If you touch accessibility rules or rendering, compare behavior against `docs/accessibility-checklist.md` and `docs/manual-a11y-testing.md`.

## Project Layout

- Root files:
  - `index.html`: SPA shell that loads `src/main.js`
  - `404.html`: GitHub Pages redirect helper for deep-link routes
  - `README.md`: human-oriented project summary and local run instructions
  - `LICENSE`: AGPLv3 license text
  - `TODO.md`: future roadmap ideas, especially `whisper-slides`, W3C accessibility patterns, and optional AI/Whisper support
  - `package.json`: minimal scripts for testing, local serving, and optional Whisper helpers
- Documentation:
  - `docs/accessibility-checklist.md`: required accessibility targets for slide structure, links, media, motion, keyboard support, and validation
  - `docs/editor-vision.md`: longer-term product direction for the editor and runtime
  - `docs/manual-a11y-testing.md`: Sa11y-assisted and manual accessibility workflow
  - `docs/resources.md`: project reference position on Intopia, Inklusiv, WCAG, and APG usage
- App entry:
  - `src/main.js`: loads stored source, resolves route, and mounts editor, audience, or presenter views
- Core modules:
  - `src/modules/parser.js`: front matter parsing, slide splitting on `---`, and speaker note extraction using `Note:`
  - `src/modules/markdown.js`: lightweight Markdown-to-HTML renderer
  - `src/modules/render.js`: applies Markdown rendering to each parsed slide
  - `src/modules/a11y.js`: current deck linting for H1 count, heading skips, generic links, missing alt text, note presence, and slide-density assessment
  - `src/modules/ai-prompt.js`: generates structured AI briefing prompts from deck content
  - `src/modules/captions.js`: caption-source capability detection, transcript parsing, and transcript polling helpers
  - `src/modules/storage.js`: IndexedDB-first persistence plus fallback to `localStorage`
  - `src/modules/router.js`: route detection and GitHub Pages redirect restoration
  - `src/modules/sync.js`: `BroadcastChannel` presenter/editor sync with a `localStorage` fallback
  - `src/modules/export.js`: bundle export helpers plus standalone HTML, ODP, and one-page MHTML generation
  - `src/modules/slide-layout.js`: slide-size normalization and body-text fitting
- Views:
  - `src/modules/views/editor-view.js`: split-pane editor, preview, notes, AI prompt modal, one-page view, import/export, and route launchers
  - `src/modules/views/presentation-view.js`: audience presentation shell and keyboard navigation
  - `src/modules/views/presenter-view.js`: current slide, next slide, notes, timer, panel layout controls, and shared zoom controls
  - `src/modules/views/shared.js`: compile pipeline and shared rendering helpers
- Styling:
  - `styles/app.css`: full visual system and responsive layout
- Tests:
  - `tests/parser.test.js`: parser and rendering coverage
  - `tests/export.test.js`: bundle and export format coverage
  - `tests/a11y.test.js`: density and lint-threshold coverage
  - `tests/ai-prompt.test.js`: AI prompt generation coverage
  - `tests/slide-layout.test.js`: slide-dimension and fitting coverage

## Architecture Notes

- There is no build step, no transpiler, no linter, and no GitHub Actions workflow yet.
- There is no external Markdown library yet; the current Markdown renderer is intentionally small and only supports the syntax implemented in `src/modules/markdown.js`.
- The current runtime is an in-repo placeholder. Planned `whisper-slides` alignment is tracked in `TODO.md`.
- Whisper or other AI features must remain optional and should only surface in the UI when an actual AI capability is available.
- Do not show speech-to-text status, buttons, transcript placeholders, or related help text when the transcript source is unavailable.
- Keep the static baseline honest: GitHub Pages mode must work without server code, local binaries, or secret keys.
- When adding offline-friendly behavior, prefer existing browser primitives such as IndexedDB, `localStorage`, and cache-aware static asset loading before inventing new infrastructure.

## Editing Guidance

- Prefer small, direct edits in the existing modules over introducing new abstractions.
- If you use AI to materially change the repository, update `README.md` to disclose that use accurately and specifically.
- If you add a new feature, decide first whether it belongs in:
  - the static baseline, or
  - the optional AI/local-runtime layer
- Do not blur those two modes.
- Preserve keyboard access and visible focus states when editing UI.
- Preserve the source format contract:
  - front matter at the top
  - `---` for slide boundaries
  - `Note:` for speaker notes
  - `Resources:` for slide-linked references
  - `Script:` for fuller speaker script content
- Optional caption settings should live in front matter, for example `captionsProvider` and `captionsSource`, and must degrade cleanly when the source is unavailable.
- Preserve and extend local browser caching carefully. Changes to persistence or cached assets should degrade gracefully for returning users instead of wiping or bypassing local state.

## Validation and CI Reality

- There are currently no CI workflows under `.github/workflows`.
- There is currently no lint command.
- There is currently no production build command.
- The effective pre-check-in validation today is:
  - `npm install`
  - `npm test`
  - manual local browser verification when UI behavior changes

## Known Working Commands

- `npm install`
- `npm test`
- `python3 -m http.server 4173`
- `npm run dev:whisper`
- `npm run dev:transcript -- --src ./path/to/transcript.txt`

## Known Gaps

- No automated browser tests yet
- No `axe` or `pa11y` automation yet
- No bundled local asset export yet
- No real `whisper-slides` runtime integration yet

## Search Policy

- Trust this file first.
- Only search the repo when these instructions are incomplete, stale, or contradicted by the files you are changing.
