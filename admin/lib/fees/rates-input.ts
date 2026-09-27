// What the fee-rates form may write. Runs in the Server Action — the browser
// is no authority on it. Pure.

import { z } from "zod";

export type RatesParseResult =
  | { ok: true; value: Record<number, number> }
  | { ok: false; errors: Record<number, string> };

const percent = z
  .string()
  .transform((s) => s.replace(/[\s  %]/g, "").replace(",", "."))
  .superRefine((s, ctx) => {
    if (s === "") ctx.addIssue({ code: "custom", message: "Вкажи ставку — 0, якщо комісії немає" });
    else if (!/^\d+(\.\d+)?$/.test(s) || Number(s) >= 100) ctx.addIssue({ code: "custom", message: "Ставка — число від 0 до 99,99" });
    else if (!/^\d+(\.\d{1,2})?$/.test(s)) ctx.addIssue({ code: "custom", message: "До сотих: напр., 1,25" });
  })
  .transform(Number);

/** `rate_<methodId>` fields → percent by payment method. Methods not listed are not read. */
export function parseFeeRates(raw: Record<string, unknown>, methodIds: number[]): RatesParseResult {
  const value: Record<number, number> = {};
  const errors: Record<number, string> = {};
  for (const id of methodIds) {
    const field = raw[`rate_${id}`];
    const result = percent.safeParse(typeof field === "string" ? field : "");
    if (result.success) value[id] = result.data;
    else errors[id] = result.error.issues[0].message;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
