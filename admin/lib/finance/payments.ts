// Payment methods as this KeyCRM account names them (/order/payment-method).
// What each one costs is a Payment fee (lib/finance/fees.ts): the rates are
// the owner's, kept in the database and edited on the Expenses page.

export interface PaymentMethod {
  label: string;
  cod: boolean;
}

export const PAYMENT_METHODS: Record<number, PaymentMethod> = {
  1: { label: "Готівка", cod: false },
  2: { label: "Карта", cod: false },
  3: { label: "Переказ", cod: false },
  6: { label: "Накладений платіж", cod: true },
  7: { label: "Apple/Google Pay", cod: false },
  9: { label: "Оплата частинами", cod: false },
};

export function paymentMethod(id: number | null): PaymentMethod | null {
  return id == null ? null : PAYMENT_METHODS[id] ?? null;
}

/** The methods whose fee rate the owner sets. Cash is not offered anywhere the Admin counts. */
export const RATED_METHOD_IDS = Object.keys(PAYMENT_METHODS).map(Number).filter((id) => id !== 1);
