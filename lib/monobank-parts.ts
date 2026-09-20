// Server-only client for Monobank «Покупка частинами».
// Docs: https://monobank.ua/api-docs/chast
//
// A different API from acquiring (lib/monobank.ts): a different host, a
// store-id + HMAC signature instead of an X-Token, and no redirect — the
// customer confirms in the mono app and the bank tells us by callback (or we
// ask via /api/order/state). NEVER import this from client components.
//
// Env (server-only):
//   MONOBANK_PARTS_STORE_ID      the store id Monobank issued
//   MONOBANK_PARTS_STORE_SECRET  the signing key that came with it
//   MONOBANK_PARTS_API_URL       optional; the sandbox or stage host while
//                                testing, production (the default) otherwise
//
// The sandbox is https://u2-demo-ext.mono.st4g3.com with store id
// `test_store_with_confirm` / secret `secret_98765432--123-123`; a phone
// ending in …1 approves in ~5s, …2 never answers, …3 exceeds the limit, …4
// approves and waits for the store. Documented on the page above.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PartsCount, PartsState } from "./installments.ts";

const PRODUCTION_URL = "https://u2.monobank.com.ua";

/**
 * Both the create call and the status poll run with a customer waiting, so a
 * dead host has to be noticed in seconds, not after the OS-level TCP timeout.
 */
const TIMEOUT_MS = 10_000;

export interface PartsOrderState {
  order_id: string;
  state: PartsState;
  order_sub_state: string;
  message?: string;
}

export interface PartsOrderData {
  total_sum?: number;
  store_order_id?: string;
  invoice_number?: string;
  maskedCard?: string;
}

export interface CreatePartsOrderInput {
  /** Our order id — the KeyCRM order number. Monobank dedupes on it. */
  storeOrderId: string;
  /** +380XXXXXXXXX, already normalised by lib/installments.ts. */
  clientPhone: string;
  /** UAH, two decimals at most. */
  total: number;
  /** The count the customer chose. Sent alone so the app offers only that. */
  parts: PartsCount;
  products: Array<{ name: string; count: number; sum: number }>;
  /** ISO date of the order, YYYY-MM-DD. */
  invoiceDate: string;
  callbackUrl: string;
}

function storeId(): string {
  const id = process.env.MONOBANK_PARTS_STORE_ID;
  if (!id) {
    throw new Error(
      "MONOBANK_PARTS_STORE_ID is not set. Add it to .env.local (server-only)."
    );
  }
  return id;
}

function storeSecret(): string {
  const secret = process.env.MONOBANK_PARTS_STORE_SECRET;
  if (!secret) {
    throw new Error(
      "MONOBANK_PARTS_STORE_SECRET is not set. Add it to .env.local (server-only)."
    );
  }
  return secret;
}

function baseUrl(): string {
  return (process.env.MONOBANK_PARTS_API_URL || PRODUCTION_URL).replace(
    /\/+$/,
    ""
  );
}

/** Whether the shop is set up to offer instalments at all. */
export function isPartsConfigured(): boolean {
  return Boolean(
    process.env.MONOBANK_PARTS_STORE_ID && process.env.MONOBANK_PARTS_STORE_SECRET
  );
}

/**
 * signature = Base64(HMAC-SHA256(body bytes, secret)). Over the exact bytes
 * sent — re-serialising an object would change key order and never match.
 */
export function signPartsBody(body: string, secret: string): string {
  return createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(Buffer.from(body, "utf8"))
    .digest("base64");
}

/**
 * Constant-time check of a callback's `signature` header. Length is compared
 * first because timingSafeEqual throws on unequal buffers, and a throw here
 * would be a 500 that Monobank redelivers forever.
 */
export function verifyPartsSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(signPartsBody(rawBody, secret), "utf8");
  const provided = Buffer.from(signature.trim(), "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

async function callParts<T>(path: string, payload: unknown): Promise<T> {
  const body = JSON.stringify(payload);
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "store-id": storeId(),
      signature: signPartsBody(body, storeSecret()),
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // Not JSON — the raw text is the best we have.
    }
    throw new Error(`Monobank parts ${path} ${res.status}: ${message}`);
  }

  return (await res.json()) as T;
}

/**
 * Create the instalment order. Monobank pushes the customer's app; the answer
 * arrives by callback (approved or refused) or by polling getPartsOrderState.
 *
 * Idempotent on `storeOrderId`: a retry returns the existing order rather than
 * pushing the customer twice.
 */
export async function createPartsOrder(
  input: CreatePartsOrderInput
): Promise<{ orderId: string }> {
  const result = await callParts<{ order_id: string }>("/api/order/create", {
    store_order_id: input.storeOrderId,
    client_phone: input.clientPhone,
    total_sum: input.total,
    invoice: {
      number: input.storeOrderId,
      date: input.invoiceDate,
      source: "INTERNET",
    },
    available_programs: [
      { type: "payment_installments", available_parts_count: [input.parts] },
    ],
    products: input.products,
    result_callback: input.callbackUrl,
  });
  if (!result.order_id) {
    throw new Error("Monobank parts /api/order/create returned no order_id");
  }
  return { orderId: result.order_id };
}

export async function getPartsOrderState(
  orderId: string
): Promise<PartsOrderState> {
  return callParts<PartsOrderState>("/api/order/state", { order_id: orderId });
}

/** The order as Monobank has it — used to map a callback back to our order. */
export async function getPartsOrderData(
  orderId: string
): Promise<PartsOrderData> {
  return callParts<PartsOrderData>("/api/order/data", { order_id: orderId });
}

/**
 * The goods are on their way: activate the instalment plan. Only valid from
 * WAITING_FOR_STORE_CONFIRM — Monobank answers 400 otherwise, and the caller
 * is expected to say so rather than retry.
 */
export async function confirmPartsOrder(
  orderId: string
): Promise<PartsOrderState> {
  return callParts<PartsOrderState>("/api/order/confirm", { order_id: orderId });
}

/** The shop cannot fulfil it: annul the plan and restore the customer's limit. */
export async function rejectPartsOrder(
  orderId: string
): Promise<PartsOrderState> {
  return callParts<PartsOrderState>("/api/order/reject", { order_id: orderId });
}
