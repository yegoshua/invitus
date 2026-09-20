import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PARTS,
  PARTS_MIN_TOTAL,
  PARTS_OPTIONS,
  fromMonthlyLabel,
  isPartsCount,
  lowestMonthly,
  monthlyPayment,
  partsAvailable,
  partsFailureMessage,
  partsOptionLabel,
  partsOutcome,
  partsPhone,
  partsProducts,
  partsSchedule,
  remainingLabel,
} from "./installments.ts";

// U+00A0 — the group separator formatPrice uses.
const NBSP = " ";

test("the design's three part counts, six pre-selected", () => {
  assert.deepEqual([...PARTS_OPTIONS], [4, 6, 8]);
  assert.equal(DEFAULT_PARTS, 6);
  assert.ok(isPartsCount(6));
  assert.ok(!isPartsCount(5));
  assert.ok(!isPartsCount("6"));
});

test("a payment is rounded up so the parts never sum below the total", () => {
  // 4 100 / 6 = 683.33 → 684, the figure the design prints.
  assert.equal(monthlyPayment(4100, 6), 684);
  assert.equal(monthlyPayment(4100, 4), 1025);
  assert.equal(monthlyPayment(4100, 8), 513);
  for (const parts of PARTS_OPTIONS) {
    assert.ok(monthlyPayment(4100, parts) * parts >= 4100);
  }
});

test("the floor is one number and is inclusive", () => {
  assert.equal(partsAvailable(PARTS_MIN_TOTAL), true);
  assert.equal(partsAvailable(PARTS_MIN_TOTAL - 1), false);
  assert.equal(partsAvailable(NaN), false);
});

test("the product button quotes the longest plan, or nothing", () => {
  assert.equal(lowestMonthly(4100), 513);
  assert.equal(fromMonthlyLabel(4100), `Від 513 ₴ / міс`);
  assert.equal(lowestMonthly(1200), null);
  assert.equal(fromMonthlyLabel(1200), null);
});

test("labels read the way the design writes them", () => {
  assert.equal(partsOptionLabel(4100, 6), `6 × 684 ₴`);
  assert.equal(partsOptionLabel(4100, 4), `4 × 1${NBSP}025 ₴`);
  const schedule = partsSchedule(4100, 6);
  assert.equal(schedule.monthly, 684);
  assert.equal(schedule.remainingCount, 5);
  assert.equal(remainingLabel(schedule), `5 × 684 ₴`);
});

test("the phone goes to the bank as +380XXXXXXXXX or not at all", () => {
  assert.equal(partsPhone("+380 (67) 123 45 67"), "+380671234567");
  assert.equal(partsPhone("0671234567"), "+380671234567");
  assert.equal(partsPhone("380671234567"), "+380671234567");
  // A foreign number cannot have a mono account behind it.
  assert.equal(partsPhone("+49 30 901820"), null);
  assert.equal(partsPhone("+38067123456"), null);
});

test("client approval is the approved moment; success states stay approved", () => {
  assert.equal(partsOutcome("IN_PROCESS", "WAITING_FOR_CLIENT"), "pending");
  assert.equal(partsOutcome("IN_PROCESS", "WAITING_FOR_STORE_CONFIRM"), "approved");
  assert.equal(partsOutcome("SUCCESS", "ACTIVE"), "approved");
  assert.equal(partsOutcome("SUCCESS", "DONE"), "approved");
  assert.equal(partsOutcome("FAIL", "REJECTED_BY_CLIENT"), "failed");
  assert.equal(partsOutcome("FAIL", "SOMETHING_NEW"), "failed");
  // Unknown is not a refusal: the result page times out, the group is not
  // told a customer was refused when they were not.
  assert.equal(partsOutcome(undefined, undefined), "pending");
  assert.equal(partsOutcome("IN_PROCESS", "NEW_SUB_STATE"), "pending");
});

test("products sum to the financed total, with and without a promo", () => {
  const lines = [
    { name: "Berserk Lifting Belt", size: "M", quantity: 1, unitPrice: 4100, lineTotal: 4100 },
    { name: "Wrist Wraps", size: null, quantity: 2, unitPrice: 550, lineTotal: 1100 },
  ];
  const plain = partsProducts(lines, 5200);
  assert.deepEqual(plain, [
    { name: "Berserk Lifting Belt (M)", count: 1, sum: 4100 },
    { name: "Wrist Wraps", count: 2, sum: 550 },
  ]);

  // 10% off: 5 200 → 4 680. 4100 × 0.9 = 3690, 1100 × 0.9 = 990.
  const discounted = partsProducts(lines, 4680);
  assert.equal(
    discounted.reduce((s, p) => s + p.sum * p.count, 0),
    4680
  );
  assert.deepEqual(discounted, [
    { name: "Berserk Lifting Belt (M)", count: 1, sum: 3690 },
    { name: "Wrist Wraps × 2", count: 1, sum: 990 },
  ]);

  // An awkward discount: the remainder lands on the last line, to the copeck.
  const awkward = partsProducts(lines, 4333);
  assert.equal(
    Math.round(awkward.reduce((s, p) => s + p.sum * p.count, 0) * 100),
    433300
  );
  for (const p of awkward) assert.equal(Math.round(p.sum * 100) / 100, p.sum);
});

test("every documented refusal has a Ukrainian sentence", () => {
  const documented = [
    "CLIENT_NOT_FOUND",
    "EXCEEDED_SUM_LIMIT",
    "EXISTS_OTHER_OPEN_ORDER",
    "NOT_ENOUGH_MONEY_FOR_INIT_DEBIT",
    "REJECTED_BY_CLIENT",
    "CLIENT_PUSH_TIMEOUT",
    "REJECTED_BY_STORE",
    "PAY_PARTS_ARE_NOT_ACCEPTABLE",
    "FRAUD_REJECTED",
    "RESTRICTED_BY_RISKS",
    "FAIL",
    "SOMETHING_NEW",
  ];
  for (const sub of documented) {
    const message = partsFailureMessage(sub);
    assert.ok(message.length > 20, sub);
    assert.doesNotMatch(message, /[A-Z_]{6,}/, `${sub} leaks a constant`);
  }
});
