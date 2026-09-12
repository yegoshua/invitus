import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { trackEvent } from "./gtag.ts";

type Call = unknown[];

function withFbq(): Call[] {
  const calls: Call[] = [];
  (globalThis as { window?: unknown }).window = {
    fbq: (...args: unknown[]) => calls.push(args),
    gtag: () => {},
  };
  return calls;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

const item = { item_id: "44", item_name: "Belt", price: 2100, quantity: 2 };

test("a GA4 purchase reaches Meta as Purchase with a dedup eventID", () => {
  const calls = withFbq();

  trackEvent("purchase", { transaction_id: "1021", value: 4200, items: [item] });

  assert.deepEqual(calls, [
    [
      "track",
      "Purchase",
      {
        currency: "UAH",
        content_type: "product",
        content_ids: ["44"],
        contents: [{ id: "44", quantity: 2, item_price: 2100 }],
        value: 4200,
        num_items: 2,
      },
      { eventID: "purchase_1021" },
    ],
  ]);
});

test("add_to_cart and view_item map to their Meta standard events", () => {
  const calls = withFbq();

  trackEvent("add_to_cart", { value: 2100, items: [item] });
  trackEvent("view_item", { value: 2100, items: [item] });

  assert.deepEqual(
    calls.map((c) => c[1]),
    ["AddToCart", "ViewContent"]
  );
});

test("GA-only events are not sent to Meta", () => {
  const calls = withFbq();

  trackEvent("view_item_list", { items: [item] });
  trackEvent("remove_from_cart", { value: 0, items: [] });

  assert.equal(calls.length, 0);
});

test("no fbq (preview host, dev) is a silent no-op", () => {
  (globalThis as { window?: unknown }).window = { gtag: () => {} };
  assert.doesNotThrow(() => trackEvent("purchase", { transaction_id: "1", value: 1, items: [] }));
});
