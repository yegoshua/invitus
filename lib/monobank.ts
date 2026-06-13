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

export interface BasketItem {
  name: string;
  qty: number;
  /** Unit price in copecks (1 UAH = 100 copecks). */
  sum: number;
  unit?: string;
  code?: string;
  icon?: string;
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
