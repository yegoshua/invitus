import { test } from "node:test";
import assert from "node:assert/strict";

import {
  categoryMetaDescription,
  categoryMetaTitle,
  productMetaTitle,
} from "./seo-copy.ts";

test("a product title carries its category's search phrase after the name", () => {
  assert.equal(
    productMetaTitle("Final Selection Lifting Belt", "belts"),
    "Final Selection Lifting Belt — пояс для пауерліфтингу | INVITUS"
  );
  assert.equal(
    productMetaTitle("Viper Wrist Wraps", "wrist-wraps"),
    "Viper Wrist Wraps — кистьові бинти для пауерліфтингу | INVITUS"
  );
});

// A category with no phrase of its own (shirts, or one created in KeyCRM
// yesterday) keeps the plain title rather than borrowing the belts' phrase.
test("a product outside the mapped categories keeps the plain title", () => {
  assert.equal(productMetaTitle("INVITUS Tee", "shirts"), "INVITUS Tee | INVITUS");
  assert.equal(productMetaTitle("Something", undefined), "Something | INVITUS");
});

test("a category title leads with the search phrase and the intent to buy", () => {
  assert.equal(
    categoryMetaTitle({ slug: "belts", name: "Атлетичні пояси" }),
    "Атлетичні пояси для пауерліфтингу — купити | INVITUS"
  );
  assert.equal(
    categoryMetaTitle({ slug: "straps", name: "Лямки Вісімки" }),
    "Лямки для станової тяги — купити | INVITUS"
  );
});

test("an unmapped category title falls back to its KeyCRM name", () => {
  assert.equal(
    categoryMetaTitle({ slug: "shirts", name: "Футболки" }),
    "Футболки — купити | INVITUS"
  );
});

// Every promise in the description is one the site keeps for every product in
// the category: Nova Poshta delivery, online payment or cash on delivery, the
// 14-day return from /refund. Instalments are not in it — they start at
// 4 100 ₴, and most of the catalogue sits below that.
test("a category description names what is bought and how it arrives", () => {
  const description = categoryMetaDescription({ slug: "belts", name: "Атлетичні пояси" });

  assert.match(description, /^Атлетичні пояси INVITUS — купити пояс для пауерліфтингу/);
  assert.match(description, /Новою поштою/);
  assert.match(description, /повернення 14 днів/);
  assert.doesNotMatch(description, /частинами/);
  // Google cuts a description at roughly 155–160 characters.
  assert.ok(description.length <= 160, `${description.length} chars`);
});

test("an unmapped category description still reads as a sentence", () => {
  assert.match(
    categoryMetaDescription({ slug: "shirts", name: "Футболки" }),
    /^Футболки INVITUS — купити з доставкою Новою поштою/
  );
});
