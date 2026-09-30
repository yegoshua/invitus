import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeState,
  encodeState,
  maskedCardOf,
  notificationFromKeyCrmOrder,
  type KeyCrmOrderForCard,
} from "./order-card.ts";
import { formatNewOrder, renderOrderMessage } from "./order-notifications.ts";
// lib/orders.ts writes this tag; it imports the KeyCRM client, so node:test
// cannot load it and the literal is restated here.
const PARTS_PAYMENT_TAG = "Покупка частинами monobank";

const IDS = { online: 2, parts: 5, cod: 3 };

// Order #1063 as KeyCRM returned it a minute after it was paid — the order
// whose message kept saying «Не оплачено».
function order1063(overrides: Partial<KeyCrmOrderForCard> = {}): KeyCrmOrderForCard {
  return {
    id: 1063,
    status_id: 1,
    grand_total: 4100,
    products_total: 4100,
    discount_amount: null,
    promocode: null,
    buyer: {
      full_name: "nazar Olshevsky",
      phone: "+380681363824",
      email: "nazarolshevsky14@gmail.com",
    },
    shipping: {
      tracking_code: null,
      shipping_address_city: "Нетішин",
      shipping_receive_point: "Відділення №3 (до 15 кг): вул. Героїв України, 3-А",
      address_payload: { city_ref: "e71b", warehouse_ref: "ef13" },
    },
    products: [
      {
        name: "Mizu Lifting Belt",
        price: 4100,
        quantity: 1,
        properties: [{ name: "Розмір", value: "M" }],
      },
    ],
    payments: [
      {
        status: "paid",
        payment_method_id: 2,
        description: "Monobank 430860******46 · invoice 26092947Pv97JozxmeW4",
      },
    ],
    ...overrides,
  };
}

test("a paid online order reads as paid, with the card's last digits", () => {
  const text = formatNewOrder(notificationFromKeyCrmOrder(order1063(), IDS));
  assert.match(text, /Оплачено/);
  assert.match(text, /картка \*46/);
  assert.doesNotMatch(text, /Не оплачено/);
  assert.match(text, /Mizu Lifting Belt \(M\) × 1/);
  assert.match(text, /Нетішин/);
});

test("the same order before payment still reads as waiting", () => {
  const unpaid = order1063({
    payments: [{ status: "not_paid", payment_method_id: 2, description: "Онлайн-оплата (Monobank)" }],
  });
  assert.match(formatNewOrder(notificationFromKeyCrmOrder(unpaid, IDS)), /Не оплачено — очікує оплати/);
});

test("the rebuilt card says what the first message said, apart from the payment", () => {
  // The first message comes from the checkout, every rewrite from KeyCRM. If
  // the two disagreed on anything but the status, a payment would visibly
  // reshuffle the order in the chat.
  const fromCrm = notificationFromKeyCrmOrder(order1063(), IDS);
  const fromCheckout = formatNewOrder({ ...fromCrm, paid: null });
  const rebuiltUnpaid = formatNewOrder(
    notificationFromKeyCrmOrder(
      order1063({ payments: [{ status: "not_paid", payment_method_id: 2 }] }),
      IDS
    )
  );
  assert.equal(rebuiltUnpaid, fromCheckout);
});

test("a waybill number is printed once KeyCRM has it", () => {
  const text = formatNewOrder(
    notificationFromKeyCrmOrder(
      order1063({ shipping: { ...order1063().shipping, tracking_code: "20451234567890" } }),
      IDS
    )
  );
  assert.match(text, /ТТН: <code>20451234567890<\/code>/);
});

test("an unknown payment method id falls back on the description, then on cash", () => {
  const parts = notificationFromKeyCrmOrder(
    order1063({
      payments: [{ status: "not_paid", payment_method_id: 99, description: `${PARTS_PAYMENT_TAG} · 6 платежів` }],
    }),
    {}
  );
  assert.equal(parts.paymentMethod, "parts");
  assert.equal(parts.parts, 6);

  const silent = notificationFromKeyCrmOrder(order1063({ payments: [] }), {});
  assert.equal(silent.paymentMethod, "cod");
  assert.equal(silent.paid, null);
});

test("a promo shows up in the rebuilt card as it did in the first", () => {
  const card = notificationFromKeyCrmOrder(
    order1063({ grand_total: "3690.00", discount_amount: "410", promocode: "FIRST10" }),
    IDS
  );
  assert.equal(card.total, 3690);
  assert.equal(card.discount, 410);
  assert.match(formatNewOrder(card), /Промокод FIRST10/);
});

test("masked card: only the tail is kept, and nothing is invented", () => {
  assert.equal(maskedCardOf("Monobank 430860******46 · invoice x"), "*46");
  assert.equal(maskedCardOf("Онлайн-оплата (Monobank)"), null);
  assert.equal(maskedCardOf(null), null);
});

test("state round-trips, and junk in the field is an empty state", () => {
  const state = {
    messages: [
      { chatId: -1001, messageId: 55, buttons: true },
      { chatId: -1002, messageId: 9, buttons: false },
    ],
    log: [{ who: "Олег", did: "взяв у роботу" }],
  };
  assert.deepEqual(decodeState(encodeState(state)), state);
  for (const junk of [undefined, null, "", "привіт", "{", 42, '{"m":"x","l":[1]}']) {
    assert.deepEqual(decodeState(junk), { messages: [], log: [] });
  }
});

test("the log renders under the card, escaped", () => {
  const text = renderOrderMessage(notificationFromKeyCrmOrder(order1063(), IDS), [
    { who: "<b>Олег</b>", did: "взяв у роботу" },
  ]);
  assert.match(text, /— <b>&lt;b&gt;Олег&lt;\/b&gt;<\/b> взяв у роботу$/);
});
