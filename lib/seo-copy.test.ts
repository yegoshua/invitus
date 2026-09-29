import { test } from "node:test";
import assert from "node:assert/strict";

import {
  categoryMetaDescription,
  categoryMetaTitle,
  imageAlt,
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
// 4 100 ₴, and a product under that cannot be bought in parts.
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

// Strapi's gallery shipped entries whose alt is a placeholder the editor never
// replaced — production printed alt="product-image-1" under a belt photo.
test("a placeholder alt from the CMS gives way to the product name", () => {
  assert.equal(
    imageAlt(["product-image-1"], "Final Selection Lifting Belt"),
    "Final Selection Lifting Belt"
  );
  assert.equal(imageAlt(["IMG_2041.jpg", "image"], "Belt"), "Belt");
  assert.equal(imageAlt([undefined, "", "  "], "Belt"), "Belt");
});

test("a real alt from the CMS is kept, first one wins", () => {
  assert.equal(
    imageAlt(["Пояс на помості", "product-image-1"], "Belt"),
    "Пояс на помості"
  );
  assert.equal(imageAlt([undefined, "Застібка крупним планом"], "Belt"), "Застібка крупним планом");
});
