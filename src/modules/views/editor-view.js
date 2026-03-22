import { buildExportBundle, buildSnapshotHtml, downloadFile } from "../export.js";
import { updateFrontMatterValue, removeFrontMatterValue } from "../source-format.js";
import { createSyncChannel } from "../sync.js";
import { getSlideTitle } from "../presentation-state.js";
import { applyDeckTheme, BUILT_IN_THEMES } from "../theme.js";
import { addColorModeToggle, buildSupplementalHtml, compileSource, createButton, createDeckFrame, mountSlideInto } from "./shared.js";

async function readCss() {
  const response = await fetch(new URL("../../styles/app.css", import.meta.url));
  return response.text();
}

export function createAppView(root, { initialSource, onSourceChange, onResetDeck, onClearLocalData }) {
  let source = initialSource;
  let activeSlideIndex = 0;
  let lastCompiled = null;
  let editorCollapsed = false;
  let outlineCollapsed = false;
  const sync = createSyncChannel();
  const frame = createDeckFrame("Editor");

  frame.innerHTML += `
    <main class="editor-layout" data-editor-collapsed="false">
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
  const outlineNode = frame.querySelector("#slide-outline");
  const themeSelect = frame.querySelector("#theme-select");
  const themeStylesheetInput = frame.querySelector("#theme-stylesheet-input");
  const editorLayout = frame.querySelector(".editor-layout");
  const previewLayout = frame.querySelector(".preview-layout");
  const outlinePanel = frame.querySelector(".outline-panel");
  const toggleEditorPanelButton = frame.querySelector("#toggle-editor-panel");
  const toggleOutlinePanelButton = frame.querySelector("#toggle-outline-panel");
  const toggleOutlinePanelHeaderButton = frame.querySelector("#toggle-outline-panel-header");

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".md,.json,text/markdown,application/json";
  importInput.hidden = true;

  const presentButton = createButton("Audience View");
  const presenterButton = createButton("Presenter View");
  const helpButton = createButton("Help");
  const exportBundleButton = createButton("Export");
  const exportJsonButton = createButton("Export Deck JSON");
  const advancedToggle = createButton("Advanced");
  advancedToggle.setAttribute("aria-haspopup", "true");
  advancedToggle.setAttribute("aria-expanded", "false");

  const advancedMenu = document.createElement("div");
  advancedMenu.className = "advanced-menu";
  advancedMenu.hidden = true;
  advancedMenu.innerHTML = `
    <div class="advanced-menu__panel">
      <button type="button" id="advanced-import-source">Import Source</button>
      <button type="button" id="advanced-export-json">Export Deck JSON</button>
      <button type="button" id="advanced-reset-deck">Reset Local Deck</button>
      <button type="button" id="advanced-clear-data">Clear Local App Data</button>
    </div>
  `;

  actions.append(
    presentButton,
    presenterButton,
    helpButton,
    exportBundleButton,
    advancedToggle,
    advancedMenu,
    importInput,
  );
  addColorModeToggle(actions);

  const advancedImportButton = advancedMenu.querySelector("#advanced-import-source");
  const advancedExportJsonButton = advancedMenu.querySelector("#advanced-export-json");
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
        <p>Use <strong>Export</strong> to download a ZIP that contains both your editable Markdown deck and a portable HTML presentation. Use <strong>Import Source</strong> to reopen a previously exported Markdown or JSON deck in this editor.</p>
        <p>Lower-frequency tools such as import and JSON export are grouped under <strong>Advanced</strong>.</p>
        <p>Audience View opens the presentation view. Presenter View opens notes, timing, and next-slide support in a second window.</p>
      </div>
    </form>
  `;
  frame.append(helpDialog);

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
    previewLayout.dataset.outlineCollapsed = String(outlineCollapsed);
    outlinePanel.dataset.collapsed = String(outlineCollapsed);
    outlinePanel.hidden = outlineCollapsed;
    toggleEditorPanelButton.textContent = editorCollapsed ? "Expand Editor" : "Minimize Editor";
    toggleOutlinePanelButton.textContent = outlineCollapsed ? "Show Outline" : "Hide Outline";
    toggleOutlinePanelHeaderButton.textContent = outlineCollapsed ? "Show Outline" : "Hide Outline";
  }

  function publishState(compiled) {
    applyDeckTheme(compiled.metadata);
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
    mountSlideInto(previewFrame, slide);
    notesPreview.innerHTML = buildSupplementalHtml(slide);
    outlineNode.innerHTML = compiled.renderedSlides
      .map((renderedSlide, index) => {
        const currentClass = index === activeSlideIndex ? ' class="is-current"' : "";
        return `<li${currentClass}><button type="button" data-slide-index="${index}">${getSlideTitle(renderedSlide, index)}</button></li>`;
      })
      .join("");
  }

  function render() {
    lastCompiled = compileSource(source);
    publishState(lastCompiled);
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
    window.open("./present", "_blank", "noopener,noreferrer");
  });

  presenterButton.addEventListener("click", () => {
    window.open("./presenter", "_blank", "noopener,noreferrer");
  });

  helpButton.addEventListener("click", () => {
    helpDialog.showModal();
  });

  exportJsonButton.addEventListener("click", () => {
    downloadFile(
      "deck.json",
      JSON.stringify(
        {
          metadata: lastCompiled?.metadata || {},
          slides: lastCompiled?.slides || [],
          source,
        },
        null,
        2,
      ),
      "application/json;charset=utf-8",
    );
  });
  advancedExportJsonButton.addEventListener("click", () => {
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    exportJsonButton.click();
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
    const bundle = buildExportBundle({
      markdownSource: source,
      snapshotHtml: html,
    });
    downloadFile("deck-export.zip", bundle, "application/zip");
  });

  advancedImportButton.addEventListener("click", () => {
    advancedMenu.hidden = true;
    advancedToggle.setAttribute("aria-expanded", "false");
    importInput.click();
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
