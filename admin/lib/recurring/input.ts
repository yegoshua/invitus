// What the Recurring payment form may write. Runs in the Server Action, like
// lib/expenses/input.ts, whose amount and day rules it reuses so a template
// and the Expenses it produces cannot disagree on what a valid amount is.
// Pure: no database, no request.

import { z } from "zod";
import { MANUAL_CATEGORY_IDS, type ManualCategory } from "../expenses/categories.ts";
import { isCalendarDay, parseAmount } from "../expenses/input.ts";
import type { Day } from "../finance/period.ts";
import { CURRENCIES, type Currency } from "./currency.ts";
import type { Cadence } from "./schedule.ts";

export interface RecurringInput {
  title: string;
  currency: Currency;
  /** Kopecks or cents, per `currency`. */
  amountMinor: number;
  category: ManualCategory;
  cadence: Cadence;
  dayOfMonth: number;
  month: number | null;
  startsOn: Day;
  endsOn: Day | null;
  comment: string | null;
}

/** Every field the form sends — the Server Action reads exactly these. */
export const RECURRING_FIELDS = [
  "title",
  "currency",
  "amount",
  "category",
  "cadence",
  "dayOfMonth",
  "month",
  "startsOn",
  "endsOn",
  "comment",
] as const;

export type RecurringField = (typeof RECURRING_FIELDS)[number];

export type RecurringParseResult =
  | { ok: true; value: RecurringInput }
  | { ok: false; errors: Partial<Record<RecurringField, string>> };

/** Services is what a subscription almost always is. */
export const DEFAULT_RECURRING_CATEGORY: ManualCategory = "services";

// The longest each month can be — 29 for February, so a yearly 29 Feb is
// allowed and falls on the 28th in other years (lib/recurring/schedule.ts).
const LONGEST = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_GENITIVE = ["січні", "лютому", "березні", "квітні", "травні", "червні", "липні", "серпні", "вересні", "жовтні", "листопаді", "грудні"];

const text = z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string());
const optional = (schema: z.ZodType) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined), schema.optional());
const int = (min: number, max: number, message: string) =>
  text.pipe(z.string().regex(/^\d{1,2}$/, message).transform(Number).pipe(z.number().min(min, message).max(max, message)));

const schema = z
  .object({
    title: text.pipe(z.string().min(1, "Вкажи назву").max(200, "Назва задовга — до 200 символів")),
    amount: text.transform((s, ctx) => {
      const kop = parseAmount(s);
      if (kop === null) {
        ctx.addIssue({ code: "custom", message: s ? "Сума — додатне число, до двох знаків після коми" : "Вкажи суму" });
        return z.NEVER;
      }
      return kop;
    }),
    currency: z.preprocess((v) => (typeof v === "string" && v !== "" ? v : "UAH"), z.enum(CURRENCIES, "Обери валюту")),
    category: z.preprocess(
      (v) => (typeof v === "string" && v !== "" ? v : DEFAULT_RECURRING_CATEGORY),
      z.enum(MANUAL_CATEGORY_IDS, "Обери категорію")
    ),
    cadence: z.enum(["monthly", "yearly"], "Обери, як часто"),
    dayOfMonth: int(1, 31, "День — від 1 до 31"),
    month: optional(int(1, 12, "Обери місяць")),
    startsOn: text.refine(isCalendarDay, "Вкажи дату початку"),
    endsOn: optional(z.string().refine(isCalendarDay, "Вкажи дату або залиш порожнім")),
    comment: optional(z.string().max(1000, "Коментар задовгий — до 1000 символів")),
  })
  .superRefine((v, ctx) => {
    if (v.cadence === "yearly") {
      const month = v.month as number | undefined;
      if (month === undefined) ctx.addIssue({ code: "custom", path: ["month"], message: "Обери місяць" });
      else if (v.dayOfMonth > LONGEST[month - 1])
        ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: `У ${MONTH_GENITIVE[month - 1]} ${LONGEST[month - 1]} днів` });
    }
    const endsOn = v.endsOn as string | undefined;
    if (endsOn && endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "Кінець раніше за початок" });
  });

export function parseRecurringInput(raw: Record<string, unknown>): RecurringParseResult {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const errors: Partial<Record<RecurringField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as RecurringField;
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const v = result.data;
  return {
    ok: true,
    value: {
      title: v.title,
      currency: v.currency,
      amountMinor: v.amount,
      category: v.category,
      cadence: v.cadence,
      dayOfMonth: v.dayOfMonth,
      month: v.cadence === "yearly" ? (v.month as number) : null,
      startsOn: v.startsOn,
      endsOn: (v.endsOn as string | undefined) ?? null,
      comment: (v.comment as string | undefined) ?? null,
    },
  };
}
