import test from "node:test";
import assert from "node:assert/strict";

import {
  ORDER_ACTIONS,
  acceptsOrderActionsFrom,
  remainingActions,
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

test("buttons are accepted only from the orders group", () => {
  const env = {
    TELEGRAM_CHAT_ID: "-1001",
    TELEGRAM_FINANCE_CHAT_ID: "-1002",
    TELEGRAM_ALERT_CHAT_ID: "-1003",
  };
  assert.equal(acceptsOrderActionsFrom(-1001, env), true);
  // The Finance chat gets a copy of every order without buttons; a stale or
  // forwarded keyboard pressed there must not act on the order a second time.
  assert.equal(acceptsOrderActionsFrom(-1002, env), false);
  assert.equal(acceptsOrderActionsFrom(-1003, env), false);
  assert.equal(acceptsOrderActionsFrom(42, env), false);
});

test("with no orders group configured, no chat may press a button", () => {
  assert.equal(acceptsOrderActionsFrom(-1002, { TELEGRAM_FINANCE_CHAT_ID: "-1002" }), false);
  assert.equal(acceptsOrderActionsFrom(0, { TELEGRAM_CHAT_ID: "" }), false);
});

test("buttons shrink to what is left to do, and vanish once there is a waybill", () => {
  const keys = (statusId: number | null, hasWaybill = false) =>
    remainingActions({ statusId, hasWaybill }).map((a) => a.key);
  assert.deepEqual(keys(1), ["wip", "mkttn", "ttn", "cancel"]);
  assert.deepEqual(keys(2), ["mkttn", "ttn", "cancel"]);
  assert.deepEqual(keys(8), []);
  assert.deepEqual(keys(19), []);
  // A tracking code typed into the CRM by hand counts as a waybill too.
  assert.deepEqual(keys(2, true), []);
});

test("only the waybill button makes a waybill, and both waybill buttons hand over to mono", () => {
  const makes = ORDER_ACTIONS.filter((a) => a.createsWaybill).map((a) => a.key);
  assert.deepEqual(makes, ["mkttn"]);
  for (const key of ["mkttn", "ttn"]) {
    assert.equal(ORDER_ACTIONS.find((a) => a.key === key)?.parts, "confirm");
  }
});
