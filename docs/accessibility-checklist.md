# Accessibility Checklist

This project treats these checks as required validation targets for slide content and runtime behavior.

This checklist is informed by project goals, WCAG guidance, and the Intopia article "How To Create More Accessible Presentations."

## Slide structure

- Each slide must contain exactly one level-one heading.
- Heading levels must not skip levels within a slide.
- Use semantic headings, not styled paragraph text or generic containers.
- Use real ordered and unordered lists for grouped items.
- Avoid layout tables.
- Speaker notes must be separated from visible slide content.
- Each slide should stay focused on one key idea.
- Slide titles should be unique and meaningful for navigation and orientation.
- Slides should contain the core idea needed by the audience.
- Notes should expand on a slide, not carry essential meaning that exists nowhere else.

## Links and media

- Link text must describe the destination or action.
- Images must include alternative text.
- Embedded content must preserve logical reading order.
- Complex visuals such as charts and diagrams should include a short on-slide summary and fuller notes for presentation delivery.
- Videos should include captions and, where needed, audio description.

## Visual presentation

- Themes must maintain at least 4.5:1 contrast for normal text.
- Non-text visual elements should maintain at least 3:1 contrast where applicable.
- Focus states must remain visible in editor and presentation views.
- Motion must respect `prefers-reduced-motion`.
- Do not rely on colour alone to convey meaning.
- New or updated themes must preserve contrast targets and must not depend on color-only meaning for status or emphasis.
- Prefer large, readable text and avoid all-caps blocks, excessive italics, and crowded layouts.
- Avoid placing important content too low on the slide where it may be obscured in a room.
- Motion should be minimized by default.
- Avoid parallax effects, 3D transitions, and decorative animation styles that distract from content.

## Interaction

- All presentation controls must work with a keyboard alone.
- Auto-advancing slides should be avoided.
- Presenter tools must not trap focus.
- Slide transitions and decorative animations should be avoided or disabled by default.

## Validation

- Run the editor accessibility check before export.
- Inspect the rendered DOM and confirm the output uses logical heading structure rather than generic container-only markup.
- Confirm slides are not rendered as "div soup" when semantic elements are appropriate.
- Confirm ARIA roles are not being added unnecessarily or misused.
- Run Sa11y against the rendered deck during manual review when a browser-accessible deck is available.
- Add automated `axe` and `pa11y` checks once CI is in place.
- Review exported HTML against WCAG references before publishing.
- Review speaker notes to ensure meaningful visuals and slide text are also described in the spoken delivery.
- Review speaker notes to ensure they support delivery without becoming a crutch for essential audience content.
- Prefer sharing presentations in accessible HTML or another verified accessible format.
