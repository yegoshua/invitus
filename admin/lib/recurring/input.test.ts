import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRecurringInput } from "./input.ts";

const valid = {
  title: "Strapi Cloud",
  currency: "UAH",
  amount: "1 250",
  category: "services",
  cadence: "monthly",
  dayOfMonth: "5",
  month: "",
  startsOn: "2026-09-01",
  endsOn: "",
  comment: "",
};

test("a valid monthly template parses into the stored shape", () => {
  const r = parseRecurringInput({ ...valid, comment: "  $30, орієнтовно  " });
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    title: "Strapi Cloud",
    currency: "UAH",
    amountMinor: 125_000,
    category: "services",
    cadence: "monthly",
    dayOfMonth: 5,
    month: null,
    startsOn: "2026-09-01",
    endsOn: null,
    comment: "$30, орієнтовно",
  });
});

test("a dollar template keeps its amount in cents", () => {
  const r = parseRecurringInput({ ...valid, currency: "USD", amount: "30,84" });
  assert.ok(r.ok);
  assert.equal(r.value.currency, "USD");
  assert.equal(r.value.amountMinor, 3084);
});

test("the currency defaults to hryvnias, and only the two known ones are accepted", () => {
  const r = parseRecurringInput({ ...valid, currency: "" });
  assert.ok(r.ok);
  assert.equal(r.value.currency, "UAH");
  const eur = parseRecurringInput({ ...valid, currency: "EUR" });
  assert.ok(!eur.ok);
  assert.deepEqual(Object.keys(eur.errors), ["currency"]);
});

test("a monthly template ignores a month left in the form", () => {
  const r = parseRecurringInput({ ...valid, month: "3" });
  assert.ok(r.ok);
  assert.equal(r.value.month, null);
});

test("the category defaults to Сервіси", () => {
  const r = parseRecurringInput({ ...valid, category: "" });
  assert.ok(r.ok);
  assert.equal(r.value.category, "services");
});

test("a yearly template needs its month, and a day that month can have", () => {
  const ok = parseRecurringInput({ ...valid, cadence: "yearly", month: "2", dayOfMonth: "29" });
  assert.ok(ok.ok);
  assert.equal(ok.value.month, 2);

  const noMonth = parseRecurringInput({ ...valid, cadence: "yearly", month: "" });
  assert.ok(!noMonth.ok);
  assert.equal(noMonth.errors.month, "Обери місяць");

  const april31 = parseRecurringInput({ ...valid, cadence: "yearly", month: "4", dayOfMonth: "31" });
  assert.ok(!april31.ok);
  assert.ok(april31.errors.dayOfMonth);
});

test("a monthly day of 31 is allowed — shorter months take their last day", () => {
  assert.ok(parseRecurringInput({ ...valid, dayOfMonth: "31" }).ok);
});

test("the end, when given, is not before the start", () => {
  const r = parseRecurringInput({ ...valid, endsOn: "2026-08-31" });
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys(r.errors), ["endsOn"]);
  const same = parseRecurringInput({ ...valid, endsOn: "2026-09-01" });
  assert.ok(same.ok);
  assert.equal(same.value.endsOn, "2026-09-01");
});

test("each bad field gets its own message", () => {
  const r = parseRecurringInput({
    title: " ",
    amount: "0",
    category: "ads",
    cadence: "weekly",
    dayOfMonth: "32",
    month: "",
    startsOn: "2026-02-30",
    endsOn: "",
    comment: "",
  });
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys(r.errors).sort(), ["amount", "cadence", "category", "dayOfMonth", "startsOn", "title"]);
  assert.equal(r.errors.title, "Вкажи назву");
});
