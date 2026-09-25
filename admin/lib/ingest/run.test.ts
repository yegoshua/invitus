import assert from "node:assert/strict";
import { test } from "node:test";
import { freshness, fullSyncWarning, runStages, type IngestRun } from "./run.ts";

const T0 = new Date("2026-09-25T00:30:00Z");

test("every stage runs and is recorded, and one failing stops none of the others", async () => {
  const recorded: IngestRun[] = [];
  const runs = await runStages(
    [
      { source: "monobank", run: async () => ({ rows: 4 }) },
      { source: "meta", run: async () => { throw new Error("token expired"); } },
      { source: "ga4", run: async () => ({ rows: 0 }) },
    ],
    async (r) => { recorded.push(r); },
    () => T0
  );
  assert.deepEqual(
    runs.map((r) => [r.source, r.ok, r.rows, r.error]),
    [
      ["monobank", true, 4, null],
      ["meta", false, null, "token expired"],
      ["ga4", true, 0, null],
    ]
  );
  assert.deepEqual(recorded, runs);
});

test("a journal that cannot be written loses the entry, not the run", async () => {
  const runs = await runStages(
    [{ source: "monobank", run: async () => ({ rows: 1 }) }],
    async () => { throw new Error("database down"); },
    () => T0
  );
  assert.equal(runs[0].ok, true);
});

test("an error message is kept short enough to store and show", async () => {
  const [run] = await runStages(
    [{ source: "monobank", run: async () => { throw new Error("x".repeat(5000)); } }],
    async () => {},
    () => T0
  );
  assert.ok(run.error!.length <= 500);
});

const NOW = new Date("2026-09-25T12:00:00Z");
const ok = (at: string) => ({ startedAt: new Date(at), ok: true, error: null });
const failed = (at: string, error = "Monobank 403") => ({ startedAt: new Date(at), ok: false, error });

test("fresh: the last run worked, and not long ago", () => {
  assert.deepEqual(freshness(ok("2026-09-25T00:30:00Z"), ok("2026-09-25T00:30:00Z"), NOW), {
    state: "fresh",
    asOf: new Date("2026-09-25T00:30:00Z"),
  });
});

test("stale when the last run failed, as of the last one that worked, with the reason", () => {
  assert.deepEqual(freshness(failed("2026-09-25T00:30:00Z"), ok("2026-09-24T00:30:00Z"), NOW), {
    state: "stale",
    asOf: new Date("2026-09-24T00:30:00Z"),
    error: "Monobank 403",
  });
});

test("stale when the cron has not run for more than a day and a half", () => {
  const last = ok("2026-09-23T23:59:00Z");
  assert.equal(freshness(last, last, NOW).state, "stale");
  const recent = ok("2026-09-24T00:01:00Z");
  assert.equal(freshness(recent, recent, NOW).state, "fresh");
});

test("stale, as of never, when it has never run or never worked", () => {
  assert.deepEqual(freshness(null, null, NOW), { state: "stale", asOf: null, error: null });
  assert.deepEqual(freshness(failed("2026-09-25T00:30:00Z", "MONOBANK_TOKEN is not set"), null, NOW), {
    state: "stale",
    asOf: null,
    error: "MONOBANK_TOKEN is not set",
  });
});

test("a run records its kind: full unless the stage says it is a top-up", async () => {
  const runs = await runStages(
    [
      { source: "monobank", run: async () => ({ rows: 1 }) },
      { source: "meta", kind: "top-up", run: async () => ({ rows: 2 }) },
    ],
    async () => {},
    () => T0
  );
  assert.deepEqual(runs.map((r) => r.kind), ["full", "top-up"]);
});

const FRESH = { state: "fresh" as const, asOf: T0 };
const H = 3_600_000;

test("no full-sync warning while the last full run is within 36 hours", () => {
  const now = new Date(T0.getTime() + 36 * H);
  assert.equal(fullSyncWarning({ configured: true, freshness: FRESH, latestFullOk: T0, now }), null);
});

test("a full run older than 36 hours warns, dated by that run — even when top-ups keep the data fresh", () => {
  const now = new Date(T0.getTime() + 36 * H + 1);
  assert.deepEqual(fullSyncWarning({ configured: true, freshness: FRESH, latestFullOk: T0, now }), { since: T0 });
});

test("a source that has only ever been topped up warns, as of never", () => {
  assert.deepEqual(fullSyncWarning({ configured: true, freshness: FRESH, latestFullOk: null, now: T0 }), { since: null });
});

test("a source that is not configured never warns", () => {
  assert.equal(fullSyncWarning({ configured: false, freshness: FRESH, latestFullOk: null, now: T0 }), null);
});

test("no full-sync warning when the data itself is stale or unknown: that banner already speaks", () => {
  const stale = { state: "stale" as const, asOf: null, error: "down" };
  assert.equal(fullSyncWarning({ configured: true, freshness: stale, latestFullOk: null, now: T0 }), null);
  assert.equal(fullSyncWarning({ configured: true, freshness: null, latestFullOk: null, now: T0 }), null);
});
