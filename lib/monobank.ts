// Server-only Monobank Acquiring API client.
// Docs: https://monobank.ua/api-docs/acquiring
//
// NEVER import this from client components — it reads MONOBANK_TOKEN from
// process.env which is server-only.

const MONO_BASE = "https://api.monobank.ua";

export type InvoiceStatusValue =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

/**
 * Discount or surcharge, on the whole basket (merchantPaymInfo.discounts) or on
 * one line. Monobank's rule: sum of basketOrder[].total plus the basket-level
 * discounts must equal `amount`. Anything not a product — delivery, a promo —
 * belongs here and must never be faked as an extra basket line, or the fiscal
 * receipt lists it as goods.
 */
export interface InvoiceDiscount {
  /**
   * UPPERCASE, and the surcharge is EXTRA_CHARGE — not "extra". Monobank's own
   * prompt templates document these lowercase, but the API rejects that with
   * INVALID_MERCHANT_PAYM_INFO. Probed against the live endpoint: DISCOUNT and
   * EXTRA_CHARGE are accepted; extra, EXTRA, SURCHARGE, MARKUP, ALLOWANCE and
   * ADDITION are all refused.
   */
  type: "DISCOUNT" | "EXTRA_CHARGE";
  /** "VALUE" = fixed sum in copecks, "PERCENT" = percentage. */
  mode: "VALUE" | "PERCENT";
  value: number;
}

export interface BasketItem {
  name: string;
  qty: number;
  /** Unit price in copecks (1 UAH = 100 copecks). */
  sum: number;
  /** Line total in copecks (sum × qty). Required for fiscal receipts. */
  total?: number;
  unit?: string;
  code?: string;
  barcode?: string;
  /** Tax rates: [0] none, [1] 20%, [2] 7%. Required once ПРРО is active. */
  tax?: number[];
  uktzed?: string;
  icon?: string;
  discounts?: InvoiceDiscount[];
}

export interface CreateInvoiceInput {
  /** Total amount in copecks. */
  amount: number;
  /** ISO 4217 currency code. Defaults to 980 (UAH). */
  ccy?: number;
  /** Your internal reference / order id. */
  reference?: string;
  /** Short payment description shown to the user. */
  destination?: string;
  comment?: string;
  basketOrder?: BasketItem[];
  /** Basket-level discounts/surcharges — delivery goes here, not in the basket. */
  discounts?: InvoiceDiscount[];
  customerEmails?: string[];
  redirectUrl?: string;
  webHookUrl?: string;
  /** Invoice lifespan in seconds. Default 24h, max 30 days. */
  validity?: number;
  paymentType?: "debit" | "hold";
}

export interface CreateInvoiceResult {
  invoiceId: string;
  pageUrl: string;
}

export interface InvoiceStatusResponse {
  invoiceId: string;
  status: InvoiceStatusValue;
  amount: number;
  ccy: number;
  finalAmount?: number;
  createdDate: string;
  modifiedDate: string;
  reference?: string;
  destination?: string;
  errCode?: string;
  failureReason?: string;
  paymentInfo?: {
    maskedPan?: string;
    paymentSystem?: string;
    paymentMethod?: string;
  };
}

function token(): string {
  const t = process.env.MONOBANK_TOKEN;
  if (!t) {
    throw new Error(
      "MONOBANK_TOKEN is not set. Add it to .env.local — see .env.example."
    );
  }
  return t;
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  const {
    amount,
    ccy = 980,
    reference,
    destination,
    comment,
    basketOrder,
    discounts,
    customerEmails,
    redirectUrl,
    webHookUrl,
    validity,
    paymentType,
  } = input;

  const merchantPaymInfo: Record<string, unknown> = {};
  if (reference) merchantPaymInfo.reference = reference;
  if (destination) merchantPaymInfo.destination = destination;
  if (comment) merchantPaymInfo.comment = comment;
  if (basketOrder?.length) merchantPaymInfo.basketOrder = basketOrder;
  if (discounts?.length) merchantPaymInfo.discounts = discounts;
  if (customerEmails?.length) merchantPaymInfo.customerEmails = customerEmails;

  const body: Record<string, unknown> = { amount, ccy };
  if (Object.keys(merchantPaymInfo).length > 0) {
    body.merchantPaymInfo = merchantPaymInfo;
  }
  if (redirectUrl) body.redirectUrl = redirectUrl;
  if (webHookUrl) body.webHookUrl = webHookUrl;
  if (validity) body.validity = validity;
  if (paymentType) body.paymentType = paymentType;

  const res = await fetch(`${MONO_BASE}/api/merchant/invoice/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Token": token(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Monobank createInvoice ${res.status}: ${text.slice(0, 300)}`
    );
  }

  return (await res.json()) as CreateInvoiceResult;
}

// Monobank's webhook signing key (EC P-256). Cached for the process: it is
// stable, but Monobank can rotate it, so verifyWebhookSignature drops the cache
// and retries once before rejecting a payload.
let cachedPubKey: string | null = null;

async function fetchPubKeyPem(): Promise<string> {
  const res = await fetch(`${MONO_BASE}/api/merchant/pubkey`, {
    headers: { "X-Token": token() },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Monobank pubkey ${res.status}`);
  }
  // The `key` field is base64 of the PEM (SPKI), not of the raw DER.
  const { key } = (await res.json()) as { key: string };
  return Buffer.from(key, "base64").toString("utf8");
}

/**
 * Verify the X-Sign header of an acquiring webhook: ECDSA-SHA256 over the raw
 * request body, signature DER-encoded and base64'd.
 *
 * `rawBody` must be the bytes as received — verifying a re-serialised object
 * would change key order and whitespace and never match.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureBase64: string
): Promise<boolean> {
  const { createVerify } = await import("node:crypto");

  const check = (pem: string) =>
    createVerify("SHA256")
      .update(rawBody)
      .verify(pem, Buffer.from(signatureBase64, "base64"));

  try {
    if (!cachedPubKey) cachedPubKey = await fetchPubKeyPem();
    if (check(cachedPubKey)) return true;

    // Wrong signature, or a rotated key. Refetch once and re-check before
    // deciding the payload is forged.
    cachedPubKey = await fetchPubKeyPem();
    return check(cachedPubKey);
  } catch (err) {
    console.error(
      "[Monobank] signature verification error:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export async function getInvoiceStatus(
  invoiceId: string
): Promise<InvoiceStatusResponse> {
  const url = `${MONO_BASE}/api/merchant/invoice/status?invoiceId=${encodeURIComponent(
    invoiceId
  )}`;
  const res = await fetch(url, {
    headers: { "X-Token": token() },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Monobank getInvoiceStatus ${res.status}: ${text.slice(0, 300)}`
    );
  }

  return (await res.json()) as InvoiceStatusResponse;
}
