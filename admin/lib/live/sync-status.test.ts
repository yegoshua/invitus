import assert from "node:assert/strict";
import { test } from "node:test";
import { syncRows, syncTime, worstState } from "./sync-status.ts";

const NOW = new Date("2026-09-26T10:20:00Z"); // 13:20 Kyiv
const AT = new Date("2026-09-26T10:15:00Z");

test("each source reads as its own state and time", () => {
  const rows = syncRows(
    { ok: true, fetchedAt: AT, error: null },
    [
      { source: "meta", configured: false },
      { source: "monobank", configured: true, freshness: { state: "fresh", asOf: AT } },
    ]
  );
  assert.deepEqual(rows, [
    { name: "KeyCRM", state: "ok", at: AT },
    { name: "Meta", state: "off", at: null },
    { name: "Monobank", state: "ok", at: AT },
  ]);
});

test("KeyCRM served from its last good copy is stale, and dated by that copy", () => {
  const [keycrm] = syncRows({ ok: true, fetchedAt: AT, error: "ETIMEDOUT" }, []);
  assert.deepEqual(keycrm, { name: "KeyCRM", state: "stale", at: AT });
});

test("KeyCRM with nothing to show is down", () => {
  const [keycrm] = syncRows({ ok: false, fetchedAt: null, error: "ETIMEDOUT" }, []);
  assert.deepEqual(keycrm, { name: "KeyCRM", state: "down", at: null });
});

test("an ingest source that failed lately is stale as of its last success, or down when it never had one", () => {
  const rows = syncRows({ ok: true, fetchedAt: AT, error: null }, [
    { source: "meta", configured: true, freshness: { state: "stale", asOf: AT, error: "token expired" } },
    { source: "monobank", configured: true, freshness: { state: "stale", asOf: null, error: null } },
  ]);
  assert.deepEqual(rows.slice(1), [
    { name: "Meta", state: "stale", at: AT },
    { name: "Monobank", state: "down", at: null },
  ]);
});

test("a source whose journal could not be read is unknown, not down", () => {
  const [, meta] = syncRows({ ok: true, fetchedAt: AT, error: null }, [{ source: "meta", configured: true, freshness: null }]);
  assert.deepEqual(meta, { name: "Meta", state: "unknown", at: null });
});

test("the phone badge shows the worst state; a source not connected does not count", () => {
  assert.equal(worstState([{ state: "ok" }, { state: "off" }]), "ok");
  assert.equal(worstState([{ state: "ok" }, { state: "stale" }, { state: "unknown" }]), "stale");
  assert.equal(worstState([{ state: "stale" }, { state: "down" }]), "down");
});

test("today's time is just the time; another day carries its date", () => {
  assert.equal(syncTime(AT, NOW), "13:15");
  assert.equal(syncTime(new Date("2026-09-25T00:30:00Z"), NOW), "25.09, 03:30");
});
