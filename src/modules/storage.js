export const STORAGE_KEY = "markdown-slides-editor.deck";

export const DEFAULT_SOURCE = `---
title: Accessible slide deck
lang: en
theme: default-high-contrast
durationMinutes: 20
themeStylesheet:
---

# Welcome

Build accessible slides in Markdown and preview them instantly.

- Static hosting
- [>] Presenter notes
- [>] Snapshot export

Note:
Open Presenter View to see notes, timer, and next-slide preview.

---

# Resources

- [WCAG 2.2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Accessible Presentations](https://www.w3.org/WAI/presentations/)
- ![Decorative wave pattern described for screen readers](https://dummyimage.com/640x160/0b3d91/ffffff.png&text=Accessible+Slides)

Note:
Replace this slide with your own required resource references, including Intopia and Inklusiv guidance.
`;

const DB_NAME = "markdown-slides-editor";
const STORE_NAME = "documents";

function hasIndexedDB() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSource(key, value) {
  if (!hasIndexedDB()) {
    localStorage.setItem(key, value);
    return;
  }

  await withStore("readwrite", (store) => store.put(value, key));
}

export async function loadSource(key) {
  if (!hasIndexedDB()) {
    return localStorage.getItem(key);
  }

  return withStore("readonly", (store) => store.get(key));
}

export async function removeSource(key) {
  if (!hasIndexedDB()) {
    localStorage.removeItem(key);
    return;
  }

  await withStore("readwrite", (store) => store.delete(key));
}

export async function clearStoredDocuments() {
  if (!hasIndexedDB()) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  await withStore("readwrite", (store) => store.clear());
}
