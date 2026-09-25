import assert from "node:assert/strict";
import { test } from "node:test";
import { deltaLabel, plural, profitDeltaLabel, rangeLabel, shortAmount, uah, uahExact } from "./format.ts";

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

test("an Expense keeps its kopecks; a whole amount does not grow a ,00", () => {
  assert.equal(uahExact(420.5), `420,50${NBSP}₴`);
  assert.equal(uahExact(2400), `2${NBSP}400${NBSP}₴`);
  assert.equal(uahExact(0.01), `0,01${NBSP}₴`);
});

test("Profit crossing zero is told as the old figure, not a percentage", () => {
  // −300% of a loss means nothing to anyone.
  assert.deepEqual(profitDeltaLabel(5000, -2000), { text: `було −2${NBSP}000${NBSP}₴`, direction: 0 });
  assert.deepEqual(profitDeltaLabel(-500, 3000), { text: `було 3${NBSP}000${NBSP}₴`, direction: 0 });
  assert.deepEqual(profitDeltaLabel(1000, 0), { text: `було 0${NBSP}₴`, direction: 0 });
});

test("Profit on the same side of zero is an ordinary delta", () => {
  assert.deepEqual(profitDeltaLabel(1200, 1000), deltaLabel(1200, 1000));
  // A smaller loss is an improvement: the arrow points up.
  assert.equal(profitDeltaLabel(-500, -1000)!.direction, 1);
});
