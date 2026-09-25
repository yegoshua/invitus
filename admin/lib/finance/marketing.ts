// ROAS and CAC (CONTEXT: Маркетинг). Pure: figures in, figures out.
//
// Both are blended — all Sales and all Revenue against all Ad spend — because
// attributing a Sale to a campaign is out of scope (PRD #103). Ad spend is the
// automatic rows only (summarizeExpenses' `ads`): a blogger paid by hand is an
// Expense under «Реклама (блогери/бартер)», not Ad spend.
//
// A ratio with nothing to divide by has no value. It is `null`, never
// Infinity or NaN, and the page shows a dash: "ROAS ∞" is not a result, and a
// CAC of 0 would claim Sales cost nothing when nobody paid for ads at all.

import { uah } from "./format.ts";

export interface MarketingInput {
  /** Hryvnias. */
  revenue: number;
  sales: number;
  /** Hryvnias. */
  adSpend: number;
}

export interface MarketingFigures {
  /** Revenue per hryvnia of Ad spend. */
  roas: number | null;
  /** Ad spend per Sale, in hryvnias. Not the ad platform's "CPA". */
  cac: number | null;
  previousRoas: number | null;
  previousCac: number | null;
}

const roas = (m: MarketingInput) => (m.adSpend > 0 ? m.revenue / m.adSpend : null);
const cac = (m: MarketingInput) => (m.adSpend > 0 && m.sales > 0 ? Math.round((m.adSpend / m.sales) * 100) / 100 : null);

export function marketingFigures(current: MarketingInput, previous: MarketingInput): MarketingFigures {
  return { roas: roas(current), cac: cac(current), previousRoas: roas(previous), previousCac: cac(previous) };
}

/** "6,5×" — one decimal, always, so 4 and 4,5 line up as figures of the same kind. */
export function roasLabel(value: number | null): string {
  if (value === null) return "—";
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(".", ",")}×`;
}

export function cacLabel(value: number | null): string {
  return value === null ? "—" : uah(value);
}
