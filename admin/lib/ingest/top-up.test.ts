import assert from "node:assert/strict";
import { test } from "node:test";
import { topUpDays, topUpDecision, topUpRange, TOP_UP_AFTER_MS } from "./top-up.ts";

const NOW = new Date("2026-09-26T10:00:00Z"); // 13:00 Kyiv
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const ok = (ms: number) => ({ startedAt: ago(ms), ok: true, error: null });
const failed = (ms: number) => ({ startedAt: ago(ms), ok: false, error: "boom" });

test("a source that is not configured is never topped up, forced or not", () => {
  for (const force of [false, true]) {
    assert.equal(topUpDecision({ configured: false, latest: null, latestOk: null, now: NOW, force }), "unconfigured");
  }
});

test("a success within ten minutes is fresh enough", () => {
  const run = ok(TOP_UP_AFTER_MS - 1);
  assert.equal(topUpDecision({ configured: true, latest: run, latestOk: run, now: NOW }), "fresh");
});

test("a success older than ten minutes is due", () => {
  const run = ok(TOP_UP_AFTER_MS + 1);
  assert.equal(topUpDecision({ configured: true, latest: run, latestOk: run, now: NOW }), "due");
});

test("a source that has never worked is due", () => {
  assert.equal(topUpDecision({ configured: true, latest: null, latestOk: null, now: NOW }), "due");
});

test("a failure a minute ago backs off rather than making every render wait on a dead source", () => {
  assert.equal(topUpDecision({ configured: true, latest: failed(60_000), latestOk: ok(3_600_000), now: NOW }), "backing-off");
});

test("a failure five minutes ago is retried", () => {
  assert.equal(topUpDecision({ configured: true, latest: failed(5 * 60_000 + 1), latestOk: null, now: NOW }), "due");
});

test("forcing skips freshness and back-off", () => {
  assert.equal(topUpDecision({ configured: true, latest: ok(1000), latestOk: ok(1000), now: NOW, force: true }), "due");
  assert.equal(topUpDecision({ configured: true, latest: failed(1000), latestOk: null, now: NOW, force: true }), "due");
});

test("the top-up days are exactly yesterday and today in Kyiv", () => {
  assert.deepEqual(topUpDays(NOW), { from: "2026-09-25", to: "2026-09-26" });
  // 23:30 UTC on the 25th is already the 26th in Kyiv.
  assert.deepEqual(topUpDays(new Date("2026-09-25T23:30:00Z")), { from: "2026-09-25", to: "2026-09-26" });
});

test("the Monobank range starts no later than yesterday's Kyiv midnight and ends now", () => {
  const { from, to } = topUpRange(NOW);
  assert.equal(to.getTime(), NOW.getTime());
  // Yesterday's midnight Kyiv (summer, +03:00) is 21:00 UTC two days back.
  assert.ok(from.getTime() <= new Date("2026-09-24T21:00:00Z").getTime());
  assert.ok(NOW.getTime() - from.getTime() < 2 * 86_400_000);
});
