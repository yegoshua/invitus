import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluatePromoCode,
  indexPromoCodes,
  normalizePromoCode,
  type PromoCode,
  type RawPromoCode,
} from "./promo.ts";

const NOW = new Date("2026-08-09T12:00:00Z");

function promo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    code: "VIPER_GYM",
    type: "percent",
    value: 10,
    activeFrom: null,
    activeTo: null,
    minOrderTotal: null,
    isActive: true,
    ...overrides,
  };
}

// ── normalisation ─────────────────────────────────────────────────────────

test("a code typed in lower case with stray spaces still matches", () => {
  assert.equal(normalizePromoCode("  viper_gym "), "VIPER_GYM");
});

// ── arithmetic ────────────────────────────────────────────────────────────

test("percent takes its share of the goods", () => {
  const result = evaluatePromoCode(promo({ type: "percent", value: 10 }), 4100, NOW);

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.discount, 410);
  assert.equal(result.ok && result.total, 3690);
});

test("fixed takes its stated sum", () => {
  const result = evaluatePromoCode(promo({ type: "fixed", value: 200 }), 4100, NOW);

  assert.equal(result.ok && result.discount, 200);
  assert.equal(result.ok && result.total, 3900);
});

test("a fixed code larger than the cart discounts the cart, never past zero", () => {
  // `fixed: 200` on a 150 UAH cart is a discount of 150, not a 50 UAH refund.
  const result = evaluatePromoCode(promo({ type: "fixed", value: 200 }), 150, NOW);

  assert.equal(result.ok && result.discount, 150);
  assert.equal(result.ok && result.total, 0);
});

test("the discount is whole hryvnia, so no copecks reach the invoice", () => {
  // 10% of 3819 is 381.9. Left unrounded the total renders as "3 437,1".
  const result = evaluatePromoCode(promo({ type: "percent", value: 10 }), 3819, NOW);

  assert.equal(result.ok && result.discount, 382);
  assert.equal(result.ok && result.total, 3437);
});

test("a percent code too small to reach one hryvnia costs nothing and still applies", () => {
  // The 0.50 UAH acquiring test product: 10% of 2 UAH rounds to 0.
  const result = evaluatePromoCode(promo({ type: "percent", value: 10 }), 2, NOW);

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.discount, 0);
  assert.equal(result.ok && result.total, 2);
});

// ── rules of eligibility, each with its own answer ────────────────────────

test("an unknown code is refused by name", () => {
  const result = evaluatePromoCode(undefined, 4100, NOW);

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.reason, "unknown");
  assert.match(!result.ok ? result.message : "", /не існує/);
});

test("the kill switch refuses the code", () => {
  const result = evaluatePromoCode(promo({ isActive: false }), 4100, NOW);

  assert.equal(!result.ok && result.reason, "inactive");
});

test("a code whose start date has not arrived is refused as not yet active", () => {
  const result = evaluatePromoCode(promo({ activeFrom: "2026-09-01" }), 4100, NOW);

  assert.equal(!result.ok && result.reason, "not-yet-active");
});

test("a code that ran out yesterday is refused as expired", () => {
  const result = evaluatePromoCode(promo({ activeTo: "2026-08-08" }), 4100, NOW);

  assert.equal(!result.ok && result.reason, "expired");
});

test("a date-only activeTo lasts to the end of that day, not to its midnight", () => {
  // Strapi's Date field has no time. A code "active to 9 Aug" that dies at
  // 00:00 on 9 Aug is off by a full day of trading.
  const result = evaluatePromoCode(promo({ activeTo: "2026-08-09" }), 4100, NOW);

  assert.equal(result.ok, true);
});

test("a code starting today works from the first minute of today", () => {
  const result = evaluatePromoCode(promo({ activeFrom: "2026-08-09" }), 4100, NOW);

  assert.equal(result.ok, true);
});

test("a cart below the minimum is refused, and the message names the minimum", () => {
  const result = evaluatePromoCode(promo({ minOrderTotal: 5000 }), 4100, NOW);

  assert.equal(!result.ok && result.reason, "below-minimum");
  assert.match(!result.ok ? result.message : "", /5\s?000/);
});

test("a cart exactly on the minimum qualifies", () => {
  const result = evaluatePromoCode(promo({ minOrderTotal: 4100 }), 4100, NOW);

  assert.equal(result.ok, true);
});

test("the kill switch outranks every other reason", () => {
  // An expired code that was also switched off must not report "expired" —
  // the owner turned it off, and that is the answer that matters.
  const result = evaluatePromoCode(
    promo({ isActive: false, activeTo: "2026-01-01" }),
    4100,
    NOW
  );

  assert.equal(!result.ok && result.reason, "inactive");
});

test("an empty cart cannot earn a discount", () => {
  const result = evaluatePromoCode(promo(), 0, NOW);

  assert.equal(result.ok && result.discount, 0);
});

test("a nonsense value in Strapi is refused rather than charged", () => {
  // A negative or non-finite `value` would otherwise become a surcharge.
  for (const value of [-10, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = evaluatePromoCode(promo({ value }), 4100, NOW);
    assert.equal(result.ok, false, `value ${value} should be refused`);
    assert.equal(!result.ok && result.reason, "unknown");
  }
});

test("an unparseable date is refused rather than silently ignored", () => {
  const result = evaluatePromoCode(promo({ activeTo: "not a date" }), 4100, NOW);

  assert.equal(result.ok, false);
});

// ── reading the list the CMS actually returns ─────────────────────────────

function row(overrides: Partial<RawPromoCode> = {}): RawPromoCode {
  return {
    code: "VIPER_GYM",
    type: "percent",
    value: 10,
    activeFrom: null,
    activeTo: null,
    minOrderTotal: null,
    isActive: true,
    ...overrides,
  };
}

test("a code entered in Strapi in lower case is still found", () => {
  assert.equal(
    indexPromoCodes([row({ code: " viper_gym " })]).get("VIPER_GYM")?.code,
    "VIPER_GYM"
  );
});

test("two rows claiming one code resolve to the older one, always", () => {
  // Strapi 5's `unique` does not hold across draft/publish (#47), so this is a
  // state the CMS can genuinely be in. Rows arrive oldest-first.
  const index = indexPromoCodes([row({ value: 10 }), row({ value: 50 })]);

  assert.equal(index.size, 1);
  assert.equal(index.get("VIPER_GYM")?.value, 10);
});

test("a row with a type this code cannot price is left out", () => {
  assert.equal(indexPromoCodes([row({ type: "buy-one-get-one" })]).size, 0);
});

test("a row with no code is skipped rather than keyed on the empty string", () => {
  assert.equal(indexPromoCodes([row({ code: null })]).size, 0);
  assert.equal(indexPromoCodes([row({ code: "   " })]).size, 0);
});

test("a missing isActive is off, not on", () => {
  const indexed = indexPromoCodes([row({ isActive: null })]).get("VIPER_GYM");

  assert.equal(indexed?.isActive, false);
  // And the switch being off is what the evaluation then reports.
  assert.equal(
    !evaluatePromoCode(indexed, 4100, NOW).ok &&
      (evaluatePromoCode(indexed, 4100, NOW) as { reason: string }).reason,
    "inactive"
  );
});

test("the rules a code carries survive indexing", () => {
  const index = indexPromoCodes([
    row({
      type: "fixed",
      value: 200,
      activeFrom: "2026-01-01",
      activeTo: "2026-12-31",
      minOrderTotal: 3000,
    }),
  ]);

  assert.deepEqual(index.get("VIPER_GYM"), {
    code: "VIPER_GYM",
    type: "fixed",
    value: 200,
    activeFrom: "2026-01-01",
    activeTo: "2026-12-31",
    minOrderTotal: 3000,
    isActive: true,
  });
});
