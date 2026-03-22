import {
  buildExportBundle,
  buildMhtmlDocument,
  buildOdpPresentation,
  buildOnePageHtml,
  buildSnapshotHtml,
  downloadFile,
} from "../export.js";
import { buildAiAuthoringPrompt, createAiPromptDefaults } from "../ai-prompt.js";
import { assessSlideDensity } from "../a11y.js";
import { updateFrontMatterValue, removeFrontMatterValue } from "../source-format.js";
import { createSyncChannel } from "../sync.js";
import { getSlideTitle } from "../presentation-state.js";
import { applyDeckTheme, BUILT_IN_THEMES } from "../theme.js";
import { addColorModeToggle, buildSupplementalHtml, compileSource, createButton, createDeckFrame, mountSlideInto } from "./shared.js";

async function readCss() {
  const response = await fetch(new URL("../../styles/app.css", import.meta.url));
  return response.text();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createAppView(root, { initialSource, onSourceChange, onResetDeck, onClearLocalData }) {
  let source = initialSource;
  let activeSlideIndex = 0;
  let lastCompiled = null;
  let editorCollapsed = false;
  let outlineCollapsed = false;
  let mobilePane = "editor";
  let aiPromptDefaults = null;
  const sync = createSyncChannel();
  const frame = createDeckFrame("Editor");

  frame.innerHTML += `
    <main class="editor-layout" data-editor-collapsed="false" data-mobile-pane="editor">
      <div class="mobile-pane-tabs" role="tablist" aria-label="Editor workspace panes">
        <button type="button" class="mobile-pane-tabs__button is-current" data-pane="editor" role="tab" aria-selected="true">Edit</button>
        <button type="button" class="mobile-pane-tabs__button" data-pane="preview" role="tab" aria-selected="false">Preview</button>
        <button type="button" class="mobile-pane-tabs__button" data-pane="support" role="tab" aria-selected="false">Support</button>
      </div>
      <section class="panel panel--editor">
        <div class="panel-heading">
          <label class="panel__label" for="source-editor">Markdown source</label>
          <button type="button" id="toggle-editor-panel">Minimize Editor</button>
        </div>
        <p class="local-save-status">Saved locally in this browser on this device. Export to keep a copy elsewhere.</p>
        <textarea id="source-editor" class="editor" spellcheck="false"></textarea>
      </section>
      <section class="panel panel--preview" aria-live="polite">
        <div class="preview-header">
          <div>
            <p class="panel__label">Live preview</p>
            <p id="deck-meta" class="meta-text"></p>
            <p id="layout-warning" class="layout-warning" hidden></p>
          </div>
          <div class="preview-header__actions">
            <label class="theme-control">
              <span>Theme</span>
              <select id="theme-select"></select>
            </label>
            <label class="theme-control theme-control--wide">
              <span>External CSS</span>
              <input id="theme-stylesheet-input" type="url" placeholder="https://example.com/theme.css" />
            </label>
            <button type="button" id="toggle-outline-panel-header">Hide Outline</button>
            <button type="button" id="prev-slide">Previous</button>
            <button type="button" id="next-slide">Next</button>
          </div>
        </div>
        <div class="preview-layout" data-outline-collapsed="false">
          <div id="preview-frame" class="preview-frame"></div>
          <aside class="outline-panel" data-collapsed="false">
            <div class="panel-heading">
              <p class="panel__label">Slide outline</p>
              <button type="button" id="toggle-outline-panel">Hide Outline</button>
            </div>
            <ol id="slide-outline" class="outline-list"></ol>
          </aside>
        </div>
        <aside class="notes-panel">
          <p class="panel__label">Presenter support</p>
          <div id="notes-preview" class="notes-content"></div>
        </aside>
      </section>
    </main>
  `;

  root.replaceChildren(frame);

  const actions = frame.querySelector(".topbar__actions");
  const editor = frame.querySelector("#source-editor");
  const previewFrame = frame.querySelector("#preview-frame");
  const notesPreview = frame.querySelector("#notes-preview");
  const deckMeta = frame.querySelector("#deck-meta");
  const layoutWarning = frame.querySelector("#layout-warning");
  const outlineNode = frame.querySelector("#slide-outline");
  const themeSelect = frame.querySelector("#theme-select");
  const themeStylesheetInput = frame.querySelector("#theme-stylesheet-input");
  const editorLayout = frame.querySelector(".editor-layout");
  const previewLayout = frame.querySelector(".preview-layout");
  const outlinePanel = frame.querySelector(".outline-panel");
  const mobilePaneButtons = [...frame.querySelectorAll(".mobile-pane-tabs__button")];
  const toggleEditorPanelButton = frame.querySelector("#toggle-editor-panel");
  const toggleOutlinePanelButton = frame.querySelector("#toggle-outline-panel");
  const toggleOutlinePanelHeaderButton = frame.querySelector("#toggle-outline-panel-header");

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".md,.json,text/markdown,application/json";
  importInput.hidden = true;

  const presentButton = createButton("Audience View");
  const presenterButton = createButton("Presenter View");
  const aiPromptButton = createButton("AI Prompt");
  const helpButton = createButton("Help");
  const exportBundleButton = createButton("Export");
  const onePageButton = createButton("1 Page View");
  const advancedToggle = createButton("Advanced");
  advancedToggle.setAttribute("aria-haspopup", "true");
  advancedToggle.setAttribute("aria-expanded", "false");

  const advancedMenu = document.createElement("div");
  advancedMenu.className = "advanced-menu";
  advancedMenu.hidden = true;
  advancedMenu.innerHTML = `
    <div class="advanced-menu__panel">
      <button type="button" id="advanced-import-source">Import Source</button>
      <button type="button" id="advanced-email-deck">Email Deck</button>
      <button type="button" id="advanced-reset-deck">Reset Local Deck</button>
      <button type="button" id="advanced-clear-data">Clear Local App Data</button>
    </div>
  `;

  actions.append(
    presentButton,
    presenterButton,
    aiPromptButton,
    helpButton,
    exportBundleButton,
    onePageButton,
    advancedToggle,
    advancedMenu,
    importInput,
  );
  addColorModeToggle(actions);

  const advancedImportButton = advancedMenu.querySelector("#advanced-import-source");
  const advancedEmailDeckButton = advancedMenu.querySelector("#advanced-email-deck");
  const advancedResetDeckButton = advancedMenu.querySelector("#advanced-reset-deck");
  const advancedClearDataButton = advancedMenu.querySelector("#advanced-clear-data");

  const helpDialog = document.createElement("dialog");
  helpDialog.className = "help-dialog";
  helpDialog.innerHTML = `
    <form method="dialog" class="help-dialog__inner">
      <div class="help-dialog__header">
        <div>
          <p class="panel__label">How this editor works</p>
          <h2>Editing, saving, and exporting</h2>
        </div>
        <button type="submit">Close</button>
      </div>
      <div class="help-dialog__content">
        <p>This editor is local-first. Your deck is automatically saved in this browser on this device as you work.</p>
        <p>That means your work is not saved to a Google-style cloud account by default. If you switch browsers, clear browser storage, or move to another device, your local saved deck will not come with you unless you export it.</p>
        <p>Use <strong>Export</strong> to download a ZIP that contains your editable Markdown deck, a machine-readable JSON version, and a portable HTML presentation. Use <strong>Import Source</strong> to reopen a previously exported Markdown or JSON deck in this editor.</p>
        <p>Lower-frequency tools such as import and <strong>Email Deck</strong> are grouped under <strong>Advanced</strong>. Email Deck is especially useful on a phone when you want to move a draft to a desktop quickly.</p>
        <p>On smaller screens, use the <strong>Edit</strong>, <strong>Preview</strong>, and <strong>Support</strong> tabs to switch panes without the editor feeling cramped.</p>
        <p>Audience View opens the clean presentation surface. Presenter View opens notes, timing, next-slide support, and shared text zoom controls in a second window.</p>
      </div>
    </form>
  `;
  frame.append(helpDialog);

  const aiPromptDialog = document.createElement("dialog");
  aiPromptDialog.className = "help-dialog ai-prompt-dialog";
  aiPromptDialog.innerHTML = `
    <form method="dialog" class="help-dialog__inner ai-prompt-dialog__inner">
      <div class="help-dialog__header">
        <div>
          <p class="panel__label">AI prompt generator</p>
          <h2>Build a briefing prompt for an LLM</h2>
        </div>
        <button type="submit">Close</button>
      </div>
      <div class="ai-prompt-layout">
        <div class="ai-prompt-fields">
          <label class="theme-control">
            <span>Title</span>
            <input id="ai-prompt-title" type="text" />
          </label>
          <label class="theme-control">
            <span>Presenters</span>
            <input id="ai-prompt-presenters" type="text" />
          </label>
          <label class="theme-control">
            <span>Duration (min)</span>
            <input id="ai-prompt-duration" type="number" min="1" step="1" />
          </label>
          <label class="theme-control">
            <span>Audience</span>
            <input id="ai-prompt-audience" type="text" placeholder="Who is this for?" />
          </label>
          <label class="theme-control">
            <span>Purpose</span>
            <input id="ai-prompt-purpose" type="text" placeholder="What should this talk achieve?" />
          </label>
          <label class="theme-control">
            <span>Tone</span>
            <input id="ai-prompt-tone" type="text" placeholder="Credible, practical, warm..." />
          </label>
          <label class="theme-control">
            <span>Call to action</span>
            <input id="ai-prompt-cta" type="text" placeholder="Optional" />
          </label>
          <label class="theme-control theme-control--wide">
            <span>Topics</span>
            <textarea id="ai-prompt-topics" class="ai-prompt-textarea" rows="5"></textarea>
          </label>
          <label class="theme-control theme-control--wide">
            <span>References</span>
            <textarea id="ai-prompt-references" class="ai-prompt-textarea" rows="5"></textarea>
          </label>
          <div class="ai-prompt-options">
            <label><input id="ai-prompt-title-slide" type="checkbox" /> Include title slide</label>
            <label><input id="ai-prompt-closing-slide" type="checkbox" /> Include closing slide</label>
            <label><input id="ai-prompt-notes" type="checkbox" /> Include notes</label>
            <label><input id="ai-prompt-resources" type="checkbox" /> Include resources</label>
            <label><input id="ai-prompt-script" type="checkbox" /> Include script</label>
          </div>
        </div>
        <div class="ai-prompt-output">
          <div class="panel-heading">
            <p class="panel__label">Generated prompt</p>
            <button type="button" id="copy-ai-prompt">Copy Prompt</button>
          </div>
          <textarea id="ai-prompt-output" class="editor ai-prompt-output__field" spellcheck="false"></textarea>
          <p id="ai-prompt-status" class="meta-text"></p>
        </div>
      </div>
    </form>
  `;
  frame.append(aiPromptDialog);

  const aiPromptFields = {
    title: aiPromptDialog.querySelector("#ai-prompt-title"),
    presenters: aiPromptDialog.querySelector("#ai-prompt-presenters"),
    durationMinutes: aiPromptDialog.querySelector("#ai-prompt-duration"),
    audience: aiPromptDialog.querySelector("#ai-prompt-audience"),
    purpose: aiPromptDialog.querySelector("#ai-prompt-purpose"),
    tone: aiPromptDialog.querySelector("#ai-prompt-tone"),
    callToAction: aiPromptDialog.querySelector("#ai-prompt-cta"),
    topics: aiPromptDialog.querySelector("#ai-prompt-topics"),
    references: aiPromptDialog.querySelector("#ai-prompt-references"),
    includeTitleSlide: aiPromptDialog.querySelector("#ai-prompt-title-slide"),
    includeClosingSlide: aiPromptDialog.querySelector("#ai-prompt-closing-slide"),
    includeNotes: aiPromptDialog.querySelector("#ai-prompt-notes"),
    includeResources: aiPromptDialog.querySelector("#ai-prompt-resources"),
    includeScript: aiPromptDialog.querySelector("#ai-prompt-script"),
  };
  const aiPromptOutput = aiPromptDialog.querySelector("#ai-prompt-output");
  const aiPromptStatus = aiPromptDialog.querySelector("#ai-prompt-status");
  const copyAiPromptButton = aiPromptDialog.querySelector("#copy-ai-prompt");

  themeSelect.innerHTML = BUILT_IN_THEMES.map(
    (theme) => `<option value="${theme.id}">${theme.label}</option>`,
  ).join("");

  function setSource(nextSource) {
    source = nextSource;
    editor.value = nextSource;
    onSourceChange(nextSource);
    render();
  }

  function applyPanelState() {
    editorLayout.dataset.editorCollapsed = String(editorCollapsed);
    editorLayout.dataset.mobilePane = mobilePane;
    previewLayout.dataset.outlineCollapsed = String(outlineCollapsed);
    outlinePanel.dataset.collapsed = String(outlineCollapsed);
    outlinePanel.hidden = outlineCollapsed;
    toggleEditorPanelButton.textContent = editorCollapsed ? "Expand Editor" : "Minimize Editor";
    toggleOutlinePanelButton.textContent = outlineCollapsed ? "Show Outline" : "Hide Outline";
    toggleOutlinePanelHeaderButton.textContent = outlineCollapsed ? "Show Outline" : "Hide Outline";
    mobilePaneButtons.forEach((button) => {
      const isCurrent = button.dataset.pane === mobilePane;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-selected", String(isCurrent));
    });
  }

  function publishState(compiled) {
    applyDeckTheme(compiled.metadata);
    aiPromptDefaults = createAiPromptDefaults(compiled);
    sync.postMessage({
      type: "deck-updated",
      source,
      activeSlideIndex,
      revealStep: compiled.renderedSlides[activeSlideIndex]?.stepCount || 0,
      timestamp: Date.now(),
    });

    const slide = compiled.renderedSlides[activeSlideIndex] || compiled.renderedSlides[0];
    activeSlideIndex = slide?.index || 0;
    deckMeta.textContent = compiled.renderedSlides.length
      ? `${compiled.metadata.title || "Untitled deck"} · Slide ${activeSlideIndex + 1} of ${compiled.renderedSlides.length}`
      : `${compiled.metadata.title || "Untitled deck"} · No slides`;
    themeSelect.value = compiled.metadata.theme || "default-high-contrast";
    themeStylesheetInput.value = compiled.metadata.themeStylesheet || "";
    const fitResult = mountSlideInto(previewFrame, slide);
    notesPreview.innerHTML = buildSupplementalHtml(slide);
    const currentSlideWarnings = compiled.issues.filter(
      (issue) => issue.slide === activeSlideIndex + 1 && issue.level === "warning" && issue.category === "layout",
    );
    if (fitResult?.overflow || currentSlideWarnings.length) {
      layoutWarning.hidden = false;
      layoutWarning.textContent = fitResult?.overflow
        ? "This slide still overflows the target presentation frame. Shorten the visible copy or split it into more slides."
        : currentSlideWarnings[0].message;
    } else {
      layoutWarning.hidden = true;
      layoutWarning.textContent = "";
    }
    outlineNode.innerHTML = compiled.renderedSlides
      .map((renderedSlide, index) => {
        const currentClass = index === activeSlideIndex ? ' class="is-current"' : "";
        const density = assessSlideDensity(compiled.slides?.[index]);
        const densityBadge = density.level === "comfortable"
          ? ""
          : `<span class="outline-density outline-density--${density.level}" aria-hidden="true">${density.label}</span>`;
        const densitySummary = density.level === "comfortable"
          ? ""
          : ` · ${density.label} slide`;
        return `<li${currentClass}><button type="button" data-slide-index="${index}" aria-label="${escapeHtml(`${getSlideTitle(renderedSlide, index)}${densitySummary}`)}"><span class="outline-title">${escapeHtml(getSlideTitle(renderedSlide, index))}</span>${densityBadge}</button></li>`;
      })
      .join("");
  }

  function render() {
    lastCompiled = compileSource(source);
    publishState(lastCompiled);
  }

  function setAiPromptFormValues(values) {
    aiPromptFields.title.value = values.title || "";
    aiPromptFields.presenters.value = values.presenters || "";
    aiPromptFields.durationMinutes.value = values.durationMinutes || "";
    aiPromptFields.audience.value = values.audience || "";
    aiPromptFields.purpose.value = values.purpose || "";
    aiPromptFields.tone.value = values.tone || "";
    aiPromptFields.callToAction.value = values.callToAction || "";
    aiPromptFields.topics.value = (values.topics || []).join("\n");
    aiPromptFields.references.value = (values.references || []).join("\n");
    aiPromptFields.includeTitleSlide.checked = Boolean(values.includeTitleSlide);
    aiPromptFields.includeClosingSlide.checked = Boolean(values.includeClosingSlide);
    aiPromptFields.includeNotes.checked = Boolean(values.includeNotes);
    aiPromptFields.includeResources.checked = Boolean(values.includeResources);
    aiPromptFields.includeScript.checked = Boolean(values.includeScript);
  }

  function readAiPromptFormValues() {
    return {
      title: aiPromptFields.title.value.trim(),
      presenters: aiPromptFields.presenters.value.trim(),
      durationMinutes: aiPromptFields.durationMinutes.value.trim(),
      audience: aiPromptFields.audience.value.trim(),
      purpose: aiPromptFields.purpose.value.trim(),
      tone: aiPromptFields.tone.value.trim(),
      callToAction: aiPromptFields.callToAction.value.trim(),
      topics: aiPromptFields.topics.value,
      references: aiPromptFields.references.value,
      includeTitleSlide: aiPromptFields.includeTitleSlide.checked,
      includeClosingSlide: aiPromptFields.includeClosingSlide.checked,
      includeNotes: aiPromptFields.includeNotes.checked,
      includeResources: aiPromptFields.includeResources.checked,
      includeScript: aiPromptFields.includeScript.checked,
    };
  }

  function refreshAiPromptOutput() {
    aiPromptOutput.value = buildAiAuthoringPrompt(readAiPromptFormValues());
    aiPromptStatus.textContent = "Copy this prompt into Ollama or another LLM, then paste the returned deck Markdown back into this editor.";
  }

  editor.value = source;
  applyPanelState();
  render();

  editor.addEventListener("input", () => {
    source = editor.value;
    onSourceChange(source);
    render();
  });

  themeSelect.addEventListener("change", () => {
    const nextSource = updateFrontMatterValue(source, "theme", themeSelect.value);
    setSource(nextSource);
  });

  themeStylesheetInput.addEventListener("change", () => {
    const value = themeStylesheetInput.value.trim();
    const nextSource = value
      ? updateFrontMatterValue(source, "themeStylesheet", value)
      : removeFrontMatterValue(source, "themeStylesheet");
    setSource(nextSource);
  });

  toggleEditorPanelButton.addEventListener("click", () => {
    editorCollapsed = !editorCollapsed;
    applyPanelState();
  });

  toggleOutlinePanelButton.addEventListener("click", () => {
    outlineCollapsed = !outlineCollapsed;
    applyPanelState();
  });

  toggleOutlinePanelHeaderButton.addEventListener("click", () => {
    outlineCollapsed = !outlineCollapsed;
    applyPanelState();
  });

  mobilePaneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mobilePane = button.dataset.pane || "editor";
      applyPanelState();
    });
  });

  frame.querySelector("#prev-slide").addEventListener("click", () => {
    activeSlideIndex = Math.max(0, activeSlideIndex - 1);
    render();
  });

  frame.querySelector("#next-slide").addEventListener("click", () => {
    const compiled = compileSource(source);
    activeSlideIndex = Math.min(compiled.renderedSlides.length - 1, activeSlideIndex + 1);
    publishState(compiled);
  });

  outlineNode.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-slide-index]");
    if (!button) return;
    activeSlideIndex = Number.parseInt(button.dataset.slideIndex, 10) || 0;
    render();
  });

  presentButton.addEventListener("click", () => {
    window.open("./present/", "_blank", "noopener,noreferrer");
  });

  presenterButton.addEventListener("click", () => {
    window.open("./presenter/", "_blank", "noopener,noreferrer");
  });

  aiPromptButton.addEventListener("click", () => {
    setAiPromptFormValues(aiPromptDefaults || createAiPromptDefaults(lastCompiled || {}));
    refreshAiPromptOutput();
    aiPromptDialog.showModal();
  });

  helpButton.addEventListener("click", () => {
    helpDialog.showModal();
  });

  Object.values(aiPromptFields).forEach((field) => {
    field.addEventListener("input", refreshAiPromptOutput);
    field.addEventListener("change", refreshAiPromptOutput);
  });

  copyAiPromptButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(aiPromptOutput.value);
      aiPromptStatus.textContent = "Prompt copied to the clipboard.";
    } catch {
      aiPromptOutput.focus();
      aiPromptOutput.select();
      aiPromptStatus.textContent = "Clipboard access was not available. The prompt is selected so you can copy it manually.";
    }
  });

  exportBundleButton.addEventListener("click", async () => {
    const cssText = await readCss();
    const html = buildSnapshotHtml({
      title: lastCompiled?.metadata.title || "Slide deck snapshot",
      cssText,
      renderedSlides: lastCompiled?.renderedSlides || [],
      metadata: lastCompiled?.metadata || {},
      source,
    });
    const deckJson = JSON.stringify(
      {
        metadata: lastCompiled?.metadata || {},
        slides: lastCompiled?.slides || [],
        source,
      },
      null,
      2,
    );
    const onePageHtml = buildOnePageHtml({
      title: lastCompiled?.metadata.title || "Slide deck one-page view",
      cssText,
      renderedSlides: lastCompiled?.renderedSlides || [],
      metadata: lastCompiled?.metadata || {},
    });
    const bundle = buildExportBundle({
      markdownSource: source,
      snapshotHtml: html,
      deckJson,
      odpBytes: buildOdpPresentation({
        title: lastCompiled?.metadata.title || "Slide deck",
        renderedSlides: lastCompiled?.renderedSlides || [],
        metadata: lastCompiled?.metadata || {},
      }),
      onePageMhtml: buildMhtmlDocument({
        title: lastCompiled?.metadata.title || "Slide deck one-page view",
        html: onePageHtml,
      }),
    });
    downloadFile("deck-export.zip", bundle, "application/zip");
  });

  onePageButton.addEventListener("click", async () => {
    const cssText = await readCss();
    const html = buildOnePageHtml({
      title: lastCompiled?.metadata.title || "Slide deck snapshot",
      cssText,
      renderedSlides: lastCompiled?.renderedSlides || [],
      metadata: lastCompiled?.metadata || {},
    });
    downloadFile("deck-one-page.html", html, "text/html;charset=utf-8");
  });

  advancedImportButton.addEventListener("click", () => {
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    importInput.click();
  });

  advancedEmailDeckButton.addEventListener("click", () => {
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    const deckTitle = lastCompiled?.metadata?.title || "Markdown slide deck";
    const editorUrl = new URL(window.location.href);
    editorUrl.pathname = editorUrl.pathname.replace(/\/present(er)?\/?$/, "/");
    editorUrl.search = "";
    editorUrl.hash = "";
    const intro = [
      `Deck: ${deckTitle}`,
      `Editor URL: ${editorUrl.toString()}`,
      "",
      "This draft is stored locally in the browser on this device.",
      "If the full source is not included below, use Export on this device and attach the ZIP or Markdown file.",
      "",
    ].join("\n");
    const maxBodyLength = 6000;
    const body = source.length <= maxBodyLength
      ? `${intro}${source}`
      : `${intro}The deck source is too long to include safely in a mail draft.`;
    const mailto = `mailto:?subject=${encodeURIComponent(deckTitle)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });

  advancedResetDeckButton.addEventListener("click", async () => {
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    const confirmed = window.confirm(
      "Reset the locally saved deck and restore the default starter deck for this browser?",
    );
    if (!confirmed) return;
    await onResetDeck();
    window.location.reload();
  });

  advancedClearDataButton.addEventListener("click", async () => {
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    const confirmed = window.confirm(
      "Clear all locally stored app data for this browser and reload the editor?",
    );
    if (!confirmed) return;
    await onClearLocalData();
    window.location.reload();
  });

  advancedToggle.addEventListener("click", () => {
    const isOpening = advancedMenu.hidden;
    advancedMenu.hidden = !isOpening;
    advancedToggle.setAttribute("aria-expanded", String(isOpening));
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      const parsed = JSON.parse(text);
      source = parsed.source || source;
    } else {
      source = text;
    }
    editor.value = source;
    onSourceChange(source);
    render();
  });

  document.addEventListener("click", (event) => {
    if (advancedMenu.hidden) return;
    if (advancedMenu.contains(event.target) || advancedToggle.contains(event.target)) return;
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
  });
}
