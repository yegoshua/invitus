import assert from "node:assert/strict";
import { test } from "node:test";
import { fxNote, parseNbuRate, templateAmount, usdToKop } from "./currency.ts";

test("cents at the NBU rate become kopecks, rounded to the kopeck", () => {
  // Strapi Cloud: 30.84 USD × 44.7273 = 1379.389… ₴
  assert.equal(usdToKop(3084, 44.7273), 137_939);
  // KeyCRM: 19.00 USD × 41.2345 = 783.4555 ₴
  assert.equal(usdToKop(1900, 41.2345), 78_346);
});

test("a float's reading of an exact half still rounds as the half it is", () => {
  // 30.00 USD × 41.2345 = 1237.035 ₴ exactly; a float computes 123703.49999… kopecks
  assert.equal(usdToKop(3000, 41.2345), 123_704);
  assert.equal(usdToKop(1, 41.5), 42);
});

test("the NBU answer is read for its rate and its day", () => {
  const json = [{ r030: 840, txt: "Долар США", rate: 44.7273, cc: "USD", exchangedate: "05.09.2026", special: "N" }];
  assert.deepEqual(parseNbuRate(json), { rate: 44.7273, day: "2026-09-05" });
});

test("an empty, odd or non-positive NBU answer is no rate at all", () => {
  assert.equal(parseNbuRate([]), null);
  assert.equal(parseNbuRate(null), null);
  assert.equal(parseNbuRate({ rate: 41 }), null);
  assert.equal(parseNbuRate([{ rate: 0, exchangedate: "05.09.2026" }]), null);
  assert.equal(parseNbuRate([{ rate: "41.2", exchangedate: "05.09.2026" }]), null);
  assert.equal(parseNbuRate([{ rate: 41.2, exchangedate: "2026-09-05" }]), null);
});

test("the generated Expense says how its amount was reached", () => {
  assert.equal(fxNote(3084, { rate: 44.7273, day: "2026-09-05" }), "30,84 USD × 44,7273 (НБУ 05.09.2026)");
  assert.equal(fxNote(1900, { rate: 41.5, day: "2026-09-01" }), "19,00 USD × 41,5 (НБУ 01.09.2026)");
});

test("a template's amount is written in its own currency, with the Admin's non-breaking spaces", () => {
  const plain = (s: string) => s.replace(/\u00a0/g, " ");
  assert.equal(plain(templateAmount(3084, "USD")), "30,84 $");
  assert.equal(plain(templateAmount(1900, "USD")), "19 $");
  assert.equal(plain(templateAmount(125_000, "UAH")), "1 250 ₴");
  assert.equal(plain(templateAmount(125_050, "UAH")), "1 250,50 ₴");
});
