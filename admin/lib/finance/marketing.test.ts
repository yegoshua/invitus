import assert from "node:assert/strict";
import { test } from "node:test";
import { cacLabel, marketingFigures, roasLabel } from "./marketing.ts";

test("ROAS is Revenue ÷ Ad spend, CAC is Ad spend ÷ Sales — for the period and the one before", () => {
  const m = marketingFigures({ revenue: 39_000, sales: 12, adSpend: 6_000 }, { revenue: 20_000, sales: 5, adSpend: 5_000 });
  assert.deepEqual(m, { roas: 6.5, cac: 500, previousRoas: 4, previousCac: 1_000 });
});

test("no Ad spend: ROAS has no value — not Infinity, not NaN — and CAC is a free Sale, not a cost", () => {
  const m = marketingFigures({ revenue: 12_000, sales: 3, adSpend: 0 }, { revenue: 0, sales: 0, adSpend: 0 });
  assert.equal(m.roas, null);
  assert.equal(m.previousRoas, null);
  assert.equal(m.cac, null);
  assert.equal(m.previousCac, null);
});

test("no Sales: CAC has no value; ROAS is an honest 0", () => {
  const m = marketingFigures({ revenue: 0, sales: 0, adSpend: 2_500 }, { revenue: 0, sales: 0, adSpend: 0 });
  assert.equal(m.cac, null);
  assert.equal(m.roas, 0);
});

test("a figure is kept to the kopeck, not to the float's tail", () => {
  const m = marketingFigures({ revenue: 10_000, sales: 3, adSpend: 3_000 }, { revenue: 0, sales: 0, adSpend: 0 });
  assert.equal(m.cac, 1_000);
  const n = marketingFigures({ revenue: 10_000, sales: 3, adSpend: 1_000.01 }, { revenue: 0, sales: 0, adSpend: 0 });
  assert.equal(n.cac, 333.34);
});

test("ROAS reads as a multiple: one decimal, a comma, the × sign", () => {
  assert.equal(roasLabel(6.5), "6,5×");
  assert.equal(roasLabel(6.46), "6,5×");
  assert.equal(roasLabel(4), "4,0×");
  assert.equal(roasLabel(0), "0,0×");
  assert.equal(roasLabel(12.04), "12,0×");
  assert.equal(roasLabel(null), "—");
});

test("CAC reads as money, or a dash when there is none", () => {
  assert.equal(cacLabel(1_250.4), "1\u00a0250\u00a0₴");
  assert.equal(cacLabel(null), "—");
});
