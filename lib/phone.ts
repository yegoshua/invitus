// Phone input helpers for checkout. Hybrid approach:
//  - UA numbers (the default audience) format with the local convention
//    "+380 (XX) XXX XX XX" — matching the input placeholder;
//  - any foreign "+xx…" number formats via libphonenumber's AsYouType, so
//    international customers can just type their own number;
//  - validation is real libphonenumber validation for both (length, country
//    and operator ranges — not a regex).
// libphonenumber-js/min lands only in the checkout route chunk.

import { AsYouType, isValidPhoneNumber } from "libphonenumber-js/min";

export const UA_PHONE_PREFIX = "+380 ";
export const DEFAULT_COUNTRY = "UA" as const;

/**
 * Normalizes raw input-field text before formatting:
 * - a full international number pasted into a focused field lands after the
 *   prefilled "+380 " — take everything from the last "+";
 * - "+380380…" (bare international pasted after the prefix) collapses the
 *   duplicated country code; "+3800…" drops the national trunk zero;
 * - "380XXXXXXXXX" without "+" is clearly UA international — add "+".
 */
export function normalizePhoneInput(raw: string): string {
  let v = raw;
  const lastPlus = v.lastIndexOf("+");
  if (lastPlus > 0) v = v.slice(lastPlus);

  let digits = v.replace(/\D/g, "");
  if (v.startsWith("+")) {
    if (digits.startsWith("380380")) digits = digits.slice(3);
    if (/^3800/.test(digits)) digits = `380${digits.slice(4)}`;
    return `+${digits}`;
  }
  if (/^380\d{9}$/.test(digits)) return `+${digits}`;
  return v;
}

/** As-you-type formatting: "+380 (98) 770 58 42", "+49 30 90182000", … */
export function formatPhone(raw: string): string {
  const v = normalizePhoneInput(raw);

  if (v.startsWith("+")) {
    // Still ambiguous ("+", "+3", "+38") — leave as typed.
    if (v.length < 4 && "+380".startsWith(v)) return v;
    // Foreign number → libphonenumber's own national grouping.
    if (!v.startsWith("+380")) return new AsYouType(DEFAULT_COUNTRY).input(v);
  }

  // UA number (with or without prefix) → local "+380 (XX) XXX XX XX" grouping.
  let d = v.replace(/\D/g, "");
  if (d.startsWith("380")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  d = d.slice(0, 9);
  if (!d) return "";
  const operator = d.slice(0, 2);
  const rest = [d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  // The ")" appears only once digits follow the operator code, so deleting
  // backwards never fights the formatter re-inserting it.
  if (!rest.length) return `${UA_PHONE_PREFIX}(${operator}`;
  return `${UA_PHONE_PREFIX}(${operator}) ${rest.join(" ")}`;
}

/** Real number validation (length, country, operator ranges) — not a regex. */
export function isValidPhone(value: string): boolean {
  return isValidPhoneNumber(value, DEFAULT_COUNTRY);
}

/** Digits before the caret — used to restore caret position after reformat. */
export function digitsBefore(value: string, caret: number): number {
  return value.slice(0, caret).replace(/\D/g, "").length;
}

/** Caret position in `formatted` right after the Nth digit. */
export function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === n) return i + 1;
    }
  }
  return formatted.length;
}
