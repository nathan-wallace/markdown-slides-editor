import { createSyncChannel } from "../sync.js";
import {
  getNextPosition,
  getPresentationDurationMinutes,
  getPreviousPosition,
  getSlideTitle,
} from "../presentation-state.js";
import { applyDeckTheme } from "../theme.js";
import { compileSource, createButton, createDeckFrame, mountSlideInto } from "./shared.js";

function formatElapsed(startTime) {
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const seconds = String(elapsedSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function createPresenterView(root, initialSource) {
  let source = initialSource;
  let activeSlideIndex = 0;
  let revealStep = 0;
  const startedAt = Date.now();
  const sync = createSyncChannel();
  const frame = createDeckFrame("Presenter View");

  frame.innerHTML += `
    <main class="presenter-layout">
      <section class="presenter-column">
        <p class="panel__label">Current slide</p>
        <div id="presenter-current" class="preview-frame preview-frame--compact"></div>
      </section>
      <section class="presenter-column">
        <p class="panel__label">Next slide</p>
        <div id="presenter-next" class="preview-frame preview-frame--compact"></div>
      </section>
      <aside class="presenter-sidebar">
        <div class="presenter-sidebar__block">
          <p class="panel__label">Timer</p>
          <p id="presenter-timer" class="timer">00:00</p>
          <p id="presenter-remaining" class="meta-text"></p>
          <div class="presenter-timer-controls">
            <button type="button" id="presenter-reset-timer">Reset</button>
          </div>
        </div>
        <div class="presenter-sidebar__block">
          <p class="panel__label">Outline</p>
          <ol id="presenter-outline" class="outline-list"></ol>
        </div>
        <div class="presenter-sidebar__block">
          <p class="panel__label">Notes</p>
          <div id="presenter-notes" class="notes-content"></div>
        </div>
      </aside>
    </main>
  `;

  root.replaceChildren(frame);

  const actions = frame.querySelector(".topbar__actions");
  const currentFrame = frame.querySelector("#presenter-current");
  const nextFrame = frame.querySelector("#presenter-next");
  const notesNode = frame.querySelector("#presenter-notes");
  const timerNode = frame.querySelector("#presenter-timer");
  const remainingNode = frame.querySelector("#presenter-remaining");
  const outlineNode = frame.querySelector("#presenter-outline");
  const resetTimerButton = frame.querySelector("#presenter-reset-timer");
  const previousButton = createButton("Previous");
  const nextButton = createButton("Next");
  actions.append(previousButton, nextButton);
  let timerStart = startedAt;
  let lastDurationMinutes = 30;
  let compiled = compileSource(source);

  function publishState() {
    sync.postMessage({
      type: "slide-changed",
      activeSlideIndex,
      revealStep,
      source,
      timestamp: Date.now(),
    });
  }

  function render() {
    compiled = compileSource(source);
    applyDeckTheme(compiled.metadata);
    const currentSlide = compiled.renderedSlides[activeSlideIndex] || compiled.renderedSlides[0];
    const nextSlide = compiled.renderedSlides[activeSlideIndex + 1];
    lastDurationMinutes = getPresentationDurationMinutes(compiled.metadata);
    mountSlideInto(currentFrame, currentSlide, { revealStep });
    nextFrame.innerHTML = nextSlide
      ? `<article class="slide-card slide-card--next"><div class="slide-card__content">${nextSlide.html}</div></article>`
      : `<article class="slide-card slide-card--next empty-state"><p>No next slide.</p></article>`;
    notesNode.innerHTML = currentSlide?.notesHtml || "<p>No speaker notes for this slide.</p>";
    outlineNode.innerHTML = compiled.renderedSlides
      .map((renderedSlide, index) => {
        const currentClass = index === activeSlideIndex ? ' class="is-current"' : "";
        return `<li${currentClass}><button type="button" data-slide-index="${index}">${getSlideTitle(renderedSlide, index)}</button></li>`;
      })
      .join("");

    const elapsedSeconds = Math.floor((Date.now() - timerStart) / 1000);
    const remainingSeconds = Math.max(0, lastDurationMinutes * 60 - elapsedSeconds);
    remainingNode.textContent = `Remaining ${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  }

  function move(delta) {
    compiled = compileSource(source);
    const nextPosition =
      delta > 0
        ? getNextPosition(compiled, activeSlideIndex, revealStep)
        : getPreviousPosition(compiled, activeSlideIndex, revealStep);
    activeSlideIndex = nextPosition.activeSlideIndex;
    revealStep = nextPosition.revealStep;
    render();
    publishState();
  }

  sync.subscribe((message) => {
    if (message.source) {
      source = message.source;
    }
    if (typeof message.activeSlideIndex === "number") {
      activeSlideIndex = message.activeSlideIndex;
    }
    if (typeof message.revealStep === "number") {
      revealStep = message.revealStep;
    }
    render();
  });

  previousButton.addEventListener("click", () => move(-1));
  nextButton.addEventListener("click", () => move(1));

  nextFrame.addEventListener("click", () => {
    if (compiled.renderedSlides[activeSlideIndex + 1]) {
      activeSlideIndex += 1;
      revealStep = 0;
      render();
      publishState();
    }
  });

  outlineNode.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-slide-index]");
    if (!button) return;
    activeSlideIndex = Number.parseInt(button.dataset.slideIndex, 10) || 0;
    revealStep = 0;
    render();
    publishState();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      move(1);
    }

    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      move(-1);
    }
  });

  window.setInterval(() => {
    timerNode.textContent = formatElapsed(timerStart);
    const elapsedSeconds = Math.floor((Date.now() - timerStart) / 1000);
    const remainingSeconds = Math.max(0, lastDurationMinutes * 60 - elapsedSeconds);
    remainingNode.textContent = `Remaining ${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  }, 1000);

  resetTimerButton.addEventListener("click", () => {
    timerStart = Date.now();
    timerNode.textContent = formatElapsed(timerStart);
    render();
  });

  timerNode.textContent = formatElapsed(timerStart);
  render();
  publishState();
}
