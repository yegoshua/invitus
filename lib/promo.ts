// What a promo code is worth, and whether it may be used at all.
//
// Pure arithmetic and pure rules — no Strapi, no network, no clock of its own.
// The caller supplies the code (lib/promo-codes.ts reads it) and the moment, so
// this module is the one place where the discount is decided and the only one
// that has to be right. The server calls it when pricing the order; the
// validation endpoint calls it to answer the checkout field. Both get the same
// number because it is the same function, not two copies of the same rule.
//
// The base is the goods and nothing else — the site does not charge for
// delivery at all (issue #31), so there is no other component to discount.
//
// The `.ts` extension on the import below is not a slip: this module is covered
// by node:test's type stripping, which resolves relative specifiers literally.
// tsconfig has `allowImportingTsExtensions` for exactly this.

import { formatPrice } from "./format.ts";

/** One code, exactly as Strapi's `PromoCode` collection type stores it. */
export interface PromoCode {
  code: string;
  type: "percent" | "fixed";
  /** `10` with `percent` means −10%; `200` with `fixed` means −200 UAH. */
  value: number;
  /** Date or datetime; empty means "in force already". */
  activeFrom?: string | null;
  /** Date or datetime; empty means "in force indefinitely". */
  activeTo?: string | null;
  /** Minimum goods total in UAH. Empty means no floor. */
  minOrderTotal?: number | null;
  /** The emergency switch: a leaked code is killed by unticking this. */
  isActive: boolean;
}

/**
 * One code as it arrives from the CMS, before anything has been checked.
 *
 * Not a Strapi schema type — it is the *input to validation*, which is why it
 * lives beside the rules rather than in lib/strapi-schema.ts. Every field is
 * optional and nullable because that is the honest description of untrusted
 * content: a required field can still be empty in a draft, and an enumeration
 * can still hold a value added in the admin UI after this code was written.
 */
export interface RawPromoCode {
  code?: string | null;
  type?: string | null;
  value?: number | null;
  activeFrom?: string | null;
  activeTo?: string | null;
  minOrderTotal?: number | null;
  isActive?: boolean | null;
}

/**
 * Raw rows → usable codes, keyed by their normalised form.
 *
 * Rows arrive oldest-first, and where two claim the same code the first wins.
 * Strapi 5's `unique` guarantees nothing while an entry is a draft (#47), so
 * that is a state the CMS can genuinely be in; what matters is that every
 * server resolves it the same way, because a code worth 10% on one instance and
 * 50% on another is worse than either.
 */
export function indexPromoCodes(
  rows: readonly RawPromoCode[]
): Map<string, PromoCode> {
  const byCode = new Map<string, PromoCode>();

  for (const row of rows) {
    const code = normalizePromoCode(row.code ?? "");
    if (!code) continue;

    if (row.type !== "percent" && row.type !== "fixed") {
      console.warn(
        `[promo] ${code} has an unknown type "${row.type}" — ignoring it`
      );
      continue;
    }

    if (byCode.has(code)) {
      console.warn(
        `[promo] duplicate code ${code} in Strapi — keeping the oldest entry`
      );
      continue;
    }

    byCode.set(code, {
      code,
      type: row.type,
      value: row.value ?? 0,
      activeFrom: row.activeFrom,
      activeTo: row.activeTo,
      minOrderTotal: row.minOrderTotal,
      // A missing boolean is off, not on. Defaulting the kill switch the other
      // way means a schema slip quietly re-enables every code ever withdrawn.
      isActive: row.isActive === true,
    });
  }

  return byCode;
}

export type PromoRejectionReason =
  | "unknown"
  | "inactive"
  | "not-yet-active"
  | "expired"
  | "below-minimum"
  /** The code list could not be read at all — see lib/promo-codes.ts. */
  | "unavailable";

export type PromoEvaluation =
  | { ok: true; code: string; discount: number; total: number }
  | { ok: false; reason: PromoRejectionReason; message: string };

/**
 * The customer types `viper_gym`; Strapi stores `VIPER_GYM`. Both halves of the
 * comparison go through here, so neither side has to remember which is which.
 */
export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Every refusal the customer can see, in one place so none goes out untranslated. */
export const PROMO_MESSAGES: Record<
  Exclude<PromoRejectionReason, "below-minimum">,
  string
> = {
  unknown: "Такого промокоду не існує",
  inactive: "Промокод більше не діє",
  "not-yet-active": "Промокод ще не діє",
  expired: "Термін дії промокоду минув",
  unavailable: "Не вдалося перевірити промокод. Спробуй пізніше.",
};

function refuse(reason: Exclude<PromoRejectionReason, "below-minimum">): PromoEvaluation {
  return { ok: false, reason, message: PROMO_MESSAGES[reason] };
}

/**
 * Decide what `promo` is worth against a goods subtotal, as of `now`.
 *
 * `undefined` means the customer typed a code that is not in the list — the
 * same answer as a code that never existed, deliberately: telling apart "no
 * such code" from "that code is off" would help someone guessing at codes and
 * helps nobody else.
 */
export function evaluatePromoCode(
  promo: PromoCode | undefined,
  subtotal: number,
  now: Date = new Date()
): PromoEvaluation {
  if (!promo) return refuse("unknown");

  // The kill switch is checked before the dates, so a code taken down for a
  // leak reports being taken down rather than whatever else is also true of it.
  if (!promo.isActive) return refuse("inactive");

  // A code Strapi holds in a shape this code cannot price is not applied.
  // Refusing a discount is recoverable; a negative one is a surcharge, and a
  // non-finite one poisons the total all the way into the Monobank amount.
  if (!Number.isFinite(promo.value) || promo.value < 0) {
    console.warn(
      `[promo] ${promo.code} has an unusable value (${promo.value}) — refusing it`
    );
    return refuse("unknown");
  }

  const from = parseBoundary(promo.activeFrom, "start");
  const to = parseBoundary(promo.activeTo, "end");
  if (from === "invalid" || to === "invalid") {
    console.warn(
      `[promo] ${promo.code} has an unparseable date ` +
        `(from=${promo.activeFrom}, to=${promo.activeTo}) — refusing it`
    );
    return refuse("unknown");
  }

  if (from && now < from) return refuse("not-yet-active");
  if (to && now >= to) return refuse("expired");

  const minimum = promo.minOrderTotal ?? 0;
  if (subtotal < minimum) {
    return {
      ok: false,
      reason: "below-minimum",
      // The number is formatted here rather than in the UI because this
      // message is also what the order endpoint returns when a code stops
      // qualifying between the checkout screen and the submit.
      message: `Промокод діє на замовлення від ${formatPrice(minimum)} ₴`,
    };
  }

  const raw =
    promo.type === "percent" ? (subtotal * promo.value) / 100 : promo.value;

  // Whole hryvnia: lib/format.ts renders a fractional total as "3 809,5", and
  // the copecks would go on to reach the Monobank amount.
  const discount = clamp(Math.round(raw), 0, subtotal);

  return { ok: true, code: promo.code, discount, total: subtotal - discount };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * A Strapi boundary as an instant, or `null` for "no boundary".
 *
 * Strapi's `Date` field carries no time, and a bare `2026-08-09` parses as UTC
 * midnight — so an `activeTo` of 9 Aug taken literally kills the code before
 * anyone shopped on the 9th. A date-only end is therefore the *start of the
 * next day*, which makes the last day inclusive, the way a merchant reads it.
 * A value that carries a time is used as the exact instant it states.
 */
function parseBoundary(
  raw: string | null | undefined,
  edge: "start" | "end"
): Date | null | "invalid" {
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "invalid";

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw.trim());
  if (dateOnly && edge === "end") {
    return new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
  }
  return parsed;
}
