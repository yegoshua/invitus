import test from "node:test";
import assert from "node:assert/strict";

import {
  ORDER_ACTIONS,
  decodeCallback,
  encodeCallback,
} from "./telegram-actions.ts";

test("every callback fits Telegram's 64-byte limit", () => {
  // Exceeding it is rejected at sendMessage time, so the whole notification is
  // lost — and only for orders whose id got long enough.
  for (const action of ORDER_ACTIONS) {
    const data = encodeCallback(999999999, action.key);
    assert.ok(
      Buffer.byteLength(data, "utf8") <= 64,
      `${data} is ${Buffer.byteLength(data, "utf8")} bytes`
    );
  }
});

test("a callback round-trips to the same order and action", () => {
  for (const action of ORDER_ACTIONS) {
    const decoded = decodeCallback(encodeCallback(1044, action.key));
    assert.equal(decoded?.orderId, 1044);
    assert.equal(decoded?.action.key, action.key);
  }
});

test("malformed or foreign callbacks decode to null, never to an action", () => {
  for (const bad of [
    "",
    "o:1044",
    "o:1044:wip:extra",
    "x:1044:wip",
    "o:abc:wip",
    "o:-1:wip",
    "o:0:wip",
    "o:1044:unknown",
  ]) {
    assert.equal(decodeCallback(bad), null, `expected null for ${bad}`);
  }
});

test("exactly one action is destructive and it is the cancel", () => {
  // The keyboard puts destructive actions on their own row; two of them there
  // would quietly reshape the layout.
  const destructive = ORDER_ACTIONS.filter((a) => a.destructive);
  assert.equal(destructive.length, 1);
  assert.equal(destructive[0].key, "cancel");
});
