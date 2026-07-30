// Money formatting helpers for the UAH price display.
//
// Single owner of "how do we render a price". If we ever swap currencies,
// add localization, or apply rounding rules — change happens here.

const UAH_FORMATTER = new Intl.NumberFormat("uk-UA", {
  style: "decimal",
  minimumFractionDigits: 0,
});

// Non-breaking, so the symbol can never be left stranded on its own line.
const CURRENCY_SYMBOL = " ₴";

// Plain number, e.g. "1 999". Use when the ₴ symbol is rendered separately.
export function formatPrice(amount: number): string {
  return UAH_FORMATTER.format(amount);
}

/**
 * Price with the ₴ symbol, e.g. "1 999 ₴".
 *
 * The symbol is appended rather than left to `style: "currency"`, because that
 * is not deterministic across runtimes: Node's ICU renders UAH as "4 100 ₴"
 * while browsers render "4 100 грн". Every page showing a price was therefore
 * failing hydration on the text alone, and React was throwing the tree away and
 * re-rendering it client-side.
 *
 * Only the digits come from Intl now, and those already agree on both sides
 * (same U+00A0 group separator), so the output is identical everywhere — and it
 * matches how the rest of the UI writes prices, as `{formatPrice(x)} ₴`.
 */
export function formatPriceWithCurrency(amount: number): string {
  return `${formatPrice(amount)}${CURRENCY_SYMBOL}`;
}