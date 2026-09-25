import assert from "node:assert/strict";
import { test } from "node:test";
import { freshCache } from "./fresh-cache.ts";

function clock(start = 0) {
  let t = start;
  return { now: () => new Date(t), advance: (ms: number) => (t += ms) };
}

test("a read inside the time-to-live is served from memory", async () => {
  const c = clock();
  let calls = 0;
  const cache = freshCache({ load: async () => ++calls, ttlMs: 20_000, clock: c.now });
  assert.deepEqual(await cache.get(), { value: 1, at: new Date(0), error: null });
  c.advance(19_999);
  assert.equal((await cache.get()).value, 1);
  assert.equal(calls, 1);
});

test("a read after the time-to-live waits for a fresh load — never serves the old one first", async () => {
  const c = clock();
  let calls = 0;
  const cache = freshCache({ load: async () => ++calls, ttlMs: 20_000, clock: c.now });
  await cache.get();
  c.advance(20_000);
  assert.deepEqual(await cache.get(), { value: 2, at: new Date(20_000), error: null });
});

test("concurrent reads share one load", async () => {
  let calls = 0;
  const cache = freshCache({ load: async () => ++calls, ttlMs: 20_000, clock: () => new Date(0) });
  const [a, b] = await Promise.all([cache.get(), cache.get()]);
  assert.equal(a.value, 1);
  assert.equal(b.value, 1);
  assert.equal(calls, 1);
});

test("a failed load serves the last good value, dated when it was read", async () => {
  const c = clock();
  let fail = false;
  const cache = freshCache({
    load: async () => {
      if (fail) throw new Error("ETIMEDOUT");
      return "orders";
    },
    ttlMs: 20_000,
    clock: c.now,
  });
  await cache.get();
  fail = true;
  c.advance(60_000);
  assert.deepEqual(await cache.get(), { value: "orders", at: new Date(0), error: "ETIMEDOUT" });
});

test("a failure with nothing to fall back on is a value, not a throw", async () => {
  const cache = freshCache<string>({ load: async () => { throw new Error("down"); }, ttlMs: 20_000 });
  assert.deepEqual(await cache.get(), { value: null, at: null, error: "down" });
});

test("a failure is not cached: the next read tries again", async () => {
  let fail = true;
  const cache = freshCache({ load: async () => { if (fail) throw new Error("down"); return 1; }, ttlMs: 20_000, clock: () => new Date(0) });
  await cache.get();
  fail = false;
  assert.equal((await cache.get()).value, 1);
});

test("force skips the time-to-live", async () => {
  let calls = 0;
  const cache = freshCache({ load: async () => ++calls, ttlMs: 20_000, clock: () => new Date(0) });
  await cache.get();
  assert.equal((await cache.get({ force: true })).value, 2);
});

test("after a failure the source is left alone for the back-off, serving the last good copy", async () => {
  const c = clock();
  let calls = 0;
  let fail = false;
  const cache = freshCache({
    load: async () => {
      calls++;
      if (fail) throw new Error("down");
      return calls;
    },
    ttlMs: 20_000,
    backoffMs: 60_000,
    clock: c.now,
  });
  await cache.get();
  fail = true;
  c.advance(30_000);
  assert.equal((await cache.get()).error, "down");
  c.advance(59_999);
  assert.deepEqual(await cache.get(), { value: 1, at: new Date(0), error: "down" });
  assert.equal(calls, 2);
  c.advance(1);
  await cache.get();
  assert.equal(calls, 3);
});

test("a hanging source does not hold the page: past waitMs the last good copy is served while the read carries on", async () => {
  let release!: (n: number) => void;
  let calls = 0;
  const c = clock();
  const cache = freshCache({
    load: () => (++calls === 1 ? Promise.resolve(1) : new Promise<number>((r) => (release = r))),
    ttlMs: 20_000,
    waitMs: 20,
    clock: c.now,
  });
  await cache.get();
  c.advance(30_000);
  const slow = await cache.get();
  assert.equal(slow.value, 1);
  assert.equal(slow.error, "no answer in 20 ms");
  release(2);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(await cache.get(), { value: 2, at: new Date(30_000), error: null });
});

test("with nothing to fall back on, a slow source is waited for", async () => {
  const cache = freshCache({ load: () => new Promise<number>((r) => setTimeout(() => r(5), 40)), ttlMs: 20_000, waitMs: 10 });
  assert.equal((await cache.get()).value, 5);
});
