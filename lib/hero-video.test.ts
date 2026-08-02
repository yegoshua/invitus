import { test } from "node:test";
import assert from "node:assert/strict";

import { shouldLoadHeroVideo } from "./hero-video.ts";

test("loads on a fast connection with motion allowed", () => {
  assert.equal(
    shouldLoadHeroVideo({ effectiveType: "4g", prefersReducedMotion: false }),
    true,
  );
});

test("loads when the browser tells us nothing about the connection", () => {
  assert.equal(shouldLoadHeroVideo({ prefersReducedMotion: false }), true);
});

test("skips when the visitor asked for reduced motion", () => {
  assert.equal(
    shouldLoadHeroVideo({ effectiveType: "4g", prefersReducedMotion: true }),
    false,
  );
});

test("skips when the visitor asked to save data", () => {
  assert.equal(
    shouldLoadHeroVideo({
      saveData: true,
      effectiveType: "4g",
      prefersReducedMotion: false,
    }),
    false,
  );
});

for (const effectiveType of ["slow-2g", "2g", "3g"]) {
  test(`skips on ${effectiveType}`, () => {
    assert.equal(
      shouldLoadHeroVideo({ effectiveType, prefersReducedMotion: false }),
      false,
    );
  });
}

test("an unrecognised effective type is treated as fast, not slow", () => {
  // Guessing "slow" on an unknown value would silently kill the video the day
  // the Network Information API grows a "5g".
  assert.equal(
    shouldLoadHeroVideo({ effectiveType: "5g", prefersReducedMotion: false }),
    true,
  );
});
