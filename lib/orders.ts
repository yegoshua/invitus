// Order pricing and placement. Server-only.
//
// The one rule here: money is never taken from the client. The browser sends
// *what* was ordered (product id, size, quantity) and nothing else — every
// price and the total are recomputed from KeyCRM. Before
// this, /api/monobank/create-invoice accepted an `amount` from the request
// body, so anyone could have paid 1 UAH for a belt.
//
// Deliberately independent of lib/api.ts: that module merges Strapi
// presentation data into products, and a payment path must not be able to fail
// (or be influenced) because a CMS is down.

import { fetchKeyCrm, postKeyCrm, putKeyCrm } from "./keycrm";
import type { KeyCrmOffer, KeyCrmProduct } from "./keycrm-schema";
import { readOfferVariant, VARIANT_PROPERTY_NAMES } from "./variant-property";
import { orderTotals, type OrderTotals } from "./order-totals";

/** Used only when a line has a size but no offer to take the property from. */
const DEFAULT_VARIANT_PROPERTY = VARIANT_PROPERTY_NAMES[0];
const NOVA_POSHTA_DELIVERY_SERVICE_ID = 2;

/**
 * KeyCRM id of the hidden 0.50 UAH product used to smoke-test live acquiring
 * (category 7 "Службове (тест)", filtered out of the catalog in lib/api.ts).
 *
 * A real-card test therefore costs 50 copecks. It stays a normal product
 * otherwise — priced, recorded and paid through exactly the same code as
 * everything else, which is the entire point of testing with it.
 */
export const TEST_PRODUCT_ID = 44;

export interface OrderDraftItem {
  /** KeyCRM product id. */
  productId: number;
  /** Selected size, as shown on the product page. */
  size?: string | null;
  quantity: number;
}

export interface OrderDraft {
  customer: { fullName: string; phone: string; email?: string | null };
  delivery: {
    cityRef: string;
    cityName: string;
    branchRef: string;
    branchName: string;
  };
  paymentMethod: "online" | "cod";
  items: OrderDraftItem[];
}

export interface PricedLine {
  productId: number;
  name: string;
  sku?: string;
  size?: string | null;
  /**
   * KeyCRM property the size came from — "Розмір" for belts, "Довжина" for
   * wrist wraps. Echoed back on the order so the line is filed under the same
   * property the offer uses, rather than inventing a second one.
   */
  sizeProperty?: string;
  quantity: number;
  /** UAH per unit, as displayed to the customer. */
  unitPrice: number;
  lineTotal: number;
}

export interface PricedOrder extends OrderTotals {
  lines: PricedLine[];
}

export class OrderPricingError extends Error {}

function requiredEnvId(name: string): number {
  const raw = process.env[name];
  const value = Number(raw);
  if (!raw || !Number.isInteger(value)) {
    throw new Error(
      `${name} must be set to a KeyCRM numeric id (server-only). See .env.example.`
    );
  }
  return value;
}

/**
 * Recompute the order from KeyCRM. Throws OrderPricingError on anything the
 * customer could have tampered with or that has since changed — an unknown
 * product, a size that no longer exists, a non-positive quantity.
 */
export async function priceOrder(draft: OrderDraft): Promise<PricedOrder> {
  if (!draft.items.length) {
    throw new OrderPricingError("Кошик порожній");
  }

  const lines = await Promise.all(
    draft.items.map((item) => priceLine(item))
  );

  return { lines, ...orderTotals(lines) };
}

async function priceLine(item: OrderDraftItem): Promise<PricedLine> {
  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    throw new OrderPricingError(`Невірна кількість для товару ${item.productId}`);
  }

  let product: KeyCrmProduct;
  try {
    product = await fetchKeyCrm<KeyCrmProduct>(`/products/${item.productId}`, {
      revalidate: 0,
    });
  } catch {
    throw new OrderPricingError(`Товар ${item.productId} не знайдено`);
  }

  if (product.is_archived) {
    throw new OrderPricingError(`Товар «${product.name}» більше не продається`);
  }

  // The catalog and the product page both display min_price, and the cart
  // stores that same number regardless of the size picked. Charging the offer's
  // own price instead could bill more than was shown, so min_price wins and any
  // divergence is only logged.
  const unitPrice = product.min_price;
  let sku: string | undefined;
  let sizeProperty: string | undefined;

  if (product.has_offers) {
    const offers = await fetchOffersFresh(item.productId);
    const active = offers.filter((o) => !o.is_archived);
    const match = active.find(
      (o) => readOfferVariant(o)?.value === item.size
    );

    if (!match) {
      throw new OrderPricingError(
        `Розмір «${item.size ?? "—"}» для «${product.name}» недоступний`
      );
    }

    sku = match.sku ?? undefined;
    sizeProperty = readOfferVariant(match)?.property;

    if (match.price !== unitPrice) {
      console.warn(
        `[orders] ${product.name} (${item.size}): offer price ${match.price} != displayed ${unitPrice}; charging the displayed price`
      );
    }
  }

  return {
    productId: item.productId,
    name: product.name,
    sku,
    size: item.size ?? null,
    sizeProperty,
    quantity: item.quantity,
    unitPrice,
    lineTotal: unitPrice * item.quantity,
  };
}

/** Offers, uncached — stock and prices must be read fresh when taking money. */
async function fetchOffersFresh(productId: number): Promise<KeyCrmOffer[]> {
  const response = await fetchKeyCrm<{ data: KeyCrmOffer[] }>("/offers", {
    params: { "filter[product_id]": String(productId), limit: "50" },
    revalidate: 0,
  });
  return response.data;
}

interface KeyCrmCreatedOrder {
  id: number;
}

/**
 * Create the order in KeyCRM. The offer SKU is sent so the line lands against
 * the right variant rather than as a loose free-text product.
 *
 * The payment row is created up front with status "not_paid"; the Monobank
 * webhook flips it once the money actually arrives.
 */
export async function createKeyCrmOrder(
  draft: OrderDraft,
  priced: PricedOrder
): Promise<number> {
  const paymentMethodId =
    draft.paymentMethod === "online"
      ? requiredEnvId("KEYCRM_PAYMENT_METHOD_ID_ONLINE")
      : requiredEnvId("KEYCRM_PAYMENT_METHOD_ID_COD");

  const order = await postKeyCrm<KeyCrmCreatedOrder>("/order", {
    source_id: requiredEnvId("KEYCRM_SOURCE_ID"),
    // The site charges nothing for delivery — the customer pays Nova Poshta on
    // collection — so this is always 0 and grand_total is the goods. Sent
    // explicitly, and at the root: inside `shipping` KeyCRM silently drops it,
    // which is how a non-zero fee once disagreed with what was charged.
    shipping_price: 0,
    buyer: {
      full_name: draft.customer.fullName,
      phone: draft.customer.phone,
      ...(draft.customer.email ? { email: draft.customer.email } : {}),
    },
    shipping: {
      delivery_service_id: NOVA_POSHTA_DELIVERY_SERVICE_ID,
      recipient_full_name: draft.customer.fullName,
      recipient_phone: draft.customer.phone,
      shipping_address_country: "Україна",
      shipping_address_city: draft.delivery.cityName,
      shipping_receive_point: draft.delivery.branchName,
      // The Nova Poshta refs the checkout already collects, flat — nesting them
      // in an `address_payload` object gets them dropped. With the refs KeyCRM
      // resolves the address against Nova Poshta itself (it fills in the region
      // and the official branch name), so the waybill needs no manual re-pick.
      city_ref: draft.delivery.cityRef,
      warehouse_ref: draft.delivery.branchRef,
      is_warehouse: true,
    },
    products: priced.lines.map((line) => ({
      ...(line.sku ? { sku: line.sku } : {}),
      name: line.name,
      price: line.unitPrice,
      quantity: line.quantity,
      ...(line.size
        ? {
            properties: [
              {
                name: line.sizeProperty ?? DEFAULT_VARIANT_PROPERTY,
                value: line.size,
              },
            ],
          }
        : {}),
    })),
    payments: [
      {
        payment_method_id: paymentMethodId,
        amount: priced.total,
        status: "not_paid",
        description:
          draft.paymentMethod === "online"
            ? "Онлайн-оплата (Monobank)"
            : "Накладений платіж",
      },
    ],
  });

  return order.id;
}

/**
 * Flip the order's payment row to paid. Called from the Monobank webhook, so it
 * must be safe to run more than once — Monobank retries, and a customer
 * returning to /payment-result can race with it.
 *
 * The payment id is read back from the order rather than remembered at creation
 * time: it is a different number from payment_method_id, and re-reading is what
 * keeps this correct if the row is ever touched by hand in the CRM.
 */
export async function markKeyCrmOrderPaid(
  orderId: number,
  description: string
): Promise<void> {
  const order = await fetchKeyCrm<{
    payments?: Array<{ id: number; status: string }>;
  }>(`/order/${orderId}`, { params: { include: "payments" }, revalidate: 0 });

  const payment = order.payments?.[0];
  if (!payment) {
    throw new Error(`Order ${orderId} has no payment row to mark paid`);
  }
  if (payment.status === "paid") return;

  await putKeyCrm(`/order/${orderId}/payment/${payment.id}`, {
    status: "paid",
    description,
  });
}
