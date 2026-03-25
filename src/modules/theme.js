import { applySlideDimensions, buildSlideDimensionStyle } from "./slide-layout.js";

const THEME_LINK_ID = "deck-theme-stylesheet";
export const DEFAULT_THEME_ID = "default-high-contrast";
export const BUILT_IN_THEME_IDS = Object.freeze([
  DEFAULT_THEME_ID,
  "paper-warm",
  "night-slate",
  "civic-bright",
  "glass-aurora",
]);

export const BUILT_IN_THEMES = [
  {
    id: DEFAULT_THEME_ID,
    label: "Default high contrast",
  },
  {
    id: "paper-warm",
    label: "Paper warm",
  },
  {
    id: "night-slate",
    label: "Night slate",
  },
  {
    id: "civic-bright",
    label: "Civic bright",
  },
  {
    id: "glass-aurora",
    label: "Glass aurora",
  },
].filter((theme) => BUILT_IN_THEME_IDS.includes(theme.id));

function ensureThemeLink() {
  let link = document.querySelector(`#${THEME_LINK_ID}`);
  if (!link) {
    link = document.createElement("link");
    link.id = THEME_LINK_ID;
    link.rel = "stylesheet";
    document.head.append(link);
  }
  return link;
}

export function applyDeckTheme(metadata = {}) {
  const theme = BUILT_IN_THEME_IDS.includes(metadata.theme)
    ? metadata.theme
    : DEFAULT_THEME_ID;
  document.documentElement.dataset.theme = theme;
  applySlideDimensions(metadata);

  const link = ensureThemeLink();
  if (metadata.themeStylesheet) {
    link.href = metadata.themeStylesheet;
    link.disabled = false;
  } else {
    link.href = "";
    link.disabled = true;
  }
}

export function buildThemeLinkTag(metadata = {}) {
  if (!metadata.themeStylesheet) {
    return "";
  }

  return `<link rel="stylesheet" href="${metadata.themeStylesheet}" />`;
}

export function buildDeckStyleAttribute(metadata = {}) {
  return buildSlideDimensionStyle(metadata);
}
