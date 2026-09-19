import { test } from "node:test";
import assert from "node:assert/strict";
import {
  measureSmallViewportHeight,
  pinnedViewport,
  type Viewport,
} from "./stable-viewport.ts";

test("first measurement is taken as-is", () => {
  const first = { width: 375, height: 752 };
  assert.equal(pinnedViewport(null, first), first);
});

test("a height-only change is the browser chrome, and is ignored", () => {
  const pinned: Viewport = { width: 375, height: 752 };
  // iPhone in an in-app browser: the toolbar collapses, the view grows 100px.
  assert.equal(pinnedViewport(pinned, { width: 375, height: 852 }), pinned);
  // …and shrinks again when it comes back.
  assert.equal(pinnedViewport(pinned, { width: 375, height: 700 }), pinned);
});

test("the same object is returned, so an ignored change cannot re-render", () => {
  const pinned: Viewport = { width: 375, height: 752 };
  assert.equal(pinnedViewport(pinned, { ...pinned }), pinned);
});

test("a width change is a real layout change and is re-measured", () => {
  const pinned: Viewport = { width: 375, height: 752 };
  const rotated = { width: 812, height: 375 };
  assert.deepEqual(pinnedViewport(pinned, rotated), rotated);
});

// ── measureSmallViewportHeight ────────────────────────────────────────

type FakeDoc = {
  supported: boolean;
  probeHeight: number;
  attached: number;
  removed: number;
  lastStyle: string;
};

function fakeEnv(doc: FakeDoc) {
  const el = {
    style: { cssText: "" },
    getBoundingClientRect: () => ({ height: doc.probeHeight }),
    remove: () => {
      doc.removed++;
    },
  };
  return {
    supportsSmallViewport: () => doc.supported,
    createProbe: () => {
      doc.attached++;
      return {
        measure: () => {
          doc.lastStyle = el.style.cssText;
          return el.getBoundingClientRect().height;
        },
        dispose: el.remove,
      };
    },
  };
}

test("the small viewport height comes from a probe, not from innerHeight", () => {
  const doc: FakeDoc = {
    supported: true,
    // The chrome is collapsed, so innerHeight is the *large* height…
    probeHeight: 752,
    attached: 0,
    removed: 0,
    lastStyle: "",
  };
  const env = fakeEnv(doc);
  assert.equal(measureSmallViewportHeight(env, () => 852), 752);
  assert.equal(doc.attached, 1);
  assert.equal(doc.removed, 1, "the probe must not be left in the document");
});

test("without svh support it falls back to innerHeight", () => {
  const doc: FakeDoc = {
    supported: false,
    probeHeight: 0,
    attached: 0,
    removed: 0,
    lastStyle: "",
  };
  assert.equal(measureSmallViewportHeight(fakeEnv(doc), () => 812), 812);
  assert.equal(doc.attached, 0, "no probe when the unit is not supported");
});

test("a probe that measures nothing falls back rather than pinning zero", () => {
  const doc: FakeDoc = {
    supported: true,
    probeHeight: 0,
    attached: 0,
    removed: 0,
    lastStyle: "",
  };
  assert.equal(measureSmallViewportHeight(fakeEnv(doc), () => 812), 812);
  assert.equal(doc.removed, 1, "the probe is cleaned up even when unusable");
});
