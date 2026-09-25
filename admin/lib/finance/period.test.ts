import assert from "node:assert/strict";
import { test } from "node:test";
import { kyivDay, periodFromSearch, presetPeriod, previousPeriod } from "./period.ts";

test("the Kyiv day flips at Kyiv midnight, in summer and in winter", () => {
  assert.equal(kyivDay(new Date("2026-07-14T20:59:00Z")), "2026-07-14"); // UTC+3
  assert.equal(kyivDay(new Date("2026-07-14T21:00:00Z")), "2026-07-15");
  assert.equal(kyivDay(new Date("2026-01-14T21:59:00Z")), "2026-01-14"); // UTC+2
  assert.equal(kyivDay(new Date("2026-01-14T22:00:00Z")), "2026-01-15");
});

test("presets", () => {
  assert.deepEqual(presetPeriod("month", "2026-09-25"), { from: "2026-09-01", to: "2026-09-25" });
  assert.deepEqual(presetPeriod("last-month", "2026-03-10"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(presetPeriod("last-month", "2026-01-10"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(presetPeriod("7d", "2026-09-25"), { from: "2026-09-19", to: "2026-09-25" });
  assert.deepEqual(presetPeriod("30d", "2026-03-01"), { from: "2026-01-31", to: "2026-03-01" });
});

test("the previous period is as long and ends the day before", () => {
  assert.deepEqual(previousPeriod({ from: "2026-09-01", to: "2026-09-25" }), { from: "2026-08-07", to: "2026-08-31" });
  assert.deepEqual(previousPeriod({ from: "2026-09-25", to: "2026-09-25" }), { from: "2026-09-24", to: "2026-09-24" });
});

test("a URL period: preset, custom, and garbage falling back to this month", () => {
  const today = "2026-09-25";
  assert.deepEqual(periodFromSearch({ period: "7d" }, today).preset, "7d");
  assert.deepEqual(periodFromSearch({ from: "2026-08-01", to: "2026-08-31" }, today), {
    period: { from: "2026-08-01", to: "2026-08-31" },
    preset: "custom",
  });
  // A future end is clipped to today; a reversed range is ignored.
  assert.deepEqual(periodFromSearch({ from: "2026-09-01", to: "2026-12-31" }, today).period.to, today);
  assert.equal(periodFromSearch({ from: "2026-09-10", to: "2026-09-01" }, today).preset, "month");
  assert.equal(periodFromSearch({ period: "'; drop" }, today).preset, "month");
});
