import {
  DEFAULT_SOURCE,
  STORAGE_KEY,
  clearStoredDocuments,
  loadSource,
  removeSource,
  saveSource,
} from "./modules/storage.js";
import { initColorMode } from "./modules/color-mode.js";
import { createAppView } from "./modules/views/editor-view.js";
import { createPresentationView } from "./modules/views/presentation-view.js";
import { createPresenterView } from "./modules/views/presenter-view.js";
import { getCurrentRoute, restoreRedirectPath } from "./modules/router.js";

restoreRedirectPath();
initColorMode();

const app = document.querySelector("#app");
const route = getCurrentRoute(window.location.pathname);

async function bootstrap() {
  const savedSource = await loadSource(STORAGE_KEY);
  const source = savedSource || DEFAULT_SOURCE;

  if (route === "present") {
    createPresentationView(app, source);
    return;
  }

  if (route === "presenter") {
    createPresenterView(app, source);
    return;
  }

  createAppView(app, {
    initialSource: source,
    onSourceChange: (nextSource) => saveSource(STORAGE_KEY, nextSource),
    onResetDeck: async () => {
      await removeSource(STORAGE_KEY);
    },
    onClearLocalData: async () => {
      await clearStoredDocuments();
    },
  });
}

bootstrap();
