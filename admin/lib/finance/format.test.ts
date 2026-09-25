import assert from "node:assert/strict";
import { test } from "node:test";
import { deltaLabel, plural, rangeLabel, shortAmount, uah } from "./format.ts";
import { estimatedFee } from "./payments.ts";

const NBSP = " ";

test("money uses non-breaking spaces and a real minus", () => {
  assert.equal(uah(4100), `4${NBSP}100${NBSP}₴`);
  assert.equal(uah(-1250.4), `−1${NBSP}250${NBSP}₴`);
  assert.equal(uah(0), `0${NBSP}₴`);
});

test("axis amounts shorten from a thousand", () => {
  assert.equal(shortAmount(800), "800");
  assert.equal(shortAmount(12_500), `12,5${NBSP}тис`);
  assert.equal(shortAmount(-3000), `−3${NBSP}тис`);
});

test("Ukrainian plurals, including the teens", () => {
  const f = (n: number) => plural(n, "день", "дні", "днів");
  assert.deepEqual([1, 2, 5, 11, 12, 21, 22, 25, 111].map(f), ["день", "дні", "днів", "днів", "днів", "день", "дні", "днів", "днів"]);
});

test("ranges collapse within a month and name the year across one", () => {
  assert.equal(rangeLabel({ from: "2026-09-01", to: "2026-09-25" }), `1–25${NBSP}вер`);
  assert.equal(rangeLabel({ from: "2026-08-27", to: "2026-09-25" }), `27${NBSP}серп – 25${NBSP}вер`);
  assert.equal(rangeLabel({ from: "2025-12-30", to: "2026-01-05" }), `30${NBSP}груд 2025 – 5${NBSP}січ`);
});

test("deltas", () => {
  assert.deepEqual(deltaLabel(150, 100), { text: `↑${NBSP}50%`, direction: 1 });
  assert.deepEqual(deltaLabel(-50, -100), { text: `↑${NBSP}50%`, direction: 1 });
  assert.equal(deltaLabel(10, 0), null);
});

test("estimated fee by method; unknown and cash on delivery cost nothing", () => {
  assert.equal(estimatedFee(4100, 2), 53);
  assert.equal(estimatedFee(4100, 9), 144);
  assert.equal(estimatedFee(4100, 6), 0);
  assert.equal(estimatedFee(4100, null), 0);
  assert.equal(estimatedFee(4100, 99), 0);
});
