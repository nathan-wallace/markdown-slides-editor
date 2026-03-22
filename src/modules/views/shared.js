import { parseSource } from "../parser.js";
import { renderDeck } from "../render.js";
import { lintDeck } from "../a11y.js";
import { attachColorModeToggle } from "../color-mode.js";
import { createRevealState } from "../presentation-state.js";

export function compileSource(source) {
  const deck = parseSource(source);
  const renderedDeck = renderDeck(deck);
  const issues = lintDeck(deck, renderedDeck.renderedSlides);
  return {
    ...renderedDeck,
    issues,
  };
}

export function createDeckFrame(title) {
  const frame = document.createElement("div");
  frame.className = "app-shell";
  frame.innerHTML = `
    <header class="topbar">
      <div>
        <p class="eyebrow">Markdown Slides Editor</p>
        <h1>${title}</h1>
      </div>
      <div class="topbar__actions"></div>
    </header>
  `;
  return frame;
}

export function createButton(label, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (title) button.title = title;
  return button;
}

export function addColorModeToggle(actionsNode) {
  const button = createButton("Dark mode");
  button.className = "color-mode-toggle";
  attachColorModeToggle(button);
  actionsNode.append(button);
  return button;
}

export function buildSupplementalHtml(renderedSlide, emptyMessage = "No speaker notes for this slide.") {
  if (!renderedSlide) return `<p>${emptyMessage}</p>`;

  const sections = [
    renderedSlide.notesHtml
      ? `<section class="support-section"><h2>Notes</h2>${renderedSlide.notesHtml}</section>`
      : "",
    renderedSlide.resourcesHtml
      ? `<section class="support-section"><h2>Resources</h2>${renderedSlide.resourcesHtml}</section>`
      : "",
    renderedSlide.scriptHtml
      ? `<section class="support-section"><h2>Script</h2>${renderedSlide.scriptHtml}</section>`
      : "",
  ].filter(Boolean);

  return sections.join("") || `<p>${emptyMessage}</p>`;
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function applyRevealState(container, revealStep) {
  const progressiveItems = [...container.querySelectorAll("li.next")];
  progressiveItems.forEach((item, index) => {
    const isVisible = index < revealStep;
    const isCurrent = index === revealStep - 1;
    item.hidden = !isVisible;
    item.classList.toggle("visited", index < revealStep - 1);
    item.classList.toggle("active", isCurrent);
  });
}

export function mountSlideInto(container, renderedSlide, options = {}) {
  if (!renderedSlide) {
    container.innerHTML = `
      <article class="slide-card empty-state">
        <div class="slide-card__content">
          <h1>No slides yet</h1>
          <p>Add a slide with a level-one heading to start the deck.</p>
        </div>
      </article>
    `;
    return;
  }

  const { revealStep = renderedSlide.stepCount || 0, includeLabel = true } = options;
  const title = renderedSlide.headings.find((heading) => heading.level === 1)?.text || "Slide preview";
  const slideClass = renderedSlide.kind === "title" ? "slide-card slide-card--title" : "slide-card";

  container.innerHTML = `
    <article class="${slideClass}"${includeLabel ? ` aria-label="${escapeAttribute(title)}"` : ""}>
      <div class="slide-card__content">
        ${renderedSlide.html}
      </div>
    </article>
  `;

  const revealState = createRevealState(renderedSlide, revealStep);
  applyRevealState(container, revealState.revealStep);
}
