import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cartSizeLabel, sizeDisplayText, sizeIsAChoice } from "./size-display.ts";
import type { CartItem, Product } from "@/types";

const belt = {
  id: "1",
  name: "Belt",
  sizes: [
    { value: "S", label: "65-80 см", inStock: true },
    { value: "M", label: "72.5-90 см", inStock: true },
  ],
} as unknown as Product;

const strap = {
  id: "2",
  name: "Strap",
  sizes: [{ value: "Універсальний", label: "Універсальний", inStock: true }],
} as unknown as Product;

describe("sizeDisplayText", () => {
  it("joins the KeyCRM letter with the Strapi range", () => {
    assert.equal(sizeDisplayText("S", "65-80 см"), "S · 65-80 см");
  });

  it("does not repeat a size that has no separate wording", () => {
    assert.equal(sizeDisplayText("S", "S"), "S");
  });
});

describe("cartSizeLabel", () => {
  it("prints the same text as the product page chip", () => {
    const item: CartItem = {
      product: belt,
      quantity: 1,
      size: "S",
      sizeLabel: "65-80 см",
    };
    assert.equal(cartSizeLabel(item), "S · 65-80 см");
  });

  it("falls back to the value when the label was never stored", () => {
    const item: CartItem = { product: belt, quantity: 1, size: "M" };
    assert.equal(cartSizeLabel(item), "M");
  });

  it("is silent for a one-size product", () => {
    assert.equal(sizeIsAChoice(strap.sizes), false);
    const item: CartItem = {
      product: strap,
      quantity: 1,
      size: "Універсальний",
    };
    assert.equal(cartSizeLabel(item), null);
  });
});
