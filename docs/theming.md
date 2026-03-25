# Theming contributor guide

This document is the canonical guide for contributing theme changes in this repository.

Use this guide when you:

- add or rename built-in themes
- change theme token defaults
- add token overrides for a specific built-in theme
- tune theme behavior with color mode

## Where theme work belongs

### Register built-in themes in `src/modules/theme.js`

Use `src/modules/theme.js` to define which built-in theme IDs are valid and visible in the UI.

- `BUILT_IN_THEME_IDS` is the source of truth for accepted `theme` front matter values.
- `BUILT_IN_THEMES` controls the label list shown to authors.
- `DEFAULT_THEME_ID` is the fallback when deck metadata requests an unknown theme.

When you add a built-in theme ID, update both arrays so the theme can be selected and applied.

### Implement token overrides in `styles/app.css`

Use `styles/app.css` for token values and per-theme overrides.

- Base token defaults live in `:root`.
- Built-in theme overrides live in `:root[data-theme="<id>"]` blocks.
- Color mode tokens are controlled by `@media (prefers-color-scheme: dark)`, `:root[data-color-mode="light"]`, and `:root[data-color-mode="dark"]`.

Keep built-in themes as token overrides. Do not introduce theme-specific structural layout rules that require markup changes.

## Required token set and fallback expectations

At minimum, built-in themes should preserve this token set because UI, editor, presenter, and slide styles depend on it:

- `--bg`
- `--panel`
- `--panel-strong`
- `--panel-alt`
- `--ink`
- `--muted`
- `--accent`
- `--accent-soft`
- `--border`
- `--error`
- `--warning`
- `--info`
- `--ok`
- `--shadow`
- `--body-layer-1`
- `--body-layer-2`
- `--body-layer-3`
- `--font-display`
- `--font-body`

Fallback expectations:

1. Every token must have a safe default in `:root`.
2. Theme blocks in `:root[data-theme="<id>"]` may override only what they need; missing tokens intentionally fall back to `:root` (or color-mode overrides).
3. Theme blocks must not unset required tokens.
4. If you add a new shared token to the UI system, define it in `:root` first and then evaluate whether each built-in theme needs an explicit override.

## Theme interaction with color mode

Color mode (`data-color-mode`) is applied at the root level and is expected to keep contrast and readability consistent across editor, presenter, and audience surfaces.

Why theme rules should avoid breaking color mode:

- `data-color-mode="light"` and `data-color-mode="dark"` intentionally override neutral surface and text tokens (`--bg`, `--panel`, `--ink`, etc.).
- A built-in theme should mostly express brand accent and typography choices (`--accent`, `--accent-soft`, fonts), not hard-code light-only or dark-only surfaces.
- If a theme forces surface/text colors inside `:root[data-theme="<id>"]`, it can reduce contrast or defeat user/system dark-mode preferences.

Recommended pattern:

- Put universal defaults in `:root`.
- Keep theme blocks narrow and token-based.
- Put mode-specific surface and readability adjustments in the existing color-mode sections.

## Add a new built-in theme (checklist)

1. Choose a unique, kebab-case theme ID and human-readable label.
   - File: `src/modules/theme.js`
2. Add the new ID to `BUILT_IN_THEME_IDS`.
   - File: `src/modules/theme.js`
3. Add the new `{ id, label }` entry to `BUILT_IN_THEMES`.
   - File: `src/modules/theme.js`
4. Add a CSS override block:
   - Selector: `:root[data-theme="<your-theme-id>"]`
   - File: `styles/app.css`
5. Override only necessary tokens (`--accent`, `--accent-soft`, and optionally fonts or status colors) while preserving root and color-mode fallback behavior.
   - File: `styles/app.css`
6. Update user-facing docs where built-in theme IDs are listed.
   - File: `README.md` (Theming section)
7. Validate before commit:
   - `npm install`
   - `npm test`
   - Manually verify `/`, `/present/`, and `/presenter/` if your CSS change affects rendered presentation behavior.

## Related files

- `src/modules/theme.js`
- `styles/app.css`
- `README.md`
- `STYLES.md`
