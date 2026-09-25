import test from "node:test";
import assert from "node:assert/strict";

import { chatIdFor } from "./telegram.ts";

const ORDERS = "-1001";
const FINANCE = "-1002";
const ALERTS = "-1003";

test("order notifications go to the orders group", () => {
  assert.equal(chatIdFor("orders", { TELEGRAM_CHAT_ID: ORDERS, TELEGRAM_FINANCE_CHAT_ID: FINANCE }), ORDERS);
});

test("the finance copy goes to the Finance chat and nowhere else", () => {
  assert.equal(chatIdFor("finance", { TELEGRAM_CHAT_ID: ORDERS, TELEGRAM_FINANCE_CHAT_ID: FINANCE }), FINANCE);
  // No fallback to the orders group: Profit in front of the packers is the
  // thing the Finance chat exists to prevent (ADR 0002).
  assert.equal(chatIdFor("finance", { TELEGRAM_CHAT_ID: ORDERS }), undefined);
  assert.equal(chatIdFor("finance", { TELEGRAM_CHAT_ID: ORDERS, TELEGRAM_FINANCE_CHAT_ID: "" }), undefined);
});

test("alerts prefer their own chat, then Finance, then the orders group", () => {
  const all = { TELEGRAM_CHAT_ID: ORDERS, TELEGRAM_FINANCE_CHAT_ID: FINANCE, TELEGRAM_ALERT_CHAT_ID: ALERTS };
  assert.equal(chatIdFor("alerts", all), ALERTS);
  assert.equal(chatIdFor("alerts", { TELEGRAM_CHAT_ID: ORDERS, TELEGRAM_FINANCE_CHAT_ID: FINANCE }), FINANCE);
  // An alert in the wrong chat is recoverable; an alert in no chat is not.
  assert.equal(chatIdFor("alerts", { TELEGRAM_CHAT_ID: ORDERS }), ORDERS);
});
