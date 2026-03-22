import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchCaptionState,
  getCaptionConfig,
  parseCaptionPayload,
} from "../src/modules/captions.js";

test("getCaptionConfig prefers explicit caption source", () => {
  const config = getCaptionConfig(
    { captionsSource: "https://captions.example.test/live.json", captionsProvider: "service" },
    { href: "https://slides.example.test/", hostname: "slides.example.test" },
  );

  assert.equal(config.enabled, true);
  assert.equal(config.source, "https://captions.example.test/live.json");
  assert.equal(config.provider, "service");
});

test("getCaptionConfig uses localhost whisper transcript by default", () => {
  const config = getCaptionConfig({}, { href: "http://localhost:4173/", hostname: "localhost" });

  assert.equal(config.enabled, true);
  assert.equal(config.source, "http://localhost:4173/whisper-demo/transcript.json");
});

test("parseCaptionPayload understands transcript json state", () => {
  const payload = parseCaptionPayload('{"active":true,"generated":"2026-03-22T12:00:00Z","text":"Hello world"}');

  assert.equal(payload.available, true);
  assert.equal(payload.active, true);
  assert.equal(payload.text, "Hello world");
  assert.equal(payload.generated, "2026-03-22T12:00:00Z");
});

test("fetchCaptionState hides captions when the source is unavailable", async () => {
  const state = await fetchCaptionState(
    { enabled: true, source: "http://localhost:4173/whisper-demo/transcript.json", provider: "whisper.cpp", pollMs: 1500 },
    async () => ({ ok: false, status: 404, text: async () => "" }),
  );

  assert.equal(state.available, false);
  assert.equal(state.active, false);
  assert.equal(state.text, "");
});
