import test from "node:test";
import assert from "node:assert/strict";
import {
  createRevealState,
  getNextPosition,
  getPresentationDurationMinutes,
  getPreviousPosition,
  getSlideTitle,
} from "../src/modules/presentation-state.js";

test("getSlideTitle prefers h1 text and falls back to slide number", () => {
  assert.equal(
    getSlideTitle({ headings: [{ level: 1, text: "Title slide" }] }, 0),
    "Title slide",
  );
  assert.equal(getSlideTitle({ headings: [] }, 2), "Slide 3");
});

test("getPresentationDurationMinutes returns valid values and falls back safely", () => {
  assert.equal(getPresentationDurationMinutes({ durationMinutes: "45" }), 45);
  assert.equal(getPresentationDurationMinutes({ durationMinutes: "0" }), 30);
  assert.equal(getPresentationDurationMinutes({}), 30);
});

test("createRevealState clamps reveal steps to the valid range", () => {
  assert.deepEqual(createRevealState({ stepCount: 3 }, -1), { revealStep: 0, stepCount: 3 });
  assert.deepEqual(createRevealState({ stepCount: 3 }, 9), { revealStep: 3, stepCount: 3 });
});

test("getNextPosition reveals steps before advancing slides", () => {
  const deck = {
    renderedSlides: [{ stepCount: 2 }, { stepCount: 0 }, { stepCount: 1 }],
  };

  assert.deepEqual(getNextPosition(deck, 0, 0), { activeSlideIndex: 0, revealStep: 1 });
  assert.deepEqual(getNextPosition(deck, 0, 2), { activeSlideIndex: 1, revealStep: 0 });
  assert.deepEqual(getNextPosition(deck, 2, 1), { activeSlideIndex: 2, revealStep: 0 });
});

test("getPreviousPosition rewinds reveal steps before moving slides", () => {
  const deck = {
    renderedSlides: [{ stepCount: 2 }, { stepCount: 0 }, { stepCount: 3 }],
  };

  assert.deepEqual(getPreviousPosition(deck, 2, 2), { activeSlideIndex: 2, revealStep: 1 });
  assert.deepEqual(getPreviousPosition(deck, 2, 0), { activeSlideIndex: 1, revealStep: 0 });
  assert.deepEqual(getPreviousPosition(deck, 1, 0), { activeSlideIndex: 0, revealStep: 2 });
});
