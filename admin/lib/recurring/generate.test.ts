import assert from "node:assert/strict";
import { test } from "node:test";
import type { NbuRate } from "./currency.ts";
import { generateOccurrences, type GenerateDeps, type Occurrence, type Template } from "./generate.ts";

const strapi: Template = {
  cadence: "monthly",
  dayOfMonth: 5,
  month: null,
  startsOn: "2026-06-01",
  endsOn: null,
  paused: false,
  currency: "USD",
  amountMinor: 3084,
  comment: null,
};
const packaging: Template = { ...strapi, currency: "UAH", amountMinor: 250_000, comment: "Нова пошта, коробки" };

function fake(opts: { written?: string[]; rates?: Record<string, number | "fail"> } = {}) {
  const writes: Occurrence[] = [];
  const asked: string[] = [];
  const deps: GenerateDeps = {
    written: async (day) => (opts.written ?? []).includes(day),
    usdRate: async (day): Promise<NbuRate> => {
      asked.push(day);
      const r = opts.rates?.[day] ?? 41.5;
      if (r === "fail") throw new Error("NBU timed out");
      return { rate: r, day };
    },
    write: async (o) => {
      writes.push(o);
    },
  };
  return { deps, writes, asked };
}

test("a hryvnia payment is written as is, with the template's comment", async () => {
  const f = fake();
  const r = await generateOccurrences(packaging, "2026-08-31", "2026-09-25", f.deps);
  assert.deepEqual(f.writes, [{ day: "2026-09-05", amountKop: 250_000, comment: "Нова пошта, коробки" }]);
  assert.deepEqual(r, { written: 1, generatedThrough: "2026-09-25", error: null });
  assert.deepEqual(f.asked, [], "no rate is asked for a hryvnia payment");
});

test("a dollar payment is converted at that day's NBU rate, and says so", async () => {
  const f = fake({ rates: { "2026-09-05": 44.7273 } });
  await generateOccurrences(strapi, "2026-08-31", "2026-09-25", f.deps);
  assert.deepEqual(f.writes, [{ day: "2026-09-05", amountKop: 137_939, comment: "30,84 USD × 44,7273 (НБУ 05.09.2026)" }]);
});

test("the conversion note comes before the template's own comment", async () => {
  const f = fake({ rates: { "2026-09-05": 44.7273 } });
  await generateOccurrences({ ...strapi, comment: "Pro plan" }, "2026-08-31", "2026-09-25", f.deps);
  assert.equal(f.writes[0].comment, "30,84 USD × 44,7273 (НБУ 05.09.2026) · Pro plan");
});

test("missed nights are caught up, oldest first", async () => {
  const f = fake();
  const r = await generateOccurrences(packaging, "2026-06-30", "2026-09-25", f.deps);
  assert.deepEqual(f.writes.map((w) => w.day), ["2026-07-05", "2026-08-05", "2026-09-05"]);
  assert.equal(r.written, 3);
});

test("an occurrence written before — even one whose Expense was since deleted — is not written again", async () => {
  const f = fake({ written: ["2026-09-05"] });
  const r = await generateOccurrences(packaging, null, "2026-09-25", f.deps);
  assert.deepEqual(f.writes.map((w) => w.day), ["2026-06-05", "2026-07-05", "2026-08-05"]);
  assert.equal(r.generatedThrough, "2026-09-25");
});

test("no NBU rate: nothing is guessed, the day stays pending for the next run, and the failure is reported", async () => {
  const f = fake({ rates: { "2026-08-05": "fail" } });
  const r = await generateOccurrences(strapi, "2026-06-30", "2026-09-25", f.deps);
  assert.deepEqual(f.writes.map((w) => w.day), ["2026-07-05"]);
  assert.deepEqual(r, { written: 1, generatedThrough: "2026-08-04", error: "2026-08-05: курс НБУ недоступний — NBU timed out" });

  // The next run picks up from the pending day.
  const next = fake();
  const r2 = await generateOccurrences(strapi, r.generatedThrough, "2026-09-26", next.deps);
  assert.deepEqual(next.writes.map((w) => w.day), ["2026-08-05", "2026-09-05"]);
  assert.equal(r2.generatedThrough, "2026-09-26");
});

test("nothing to cover leaves the run marker where it was", async () => {
  const f = fake();
  assert.deepEqual(await generateOccurrences(strapi, "2026-09-25", "2026-09-25", f.deps), {
    written: 0,
    generatedThrough: "2026-09-25",
    error: null,
  });
  assert.deepEqual(await generateOccurrences({ ...strapi, startsOn: "2026-10-01" }, null, "2026-09-25", f.deps), {
    written: 0,
    generatedThrough: null,
    error: null,
  });
  assert.deepEqual(f.writes, []);
});

test("a long template comment is cut to fit the Expense's 1000 characters", async () => {
  const f = fake();
  await generateOccurrences({ ...strapi, comment: "x".repeat(1000) }, "2026-08-31", "2026-09-25", f.deps);
  assert.equal(f.writes[0].comment!.length, 1000);
  assert.ok(f.writes[0].comment!.startsWith("30,84 USD"));
});
