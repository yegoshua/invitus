import test from "node:test";
import assert from "node:assert/strict";

import { evaluateBudget } from "./evaluate-budget.mjs";

/** The shape `perf/budget.json` commits, trimmed to what a case needs. */
function budget(overrides = {}) {
  return {
    budgets: [
      {
        path: "/*",
        timings: [
          { metric: "largest-contentful-paint", budget: 2500 },
          { metric: "speed-index", budget: 4000 },
          { metric: "cumulative-layout-shift", budget: 0 },
          { metric: "total-blocking-time", budget: 200 },
        ],
        resourceSizes: [{ resourceType: "total", budget: 3072 }],
      },
    ],
    soft: ["total-blocking-time"],
    ...overrides,
  };
}

const passing = {
  "largest-contentful-paint": 2100,
  "speed-index": 3200,
  "cumulative-layout-shift": 0,
  "total-blocking-time": 150,
  "transfer-before-load": 2 * 1024 * 1024,
};

test("every metric inside its threshold passes", () => {
  const { pass, results } = evaluateBudget(budget(), passing);

  assert.equal(pass, true);
  assert.equal(results.length, 5);
  assert.ok(results.every((r) => r.status === "pass"));
});

test("a metric over its threshold fails the run", () => {
  const { pass, results } = evaluateBudget(budget(), {
    ...passing,
    "largest-contentful-paint": 2501,
  });

  assert.equal(pass, false);
  const lcp = results.find((r) => r.metric === "largest-contentful-paint");
  assert.equal(lcp.status, "fail");
  assert.equal(lcp.soft, false);
});

test("a soft metric over its threshold warns but does not fail the run", () => {
  const { pass, results } = evaluateBudget(budget(), {
    ...passing,
    "total-blocking-time": 370,
  });

  assert.equal(pass, true, "TBT is a target, not a gate (#34)");
  const tbt = results.find((r) => r.metric === "total-blocking-time");
  assert.equal(tbt.status, "warn");
  assert.equal(tbt.soft, true);
});

test("a soft metric inside its threshold still reads as a pass", () => {
  const { results } = evaluateBudget(budget(), passing);

  assert.equal(
    results.find((r) => r.metric === "total-blocking-time").status,
    "pass",
  );
});

test("CLS budget of 0 admits exactly 0 and nothing above it", () => {
  assert.equal(evaluateBudget(budget(), passing).pass, true);
  assert.equal(
    evaluateBudget(budget(), { ...passing, "cumulative-layout-shift": 0.01 })
      .pass,
    false,
  );
});

test("a metric exactly on its threshold passes", () => {
  const { pass } = evaluateBudget(budget(), {
    ...passing,
    "largest-contentful-paint": 2500,
    "transfer-before-load": 3072 * 1024,
  });

  assert.equal(pass, true);
});

test("transfer weight is compared in KiB, as the budget states it", () => {
  const { results } = evaluateBudget(budget(), {
    ...passing,
    "transfer-before-load": 4 * 1024 * 1024,
  });

  const transfer = results.find((r) => r.metric === "transfer-before-load");
  assert.equal(transfer.status, "fail");
  assert.equal(transfer.budget, 3072);
  assert.equal(transfer.value, 4096);
  assert.equal(transfer.unit, "KiB");
});

test("a metric the run did not produce is an error, not a silent pass", () => {
  const measured = { ...passing };
  delete measured["speed-index"];

  const { pass, results } = evaluateBudget(budget(), measured);

  assert.equal(pass, false);
  assert.equal(
    results.find((r) => r.metric === "speed-index").status,
    "missing",
  );
});

test("thresholds come only from the committed budget file", () => {
  const { results } = evaluateBudget(
    budget({
      budgets: [
        {
          path: "/*",
          timings: [{ metric: "largest-contentful-paint", budget: 1000 }],
          resourceSizes: [],
        },
      ],
    }),
    passing,
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].status, "fail");
  assert.equal(results[0].budget, 1000);
});
