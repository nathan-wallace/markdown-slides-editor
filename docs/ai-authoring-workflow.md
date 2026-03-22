# AI Authoring Workflow

This project can work well with an LLM, but the editor should remain the place where a deck is reviewed, refined, and prepared for presentation.

The goal is not to hand control to AI. The goal is to use AI to speed up research, structure, drafting, and script development while keeping the author in charge of quality, accuracy, accessibility, and tone.

## Purpose

Use an LLM to help with:

- shaping a talk outline
- expanding ideas into slides
- drafting presenter notes
- drafting a fuller script
- organizing references and follow-up resources
- revising a deck to better fit a target time or audience

Use this editor to:

- review the actual slide flow
- validate the visible content
- refine notes, resources, and script
- check whether the talk matches the time available
- confirm the deck is something you would be comfortable presenting

## Recommended workflow

1. Gather the presentation brief.
2. Give the LLM a structured prompt.
3. Ask the LLM to return output in this editor's Markdown slide format.
4. Paste the returned Markdown into this editor.
5. Review the deck in preview, audience, and presenter views.
6. Revise the visible slides, notes, references, and script until the deck feels trustworthy and presentable.

## Presentation brief

Before asking an LLM to draft slides, collect:

- presentation title
- presenter name or names
- target duration in minutes
- audience
- purpose of the talk
- core topics to cover
- references or source material
- desired tone
- desired call to action
- whether to include a title slide
- whether to include a closing slide
- whether to include presenter notes
- whether to include a fuller script
- whether to include follow-up resources

## Prompt design principles

- Always tell the LLM how long the talk should be.
- Always tell the LLM who is presenting and to whom.
- Always provide the references that should shape the talk.
- Always tell the LLM to return Markdown in this project's source format.
- Ask for concise visible slides and fuller detail in `Note:` or `Script:`.
- Ask the LLM to avoid putting essential meaning only in notes.
- Ask the LLM to use semantic headings and real lists.
- Ask the LLM to produce a deck you can review and edit, not a final answer that should be trusted without inspection.

## Recommended prompt template

```md
# Presentation drafting request

Create a presentation in the Markdown slide format described below.

## Presentation brief

- Title: [presentation title]
- Presenters: [speaker names]
- Duration: [number] minutes
- Audience: [intended audience]
- Purpose: [what the talk should achieve]
- Topics to cover:
  - [topic one]
  - [topic two]
  - [topic three]
- Desired tone: [tone]
- Call to action: [optional call to action]

## References

- [reference one]
- [reference two]
- [reference three]

## Output requirements

- Return valid Markdown for this slide editor.
- Include front matter.
- Set `durationMinutes`.
- Use `titleSlide: true` unless there is a reason not to.
- Include `speakers`.
- Include a `closingSlide: true` final slide for questions and follow-up.
- Keep visible slides concise and scannable.
- Put delivery detail in `Note:`.
- Include `Resources:` where references or follow-up links are helpful.
- Include `Script:` when a fuller spoken version is useful.
- Use one H1 per slide.
- Do not skip heading levels.
- Use real Markdown lists.
- Do not use layout tables.
- Do not put essential meaning only in speaker notes.

## Markdown slide format

```md
---
title: [presentation title]
durationMinutes: [minutes]
titleSlide: true
speakers: [speaker names]
closingSlide: true
closingTitle: Questions?
---

# Slide title

Visible audience-facing content.

Note:
Presenter notes.

Resources:
- [Reference link](https://example.com)

Script:
Optional fuller spoken script.

---

# Next slide
```

## Response expectations

- Return only the deck Markdown unless I ask for commentary.
- Make the deck suitable for review and revision in the editor.
- If information is missing, make reasonable assumptions and label them in notes or resources.
```

## Review checklist after pasting into the editor

After bringing LLM output into the editor, review:

- whether the visible slides are concise enough
- whether the slide order makes sense
- whether the timing feels realistic
- whether the title and closing slides are useful
- whether references are accurate and sufficient
- whether the script sounds like the real presenter
- whether the notes support delivery without becoming a crutch
- whether the slides remain understandable without relying on hidden content
- whether the deck feels credible enough to present in production

## Accessibility guardrails for AI-generated content

AI-assisted decks should still follow this project's accessibility expectations:

- one H1 per slide
- no skipped heading levels
- meaningful link text
- alt text for images
- concise visible content
- minimal motion
- speaker notes used for support, not as the only location for important meaning
- script and references used to improve clarity and access, not to hide essential context

## Future prompt generator

This document can serve as the basis for a future in-app prompt generator page.

That page could:

- ask guided questions about title, speakers, time, audience, topics, and references
- generate a reusable prompt in Markdown
- remind the author what makes a strong deck brief
- make it easier to send a structured request to Ollama or another LLM
- help the author paste the resulting Markdown back into this editor for review

The editor should remain the place where the deck is checked, refined, and prepared for actual presentation.
