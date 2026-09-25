import assert from "node:assert/strict";
import { test } from "node:test";
import { settledWithin, singleFlight } from "./flight.ts";

test("concurrent calls with the same key share one run", async () => {
  const flight = singleFlight<string, number>();
  let calls = 0;
  let release!: (n: number) => void;
  const fn = () => {
    calls++;
    return new Promise<number>((r) => (release = r));
  };
  const a = flight.run("meta", fn);
  const b = flight.run("meta", fn);
  assert.equal(a, b);
  assert.equal(flight.running("meta"), true);
  release(7);
  assert.deepEqual(await Promise.all([a, b]), [7, 7]);
  assert.equal(calls, 1);
});

test("different keys run independently, and a finished run frees its key", async () => {
  const flight = singleFlight<string, string>();
  let calls = 0;
  const fn = async () => `run ${++calls}`;
  assert.deepEqual(await Promise.all([flight.run("meta", fn), flight.run("monobank", fn)]), ["run 1", "run 2"]);
  assert.equal(flight.running("meta"), false);
  assert.equal(await flight.run("meta", fn), "run 3");
});

test("a failed run frees its key too", async () => {
  const flight = singleFlight<string, number>();
  await assert.rejects(flight.run("meta", async () => { throw new Error("down"); }));
  assert.equal(await flight.run("meta", async () => 1), 1);
});

test("settledWithin says whether the work finished inside the deadline", async () => {
  assert.equal(await settledWithin(Promise.resolve(1), 50), true);
  assert.equal(await settledWithin(Promise.reject(new Error("x")), 50), true);
  assert.equal(await settledWithin(new Promise(() => {}), 20), false);
});
