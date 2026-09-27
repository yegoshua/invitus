import assert from "node:assert/strict";
import { test } from "node:test";
import { CATCH_UP_DAYS, cadenceLabel, dueDays, generationWindow, nextDue, type Schedule } from "./schedule.ts";

const monthly = (dayOfMonth: number, extra: Partial<Schedule> = {}): Schedule => ({
  cadence: "monthly",
  dayOfMonth,
  month: null,
  startsOn: "2026-01-01",
  endsOn: null,
  paused: false,
  ...extra,
});
const yearly = (month: number, dayOfMonth: number, extra: Partial<Schedule> = {}): Schedule => ({
  ...monthly(dayOfMonth, extra),
  cadence: "yearly",
  month,
});

test("a monthly payment is due on its day in every month of the window", () => {
  assert.deepEqual(dueDays(monthly(5), { from: "2026-06-01", to: "2026-09-25" }), [
    "2026-06-05",
    "2026-07-05",
    "2026-08-05",
    "2026-09-05",
  ]);
});

test("the window is inclusive at both ends", () => {
  assert.deepEqual(dueDays(monthly(5), { from: "2026-08-05", to: "2026-09-05" }), ["2026-08-05", "2026-09-05"]);
  assert.deepEqual(dueDays(monthly(5), { from: "2026-08-06", to: "2026-09-04" }), []);
});

test("a day the month does not have falls on the month's last day", () => {
  assert.deepEqual(dueDays(monthly(31), { from: "2026-01-01", to: "2026-06-30" }), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
    "2026-05-31",
    "2026-06-30",
  ]);
  assert.deepEqual(dueDays(monthly(30), { from: "2028-02-01", to: "2028-02-29" }), ["2028-02-29"]);
});

test("a yearly payment is due once a year, on its day and month", () => {
  assert.deepEqual(dueDays(yearly(3, 12), { from: "2026-01-01", to: "2028-12-31" }), [
    "2026-03-12",
    "2027-03-12",
    "2028-03-12",
  ]);
});

test("a yearly 29 February falls on the 28th in a year without one", () => {
  assert.deepEqual(dueDays(yearly(2, 29), { from: "2026-01-01", to: "2028-12-31" }), [
    "2026-02-28",
    "2027-02-28",
    "2028-02-29",
  ]);
});

test("nothing is due before the start or after the end", () => {
  const s = monthly(10, { startsOn: "2026-03-15", endsOn: "2026-06-10" });
  assert.deepEqual(dueDays(s, { from: "2026-01-01", to: "2026-12-31" }), ["2026-04-10", "2026-05-10", "2026-06-10"]);
});

test("a paused payment is never due", () => {
  assert.deepEqual(dueDays(monthly(5, { paused: true }), { from: "2026-01-01", to: "2026-12-31" }), []);
});

test("an empty or inverted window has nothing in it", () => {
  assert.deepEqual(dueDays(monthly(5), { from: "2026-09-06", to: "2026-09-05" }), []);
});

test("the generator's window runs from the start to today the first time", () => {
  const s = monthly(5, { startsOn: "2026-08-01" });
  assert.deepEqual(generationWindow(s, null, "2026-09-25"), { from: "2026-08-01", to: "2026-09-25" });
});

test("after that it picks up the day after the last run — a missed night is caught up", () => {
  const s = monthly(5, { startsOn: "2026-01-01" });
  assert.deepEqual(generationWindow(s, "2026-09-02", "2026-09-25"), { from: "2026-09-03", to: "2026-09-25" });
  assert.deepEqual(dueDays(s, generationWindow(s, "2026-09-02", "2026-09-25")!), ["2026-09-05"]);
});

test("a run that already covered today has nothing left to do", () => {
  assert.equal(generationWindow(monthly(5), "2026-09-25", "2026-09-25"), null);
});

test("never in the future: a start after today, or an end before the window, gives no window", () => {
  assert.equal(generationWindow(monthly(5, { startsOn: "2026-10-01" }), null, "2026-09-25"), null);
  assert.equal(generationWindow(monthly(5, { endsOn: "2026-08-31" }), "2026-08-31", "2026-09-25"), null);
  assert.deepEqual(generationWindow(monthly(5, { endsOn: "2026-09-10" }), "2026-08-31", "2026-09-25"), {
    from: "2026-09-01",
    to: "2026-09-10",
  });
});

test("the catch-up is capped, and never reaches before the accounting start", () => {
  const w = generationWindow(monthly(5, { startsOn: "2020-01-01" }), null, "2028-06-30");
  assert.deepEqual(w, { from: "2027-05-28", to: "2028-06-30" });
  assert.equal(CATCH_UP_DAYS, 400);
  assert.deepEqual(generationWindow(monthly(5, { startsOn: "2025-06-01" }), null, "2026-03-01"), {
    from: "2026-01-01",
    to: "2026-03-01",
  });
});

test("a paused payment has no window", () => {
  assert.equal(generationWindow(monthly(5, { paused: true }), "2026-09-01", "2026-09-25"), null);
});

test("the next payment is today when today's has not been written yet", () => {
  assert.equal(nextDue(monthly(25), "2026-09-24", "2026-09-25"), "2026-09-25");
});

test("the next payment skips a day that was already written", () => {
  assert.equal(nextDue(monthly(25), "2026-09-25", "2026-09-25"), "2026-10-25");
  assert.equal(nextDue(monthly(5), "2026-09-25", "2026-09-25"), "2026-10-05");
});

test("the next payment waits for the start, and there is none once it ended or while paused", () => {
  assert.equal(nextDue(monthly(5, { startsOn: "2026-11-20" }), null, "2026-09-25"), "2026-12-05");
  assert.equal(nextDue(yearly(3, 12), "2026-09-25", "2026-09-25"), "2027-03-12");
  assert.equal(nextDue(monthly(5, { endsOn: "2026-10-01" }), "2026-09-25", "2026-09-25"), null);
  assert.equal(nextDue(monthly(5, { paused: true }), "2026-09-25", "2026-09-25"), null);
});

test("the cadence reads the way the page prints it", () => {
  assert.equal(cadenceLabel(monthly(5)), "щомісяця, 5-го");
  assert.equal(cadenceLabel(yearly(3, 12)), "щороку, 12 бер");
});
