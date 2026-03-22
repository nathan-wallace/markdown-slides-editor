export const COLOR_MODE_STORAGE_KEY = "markdown-slides-editor.color-mode";

let currentMode = "light";
let userHasOverride = false;
let mediaQueryList = null;
let isInitialized = false;
const listeners = new Set();

export function resolveInitialColorMode(savedMode, systemPrefersDark) {
  if (savedMode === "light" || savedMode === "dark") {
    return {
      mode: savedMode,
      userHasOverride: true,
    };
  }

  return {
    mode: systemPrefersDark ? "dark" : "light",
    userHasOverride: false,
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    listener({
      mode: currentMode,
      userHasOverride,
    });
  }
}

function applyColorMode(mode) {
  currentMode = mode === "dark" ? "dark" : "light";
  document.documentElement.dataset.colorMode = currentMode;
  document.documentElement.style.colorScheme = currentMode;
  notifyListeners();
}

export function setColorMode(mode, options = {}) {
  const { persist = true, storage = globalThis.localStorage } = options;
  userHasOverride = persist;
  if (persist) {
    storage?.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } else {
    storage?.removeItem?.(COLOR_MODE_STORAGE_KEY);
  }
  applyColorMode(mode);
}

export function toggleColorMode(storage = globalThis.localStorage) {
  const nextMode = currentMode === "dark" ? "light" : "dark";
  setColorMode(nextMode, { persist: true, storage });
}

export function getCurrentColorMode() {
  return currentMode;
}

export function subscribeToColorMode(listener) {
  listeners.add(listener);
  listener({
    mode: currentMode,
    userHasOverride,
  });
  return () => listeners.delete(listener);
}

export function initColorMode(options = {}) {
  if (isInitialized) {
    return;
  }

  const storage = options.storage ?? globalThis.localStorage;
  const matchMediaFn = options.matchMedia ?? globalThis.matchMedia?.bind(globalThis);
  mediaQueryList = matchMediaFn ? matchMediaFn("(prefers-color-scheme: dark)") : null;
  const savedMode = storage?.getItem?.(COLOR_MODE_STORAGE_KEY);
  const initial = resolveInitialColorMode(savedMode, Boolean(mediaQueryList?.matches));
  userHasOverride = initial.userHasOverride;
  applyColorMode(initial.mode);

  if (mediaQueryList?.addEventListener) {
    mediaQueryList.addEventListener("change", (event) => {
      if (userHasOverride) return;
      applyColorMode(event.matches ? "dark" : "light");
    });
  }

  isInitialized = true;
}

export function attachColorModeToggle(button, storage = globalThis.localStorage) {
  const updateButton = ({ mode }) => {
    const actionMode = mode === "dark" ? "light" : "dark";
    button.textContent = `${actionMode === "dark" ? "Dark" : "Light"} mode`;
    button.setAttribute("aria-label", `Switch to ${actionMode} mode`);
    button.dataset.actionMode = actionMode;
  };

  const unsubscribe = subscribeToColorMode(updateButton);
  button.addEventListener("click", () => toggleColorMode(storage));
  return unsubscribe;
}
