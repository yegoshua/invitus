import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BELT_SCRUB_HEVC,
  BELT_SCRUB_WEBM,
  pickBeltScrubSource,
} from "./belt-scrub-source.ts";

describe("pickBeltScrubSource", () => {
  it("hands WebKit the HEVC-with-alpha, the only transparent video it composites", () => {
    assert.equal(
      pickBeltScrubSource({ isWebKit: true, canPlayHevc: true }),
      BELT_SCRUB_HEVC
    );
  });

  it("keeps the WebM for Chromium and Firefox, which never finish loading the .mov", () => {
    assert.equal(
      pickBeltScrubSource({ isWebKit: false, canPlayHevc: false }),
      BELT_SCRUB_WEBM
    );
  });

  it("does not trust canPlayType alone: Firefox says 'probably' to hvc1 and renders it without alpha", () => {
    assert.equal(
      pickBeltScrubSource({ isWebKit: false, canPlayHevc: true }),
      BELT_SCRUB_WEBM
    );
  });

  it("a WebKit without HEVC gets the WebM rather than nothing", () => {
    assert.equal(
      pickBeltScrubSource({ isWebKit: true, canPlayHevc: false }),
      BELT_SCRUB_WEBM
    );
  });
});
