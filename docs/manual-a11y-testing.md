# Manual Accessibility Testing

This document describes the manual accessibility workflow for this project, including how to use Sa11y and what to verify by hand before publishing or demonstrating a deck.

Use this alongside:

- [ACCESSIBILITY.md](/Users/mike.gifford/markdown-slides-editor/ACCESSIBILITY.md)
- [docs/accessibility-checklist.md](/Users/mike.gifford/markdown-slides-editor/docs/accessibility-checklist.md)

## Why manual testing still matters

Automated checks help, but they do not catch every problem that affects real presentations.

Manual review is needed to confirm:

- slide structure is understandable
- controls are keyboard-usable
- visual density is reasonable
- notes support the presentation without hiding essential meaning
- generated HTML is semantic and navigable

## When to run this workflow

Run manual accessibility testing when:

- creating a new deck template
- changing rendering or navigation behavior
- changing themes or color mode behavior
- adding new layout directives
- preparing a deck for publication or production use

## Recommended test setup

Use at least:

- editor view: `/`
- audience view: `/present/`
- presenter view: `/presenter/`
- exported HTML snapshot

Where practical, test in:

- a desktop browser with keyboard only
- a narrow viewport or phone-sized browser
- light and dark interface modes
- reduced-motion mode if the change affects movement or transitions

## Pre-flight checks

Before manual testing:

1. Run `npm test`.
2. Load the deck locally.
3. Make sure the deck has representative content, including headings, lists, links, images, notes, and any special layouts being exercised.
4. If testing export, generate a fresh snapshot first.

## Sa11y workflow

Sa11y is a useful browser-side review tool for rendered pages.

Use it against the editor preview when possible, and against the audience or exported presentation when you have a browser-accessible URL.

## How to run Sa11y

1. Open the deck in the browser.
2. Load Sa11y using the bookmarklet or script workflow from [Sa11y](https://sa11y.netlify.app/).
3. Review the rendered slide content, not only the source Markdown.
4. Step through flagged issues and determine whether they reflect a real accessibility problem in the presentation.

## What to look for in Sa11y

- missing or poor image alternative text
- heading-order problems
- unclear link text
- suspicious structural issues
- reading-order or labeling concerns

Sa11y findings should be treated as prompts for review, not as the only source of truth.

## Manual checks by surface

## Editor view

Verify:

- all buttons, menus, dialogs, and inputs are reachable by keyboard
- focus is visible at all times
- the help dialog and AI prompt dialog can be opened and closed without trapping focus
- pane toggles, Advanced actions, and import/export controls are understandable
- local-save messaging is clear and does not imply cloud storage

## Audience view

Verify:

- the audience surface is free of editor clutter
- slide content fits the frame without requiring scrolling
- heading structure is logical in the rendered DOM
- lists are real lists
- images have meaningful alt text
- link text is descriptive
- there is no unnecessary ARIA or semantic "div soup"
- keyboard navigation works predictably

## Presenter view

Verify:

- presenter controls work without a mouse
- slide changes in presenter view update audience view
- presenter-only controls do not appear to the audience
- notes, script, resources, and timer remain readable
- timer adjustments and zoom changes do not break layout

## Exported HTML

Verify:

- the exported presentation opens cleanly
- semantic structure matches the in-app view
- print styling does not hide essential content
- external dependencies such as remote stylesheets or QR services are understood before publishing

## Content-specific checks

For the deck itself, verify:

- each slide has one `H1`
- heading levels do not skip
- slides carry the core idea needed by the audience
- notes add detail but do not hide essential meaning
- quote, callout, media, and column layouts are still readable and sensible
- slides are not overloaded with too much text
- color is not the only way meaning is conveyed
- motion is minimal and not distracting

## Theme QA

When a change touches theme tokens, color mode, or visual status styles, verify:

- heading, body, and link text still meet required contrast targets in the active theme
- focus rings remain clearly visible against editor, audience, and presenter backgrounds
- warning, error, and info tokens remain legible and are not distinguishable by color alone
- spot checks pass in all three surfaces: editor (`/`), audience (`/present/`), and presenter (`/presenter/`)

## DOM inspection checklist

Inspect the rendered HTML in browser developer tools when the feature touches layout or rendering.

Confirm:

- headings are real `h1`, `h2`, and `h3` elements where appropriate
- list content renders as `ul`, `ol`, and `li`
- blockquotes render as `blockquote`
- images render as `img` with `alt`
- layout helpers do not destroy semantic order
- ARIA roles, labels, and live regions are present only when justified

## Keyboard walkthrough

At minimum:

1. Start in the editor without using a mouse.
2. Tab through the main controls.
3. Open and close dialogs.
4. Move to audience and presenter views.
5. Advance and rewind slides.
6. Verify presenter-only controls do not leak into the audience view.

## Publication checks

Before publishing or sharing a production deck:

- review the Resources slide or follow-up links
- verify the title and closing slide content
- confirm contact and QR links point to the right place
- verify the deck still makes sense without presenter notes
- prefer accessible HTML as the canonical published format

## Known limitations

- Sa11y may not be available in every environment or workflow
- browser-generated PDF accessibility varies by browser and platform
- remote assets can reduce the portability of an exported deck
- automated checks do not yet cover every runtime behavior

## Reporting results

When you find an issue, note:

- where it appears: editor, audience, presenter, or export
- what the accessibility impact is
- whether it is structural, visual, keyboard-related, or content-related
- how to reproduce it

That keeps accessibility review actionable instead of vague.
