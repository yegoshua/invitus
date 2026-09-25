import test from "node:test";
import assert from "node:assert/strict";

import {
  formatKeyCrmStatusChange,
  formatNewOrder,
  formatOrderPaid,
  notifyNewOrder,
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

// notifyNewOrder is the one sender tested end to end: fetch is replaced, so
// nothing reaches Telegram, and the fake token is never a real bot's.
async function withTelegram(
  respond: (chatId: string) => Response | Promise<Response>,
  run: (sent: Array<Record<string, unknown>>) => Promise<void>
): Promise<void> {
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  const sent: Array<Record<string, unknown>> = [];
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  process.env.TELEGRAM_CHAT_ID = "-100111";
  process.env.TELEGRAM_FINANCE_CHAT_ID = "-100222";
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    sent.push(body);
    return respond(String(body.chat_id));
  }) as typeof fetch;
  const originalError = console.error;
  console.error = () => {};
  try {
    await run(sent);
  } finally {
    globalThis.fetch = realFetch;
    console.error = originalError;
    process.env = saved;
  }
}

const ok = (chatId: string) =>
  Response.json({ ok: true, result: { message_id: 1, chat: { id: Number(chatId) } } });

test("a new order reaches the Finance chat as a copy without buttons", async () => {
  await withTelegram(ok, async (sent) => {
    assert.equal(await notifyNewOrder(draft()), true);

    const orders = sent.find((b) => b.chat_id === "-100111");
    const finance = sent.find((b) => b.chat_id === "-100222");
    assert.ok(orders && finance, "both chats are sent to");
    assert.ok(orders.reply_markup, "the orders group keeps its buttons");
    assert.equal("reply_markup" in finance, false);
    assert.equal(finance.text, orders.text);
    assert.equal(finance.parse_mode, "HTML");
  });
});

test("a Finance chat that fails costs nothing to the orders group", async () => {
  await withTelegram(
    (chatId) =>
      chatId === "-100222"
        ? new Response("Bad Request: chat not found", { status: 400 })
        : ok(chatId),
    async (sent) => {
      assert.equal(await notifyNewOrder(draft()), true);
      assert.equal(sent.length, 2);
    }
  );
});

test("a Finance send that throws does not reject", async () => {
  await withTelegram(
    (chatId) => {
      if (chatId === "-100222") throw new Error("network down");
      return ok(chatId);
    },
    async () => {
      assert.equal(await notifyNewOrder(draft()), true);
    }
  );
});

test("with no Finance chat configured, only the orders group is sent to", async () => {
  await withTelegram(ok, async (sent) => {
    delete process.env.TELEGRAM_FINANCE_CHAT_ID;
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      await notifyNewOrder(draft());
    } finally {
      console.warn = originalWarn;
    }
    assert.deepEqual(sent.map((b) => b.chat_id), ["-100111"]);
  });
});
