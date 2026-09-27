import assert from "node:assert/strict";
import { test } from "node:test";
import { adSpendWindows, spendKopecks, staleAdSpend } from "./ad-spend.ts";

test("spend is read as a decimal string, never through a float", () => {
  assert.equal(spendKopecks("5339.5"), 533_950);
  assert.equal(spendKopecks("0.29"), 29);
  assert.equal(spendKopecks("1200"), 120_000);
  assert.equal(spendKopecks("0.285"), 29); // half up at the third digit, not 28 from 0.285 * 100
  assert.equal(spendKopecks("0"), 0);
  assert.equal(spendKopecks("-3.00"), null);
  assert.equal(spendKopecks("1e3"), null);
  assert.equal(spendKopecks(""), null);
  assert.equal(spendKopecks(12.5 as unknown as string), null);
});

test("the look-back is cut into windows short enough for one synchronous request, covering every day once", () => {
  assert.deepEqual(adSpendWindows("2026-09-01", "2026-09-28"), [{ from: "2026-09-01", to: "2026-09-28" }]);
  assert.deepEqual(adSpendWindows("2026-01-01", "2026-03-05"), [
    { from: "2026-01-01", to: "2026-01-31" },
    { from: "2026-02-01", to: "2026-03-03" },
    { from: "2026-03-04", to: "2026-03-05" },
  ]);
  assert.deepEqual(adSpendWindows("2026-09-25", "2026-09-25"), [{ from: "2026-09-25", to: "2026-09-25" }]);
  assert.deepEqual(adSpendWindows("2026-09-26", "2026-09-25"), []);
});

test("what Meta no longer reports inside the re-read window is stale; outside it is left alone", () => {
  const stored = [
    { day: "2026-09-10", campaign: "1" }, // before the window: Meta was not asked
    { day: "2026-09-20", campaign: "1" }, // still reported
    { day: "2026-09-20", campaign: "2" }, // revised to 0 — Meta omits the row now
    { day: "2026-09-21", campaign: "1" }, // likewise
  ];
  const fresh = [{ day: "2026-09-20", campaign: "1" }];
  assert.deepEqual(staleAdSpend(stored, fresh, { from: "2026-09-15", to: "2026-09-25" }), [
    { day: "2026-09-20", campaign: "2" },
    { day: "2026-09-21", campaign: "1" },
  ]);
});
