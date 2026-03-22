export const PRESENTER_LAYOUT_STORAGE_KEY = "markdown-slides-editor.presenter-layout";

export const DEFAULT_PRESENTER_PANELS = [
  { id: "current", title: "Current slide", span: 5 },
  { id: "next", title: "Next slide", span: 4 },
  { id: "timer", title: "Timer", span: 3 },
  { id: "notes", title: "Notes", span: 6 },
  { id: "captions", title: "Captions", span: 6 },
  { id: "outline", title: "Outline", span: 6 },
];

const MIN_SPAN = 3;
const MAX_SPAN = 12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizePresenterPanels(panels) {
  const incoming = Array.isArray(panels) ? panels : [];
  const defaultsById = new Map(DEFAULT_PRESENTER_PANELS.map((panel) => [panel.id, panel]));
  const seen = new Set();
  const normalized = [];

  for (const panel of incoming) {
    if (!panel?.id || seen.has(panel.id) || !defaultsById.has(panel.id)) {
      continue;
    }
    const defaultPanel = defaultsById.get(panel.id);
    normalized.push({
      id: defaultPanel.id,
      title: defaultPanel.title,
      span: clamp(Number.parseInt(panel.span, 10) || defaultPanel.span, MIN_SPAN, MAX_SPAN),
    });
    seen.add(panel.id);
  }

  for (const defaultPanel of DEFAULT_PRESENTER_PANELS) {
    if (seen.has(defaultPanel.id)) continue;
    normalized.push({ ...defaultPanel });
  }

  return normalized;
}

export function resizePresenterPanel(panels, panelId, delta) {
  return normalizePresenterPanels(panels).map((panel) =>
    panel.id === panelId
      ? {
          ...panel,
          span: clamp(panel.span + delta, MIN_SPAN, MAX_SPAN),
        }
      : panel,
  );
}

export function movePresenterPanel(panels, panelId, delta) {
  const normalized = [...normalizePresenterPanels(panels)];
  const index = normalized.findIndex((panel) => panel.id === panelId);
  if (index === -1) return normalized;
  const nextIndex = clamp(index + delta, 0, normalized.length - 1);
  if (nextIndex === index) return normalized;
  const [panel] = normalized.splice(index, 1);
  normalized.splice(nextIndex, 0, panel);
  return normalized;
}

export function loadPresenterLayout(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PRESENTER_LAYOUT_STORAGE_KEY);
    if (!raw) return normalizePresenterPanels();
    return normalizePresenterPanels(JSON.parse(raw));
  } catch {
    return normalizePresenterPanels();
  }
}

export function savePresenterLayout(panels, storage = globalThis.localStorage) {
  storage?.setItem(PRESENTER_LAYOUT_STORAGE_KEY, JSON.stringify(normalizePresenterPanels(panels)));
}
