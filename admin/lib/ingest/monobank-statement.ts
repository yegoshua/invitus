// Monobank's merchant statement (GET /api/merchant/statement) → payment_fees
// rows. Pure: the fetch is in the ingest route, this only reads the JSON.
//
// The fee is what the bank kept: `amount − profitAmount`, both in kopecks.
// The order is the invoice's `reference`, which the site sets to the KeyCRM
// order id when it creates the invoice (app/api/orders/route.ts) — the same
// link the payment webhook uses to mark that order paid.
//
// A statement row that cannot be read is skipped and named, never guessed
// at: a wrong fee is worse than an estimate that says it is one.

import { kyivDay, type Day } from "../finance/period.ts";

export interface PaymentFeeRow {
  invoiceId: string;
  /** Null when the invoice's reference is not one of our order numbers. */
  orderId: number | null;
  amountKop: number;
  feeKop: number;
  paidAt: Date;
  /** The Kyiv day of the payment. */
  paidOn: Day;
  /** "full", "bnpl_parts_4", "bnpl_later_30" — how the customer paid. */
  paymentScheme: string | null;
}

export interface StatementResult {
  rows: PaymentFeeRow[];
  skipped: Array<{ invoiceId: string | null; reason: string }>;
}

const UAH = 980;

function kopecks(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function orderIdFrom(reference: unknown): number | null {
  const s = typeof reference === "number" ? String(reference) : reference;
  return typeof s === "string" && /^\d{1,9}$/.test(s.trim()) ? Number(s.trim()) : null;
}

type Read = { ok: true; row: PaymentFeeRow } | { ok: false; reason: string };

function readItem(raw: Record<string, unknown>, invoiceId: string): Read {
  // Only a completed payment has a fee. "hold" and "processing" become
  // "success" later and are read again then; "failure" never cost anything.
  if (raw.status !== "success") return { ok: false, reason: `status ${String(raw.status)}` };
  if (raw.ccy !== undefined && raw.ccy !== UAH) return { ok: false, reason: `currency ${String(raw.ccy)}` };
  const amount = kopecks(raw.amount);
  if (amount === null || amount === 0) return { ok: false, reason: "no amount" };
  // The OpenAPI schema lists it as optional; without it there is no fee to
  // know, and the order keeps its estimate.
  const profit = kopecks(raw.profitAmount);
  if (profit === null) return { ok: false, reason: "no profitAmount" };
  if (profit > amount) return { ok: false, reason: "profitAmount above amount" };
  const paidAt = typeof raw.date === "string" ? new Date(raw.date) : null;
  if (!paidAt || Number.isNaN(paidAt.getTime())) return { ok: false, reason: "no date" };

  return {
    ok: true,
    row: {
      invoiceId,
      orderId: orderIdFrom(raw.reference),
      amountKop: amount,
      feeKop: amount - profit,
      paidAt,
      paidOn: kyivDay(paidAt),
      paymentScheme: typeof raw.paymentScheme === "string" ? raw.paymentScheme : null,
    },
  };
}

/** Throws when the body is not a statement at all — that is a failed run, not an empty day. */
export function mapStatement(json: unknown): StatementResult {
  const list = json && typeof json === "object" ? (json as { list?: unknown }).list : undefined;
  if (!Array.isArray(list)) throw new Error("Monobank statement has no list");

  const rows: PaymentFeeRow[] = [];
  const skipped: StatementResult["skipped"] = [];
  const seen = new Set<string>();

  for (const raw of list) {
    if (!raw || typeof raw !== "object") {
      skipped.push({ invoiceId: null, reason: "not an object" });
      continue;
    }
    const item = raw as Record<string, unknown>;
    const invoiceId = typeof item.invoiceId === "string" && item.invoiceId ? item.invoiceId : null;
    if (!invoiceId) {
      skipped.push({ invoiceId: null, reason: "no invoiceId" });
      continue;
    }
    if (seen.has(invoiceId)) continue;
    const read = readItem(item, invoiceId);
    if (read.ok) {
      seen.add(invoiceId);
      rows.push(read.row);
    } else skipped.push({ invoiceId, reason: read.reason });
  }
  return { rows, skipped };
}

/** Monobank refuses a range over 31 days ("'to'-'from' cannot be more than 31 days"); 30 keeps a day clear of it. */
const WINDOW_SECONDS = 30 * 86_400;

/** Unix-second windows covering from..to, oldest first, each short enough to ask for. */
export function statementWindows(from: Date, to: Date): Array<{ from: number; to: number }> {
  const end = Math.floor(to.getTime() / 1000);
  const windows: Array<{ from: number; to: number }> = [];
  for (let start = Math.floor(from.getTime() / 1000); start < end; start += WINDOW_SECONDS) {
    windows.push({ from: start, to: Math.min(start + WINDOW_SECONDS, end) });
  }
  return windows;
}
