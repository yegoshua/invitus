import test from "node:test";
import assert from "node:assert/strict";

import {
  formatKeyCrmStatusChange,
  formatNewOrder,
  formatOrderPaid,
  formatPartsRefused,
  type NewOrderNotification,
} from "./order-notifications.ts";

function draft(
  overrides: Partial<NewOrderNotification> = {}
): NewOrderNotification {
  return {
    orderId: 1041,
    customer: {
      fullName: "Марк Поліщук",
      phone: "+380671234567",
      email: "mark@example.com",
    },
    delivery: { cityName: "Київ", branchName: "Відділення №12" },
    paymentMethod: "online",
    lines: [
      { name: "Poseidon Lifting Belt", size: "M", quantity: 1, lineTotal: 3900 },
    ],
    subtotal: 3900,
    discount: 0,
    total: 3900,
    promoCode: null,
    ...overrides,
  };
}

test("a plain order carries no promo lines", () => {
  const text = formatNewOrder(draft());
  assert.match(text, /Нове замовлення №1041/);
  assert.match(text, /Poseidon Lifting Belt \(M\) × 1/);
  assert.match(text, /До сплати/);
  assert.doesNotMatch(text, /Промокод/);
});

test("payment method and payment status are separate lines", () => {
  // They used to be one string, and the status half went unread.
  const cod = formatNewOrder(draft({ paymentMethod: "cod" }));
  assert.match(cod, /Накладений платіж/);
  assert.match(cod, /Не оплачено — оплата при отриманні/);

  const online = formatNewOrder(draft({ paymentMethod: "online" }));
  assert.match(online, /Онлайн-оплата \(Monobank\)/);
  assert.match(online, /Не оплачено — очікує оплати/);
});

test("an instalment order names the plan and waits on the app, not on a payment link", () => {
  const parts = formatNewOrder(draft({ paymentMethod: "parts", parts: 6 }));
  assert.match(parts, /Покупка частинами monobank · 6 платежів/);
  assert.match(parts, /очікує підтвердження в застосунку mono/);
  assert.doesNotMatch(parts, /очікує оплати/);
});

test("a refusal from the bank is one message with the reason and the raw state", () => {
  const text = formatPartsRefused(1041, "Ліміт <вичерпано>", "EXCEEDED_SUM_LIMIT");
  assert.match(text, /замовлення №1041/);
  assert.match(text, /Ліміт &lt;вичерпано&gt;/);
  assert.match(text, /EXCEEDED_SUM_LIMIT/);
});

test("a discounted order shows subtotal, code and the discount", () => {
  const text = formatNewOrder(
    draft({ discount: 390, total: 3510, promoCode: "FIRST10" })
  );
  assert.match(text, /Сума:/);
  assert.match(text, /Промокод FIRST10/);
  assert.match(text, /−/);
});

test("customer-supplied text cannot inject HTML into the message", () => {
  // parse_mode HTML makes an unescaped name a broken message at best and a
  // fake link at worst — the name is the one field a stranger controls.
  const text = formatNewOrder(
    draft({
      customer: {
        fullName: '<a href="http://evil">click</a>',
        phone: "+380671234567",
        email: "a@b.c",
      },
    })
  );
  assert.doesNotMatch(text, /<a href="http:\/\/evil"/);
  assert.match(text, /&lt;a href=/);
});

test("the KeyCRM link appears only when KEYCRM_APP_URL is set", () => {
  delete process.env.KEYCRM_APP_URL;
  assert.doesNotMatch(formatNewOrder(draft()), /Відкрити в KeyCRM/);

  process.env.KEYCRM_APP_URL = "https://shop.keycrm.app/";
  assert.match(
    formatNewOrder(draft()),
    /href="https:\/\/shop\.keycrm\.app\/app\/orders\/1041"/
  );
  delete process.env.KEYCRM_APP_URL;
});

test("paid notification names the amount and the payment detail", () => {
  const text = formatOrderPaid(1041, 3510, "Monobank 44** ** 1234");
  assert.match(text, /Оплата пройшла — замовлення №1041/);
  assert.match(text, /Monobank 44/);
});

test("payment and order status changes are visually distinct", () => {
  const order = formatKeyCrmStatusChange({
    event: "order.change_order_status",
    orderId: 1041,
    status: "Відправлено",
    total: 3510,
    buyerName: "Марк Поліщук",
  });
  const payment = formatKeyCrmStatusChange({
    event: "order.change_payment_status",
    orderId: 1041,
    status: "Оплачено",
    total: 3510,
    buyerName: null,
  });
  assert.match(order, /Статус замовлення/);
  assert.match(payment, /Статус оплати/);
  assert.notEqual(order.slice(0, 2), payment.slice(0, 2));
});

test("an unrecognised context still produces a sendable message", () => {
  // The webhook payload is undocumented field-by-field; a rename must cost a
  // line, not the notification.
  const text = formatKeyCrmStatusChange({
    event: "order.change_order_status",
    orderId: null,
    status: null,
    total: null,
    buyerName: null,
  });
  assert.match(text, /без номера/);
  assert.match(text, /статус не вказано/);
  assert.ok(text.length > 0);
});
