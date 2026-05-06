// Money formatting helpers for the UAH price display.
//
// Single owner of "how do we render a price". If we ever swap currencies,
// add localization, or apply rounding rules — change happens here.

const UAH_FORMATTER = new Intl.NumberFormat("uk-UA", {
  style: "decimal",
  minimumFractionDigits: 0,
});

const UAH_CURRENCY_FORMATTER = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  minimumFractionDigits: 0,
});

// Plain number, e.g. "1 999". Use when the ₴ symbol is rendered separately.
export function formatPrice(amount: number): string {
  return UAH_FORMATTER.format(amount);
}

// Includes the currency symbol (₴) per Ukrainian locale conventions.
export function formatPriceWithCurrency(amount: number): string {
  return UAH_CURRENCY_FORMATTER.format(amount);
}