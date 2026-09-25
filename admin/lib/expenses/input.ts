// What the Expense form may write. Runs in the Server Action — the browser is
// no authority on it — and its messages are what the form shows under each
// field. Pure: no database, no request.

import { z } from "zod";
import { ACCOUNTING_START } from "../finance/orders.ts";
import type { Day } from "../finance/period.ts";
import { MANUAL_CATEGORY_IDS, type ManualCategory } from "./categories.ts";

export interface ExpenseInput {
  title: string;
  /** Integer kopecks: a sum of floats drifts, a sum of integers does not. */
  amountKop: number;
  date: Day;
  category: ManualCategory;
  orderId: number | null;
  comment: string | null;
}

export type ExpenseField = "title" | "amount" | "date" | "category" | "orderId" | "comment";

export type ParseResult =
  | { ok: true; value: ExpenseInput }
  | { ok: false; errors: Partial<Record<ExpenseField, string>> };

/** Kopecks from what a person types: "2 400", "1250,50", "4 100 ₴". Null if it is not a positive amount. */
export function parseAmount(text: string): number | null {
  const s = text.replace(/[\s  ]/g, "").replace(/₴|грн\.?$/i, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, fraction = ""] = s.split(".");
  const kop = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return kop > 0 && Number.isSafeInteger(kop) ? kop : null;
}

// A real calendar day: "2026-02-30" matches the pattern and is not one.
function isCalendarDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const text = z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string());
const optional = (schema: z.ZodType) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined), schema.optional());

function schema(today: Day) {
  return z.object({
    title: text.pipe(z.string().min(1, "Вкажи назву").max(200, "Назва задовга — до 200 символів")),
    amount: text.transform((s, ctx) => {
      const kop = parseAmount(s);
      if (kop === null) {
        ctx.addIssue({ code: "custom", message: s ? "Сума — додатне число, до копійок" : "Вкажи суму" });
        return z.NEVER;
      }
      return kop;
    }),
    date: text
      .refine(isCalendarDay, "Вкажи дату")
      .refine((d) => d <= today, "Дата в майбутньому — витрату вносять, коли гроші вже пішли")
      .refine((d) => d >= ACCOUNTING_START, `Облік починається з ${ACCOUNTING_START.split("-").reverse().join(".")}`),
    category: z.enum(MANUAL_CATEGORY_IDS, "Обери категорію"),
    orderId: optional(
      z
        .string()
        .transform((s) => s.replace(/^[№#]\s*/, ""))
        .pipe(z.string().regex(/^\d{1,9}$/, "Номер замовлення — лише цифри").transform(Number))
    ),
    comment: optional(z.string().max(1000, "Коментар задовгий — до 1000 символів")),
  });
}

export function parseExpenseInput(raw: Record<string, unknown>, today: Day): ParseResult {
  const result = schema(today).safeParse(raw);
  if (!result.success) {
    const errors: Partial<Record<ExpenseField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as ExpenseField;
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const v = result.data;
  return {
    ok: true,
    value: {
      title: v.title,
      amountKop: v.amount,
      date: v.date,
      category: v.category,
      orderId: (v.orderId as number | undefined) ?? null,
      comment: (v.comment as string | undefined) ?? null,
    },
  };
}
