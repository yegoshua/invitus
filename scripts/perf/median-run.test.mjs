import test from "node:test";
import assert from "node:assert/strict";

import { pickMedianRun } from "./median-run.mjs";

const run = (lcp, si) => ({
  "largest-contentful-paint": lcp,
  "speed-index": si,
});

test("a single run is its own median", () => {
  const only = run(2000, 3000);
  assert.equal(pickMedianRun([only]), only);
});

test("picks the middle run by LCP, not the best one", () => {
  const runs = [run(4000, 3000), run(2000, 3000), run(3000, 3000)];
  assert.equal(pickMedianRun(runs), runs[2]);
});

test("returns a whole run, so every reported metric came from one measurement", () => {
  const runs = [run(4000, 9000), run(2000, 1000), run(3000, 5000)];
  assert.equal(pickMedianRun(runs)["speed-index"], 5000);
});

test("with an even count it takes the lower middle rather than averaging", () => {
  const runs = [run(1000, 0), run(2000, 0), run(3000, 0), run(4000, 0)];
  assert.equal(pickMedianRun(runs)["largest-contentful-paint"], 2000);
});

test("no runs is a programming error, not an empty median", () => {
  assert.throws(() => pickMedianRun([]));
});
