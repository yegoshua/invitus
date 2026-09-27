import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAmount, parseExpenseInput } from "./input.ts";

const TODAY = "2026-09-25";
const valid = {
  title: "Пакування: коробки",
  amount: "2 400",
  date: "2026-09-24",
  category: "packaging",
  orderId: "",
  comment: "",
};

test("amounts are kopecks, whatever way a person types them", () => {
  assert.equal(parseAmount("2400"), 240_000);
  assert.equal(parseAmount("2 400"), 240_000);
  assert.equal(parseAmount("2 400"), 240_000); // non-breaking space, pasted from the Admin itself
  assert.equal(parseAmount("1250,50"), 125_050);
  assert.equal(parseAmount("1250.5"), 125_050);
  assert.equal(parseAmount("4 100 ₴"), 410_000);
  assert.equal(parseAmount("0,01"), 1);
});

test("an amount that is not a positive number of kopecks is rejected", () => {
  for (const bad of ["", "0", "-50", "12,345", "1,2,3", "abc", "1e5"]) {
    assert.equal(parseAmount(bad), null, bad);
  }
});

test("a valid entry parses into the stored shape", () => {
  const r = parseExpenseInput({ ...valid, orderId: "№1042", comment: "  дві пачки  " }, TODAY);
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    title: "Пакування: коробки",
    amountKop: 240_000,
    date: "2026-09-24",
    category: "packaging",
    orderId: 1042,
    comment: "дві пачки",
  });
});

test("optional fields left empty are null, not empty strings", () => {
  const r = parseExpenseInput(valid, TODAY);
  assert.ok(r.ok);
  assert.equal(r.value.orderId, null);
  assert.equal(r.value.comment, null);
});

test("each bad field gets its own message", () => {
  const r = parseExpenseInput(
    { title: "  ", amount: "0", date: "2026-02-30", category: "meta", orderId: "abc", comment: "" },
    TODAY
  );
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys(r.errors).sort(), ["amount", "category", "date", "orderId", "title"]);
  assert.equal(r.errors.title, "Вкажи назву");
});

test("a date in the future is refused: an Expense is money that has already gone", () => {
  const r = parseExpenseInput({ ...valid, date: "2026-09-26" }, TODAY);
  assert.ok(!r.ok);
  assert.ok(r.errors.date);
  assert.ok(parseExpenseInput({ ...valid, date: TODAY }, TODAY).ok);
});

test("a date before the accounting start is refused", () => {
  const r = parseExpenseInput({ ...valid, date: "2025-12-31" }, TODAY);
  assert.ok(!r.ok);
  assert.ok(r.errors.date);
});

test("the ad categories filled automatically cannot be chosen by hand", () => {
  for (const category of ["meta", "google", "", "Інше"]) {
    assert.ok(!parseExpenseInput({ ...valid, category }, TODAY).ok, category);
  }
});

test("missing fields are errors, not crashes", () => {
  const r = parseExpenseInput({}, TODAY);
  assert.ok(!r.ok);
  assert.ok(r.errors.title && r.errors.amount && r.errors.date && r.errors.category);
});
