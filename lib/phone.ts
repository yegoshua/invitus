// Ukrainian phone formatting for the checkout input: "+380 67 123 45 67".
// One fixed mask — a formatting library would be 100× the size of this file.

export const UA_PHONE_PREFIX = "+380 ";

/**
 * National significant digits (max 9) from any user input.
 * Accepts "+380…", "380…", "0…" (national form) and bare operator digits.
 * The "380" strip loops: pasting a full international number into a focused
 * field concatenates with the "+380 " prefix ("380" + "380 67…"). Safe —
 * no UA national number starts with 380 (city code 0380 doesn't exist).
 * The "0" strip is independent: "+380 067…" needs the "380" AND the "0" cut.
 */
export function uaNationalDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  while (d.startsWith("380")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 9);
}

/** As-you-type format: "" for no digits, else "+380 67 123 45 67" (partial while typing). */
export function formatUaPhone(input: string): string {
  const d = uaNationalDigits(input);
  if (!d) return "";
  const groups = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)];
  return UA_PHONE_PREFIX + groups.filter(Boolean).join(" ");
}

/**
 * Caret position in a formatted value that sits right after the Nth national
 * digit (used to keep the caret in place when editing mid-string).
 */
export function uaCaretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return Math.min(UA_PHONE_PREFIX.length, formatted.length);
  let seen = 0;
  for (let i = UA_PHONE_PREFIX.length; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === n) return i + 1;
    }
  }
  return formatted.length;
}
