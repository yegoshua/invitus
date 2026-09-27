import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldPinCta } from "./pinned-cta.ts";

test("the buttons stay in the page while any of them is on screen", () => {
  assert.equal(shouldPinCta({ isIntersecting: true, top: 400 }), false);
  assert.equal(shouldPinCta({ isIntersecting: true, top: -40 }), false);
});

test("scrolled past — above the viewport — they pin to the bottom", () => {
  assert.equal(shouldPinCta({ isIntersecting: false, top: -180 }), true);
});

test("not reached yet — below the fold on a short screen — they do not pin", () => {
  // Pinning here would put a second copy of the buttons on screen the moment
  // the reader scrolled down to the first one.
  assert.equal(shouldPinCta({ isIntersecting: false, top: 900 }), false);
});
