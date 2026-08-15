import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { trackEvent } from "./gtag.ts";

interface FakeWindow {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

function withWindow(win: FakeWindow) {
  (globalThis as { window?: FakeWindow }).window = win;
}

afterEach(() => {
  delete (globalThis as { window?: FakeWindow }).window;
});

test("sends through window.gtag once gtag.js has defined it", () => {
  const calls: unknown[][] = [];
  withWindow({ gtag: (...args) => calls.push(args) });

  trackEvent("purchase", {
    transaction_id: "1021",
    value: 4920,
    items: [],
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], "event");
  assert.deepEqual(calls[0][1], "purchase");
  assert.deepEqual(calls[0][2], {
    currency: "UAH",
    transaction_id: "1021",
    value: 4920,
    items: [],
  });
});

// The regression. A first-commit mount effect — view_item, view_item_list, and
// the purchase on /payment-result — runs before gtag.js has defined window.gtag.
// trackEvent used to return silently there, so the ONE online sale the site
// took was never counted while both cash-on-delivery sales were. Queueing means
// the event waits for gtag.js instead of disappearing.
test("queues into dataLayer when window.gtag does not exist yet", () => {
  const dataLayer: unknown[] = [];
  withWindow({ dataLayer });

  trackEvent("purchase", {
    transaction_id: "1021",
    value: 4920,
    items: [],
  });

  assert.equal(dataLayer.length, 1);

  // gtag.js only recognises a queued command by its Arguments shape — an array
  // would be dropped on the floor by the very library meant to replay it.
  const queued = dataLayer[0] as IArguments;
  assert.equal(Object.prototype.toString.call(queued), "[object Arguments]");
  assert.equal(queued.length, 3);
  assert.equal(queued[0], "event");
  assert.equal(queued[1], "purchase");
  assert.deepEqual(queued[2], {
    currency: "UAH",
    transaction_id: "1021",
    value: 4920,
    items: [],
  });
});

test("prefers gtag over the queue when both are available", () => {
  const dataLayer: unknown[] = [];
  const calls: unknown[][] = [];
  withWindow({ dataLayer, gtag: (...args) => calls.push(args) });

  trackEvent("add_to_cart", { value: 2100, items: [] });

  assert.equal(calls.length, 1);
  assert.equal(dataLayer.length, 0);
});

test("does not throw when GA is absent from the build entirely", () => {
  withWindow({});
  assert.doesNotThrow(() => trackEvent("view_cart", { value: 0, items: [] }));
});
