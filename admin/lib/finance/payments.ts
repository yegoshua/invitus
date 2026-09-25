// Payment methods as this KeyCRM account names them (/order/payment-method),
// and the estimated Payment fee for each (CONTEXT: Payment fee).
//
// The rates are an estimate and are shown as one ("≈"). The actual fee comes
// from the bank statement in #110; until then these are the published
// Monobank acquiring rates, and cash on delivery is 0 because who pays Nova
// Poshta's transfer fee is not settled.

export interface PaymentMethod {
  label: string;
  /** Share of the order total kept by the bank. */
  rate: number;
  cod: boolean;
}

export const PAYMENT_METHODS: Record<number, PaymentMethod> = {
  1: { label: "Готівка", rate: 0, cod: false },
  2: { label: "Карта", rate: 0.013, cod: false },
  3: { label: "Переказ", rate: 0, cod: false },
  6: { label: "Накладений платіж", rate: 0, cod: true },
  7: { label: "Apple/Google Pay", rate: 0.013, cod: false },
  9: { label: "Оплата частинами", rate: 0.035, cod: false },
};

export function paymentMethod(id: number | null): PaymentMethod | null {
  return id == null ? null : PAYMENT_METHODS[id] ?? null;
}

/** Estimated fee in whole hryvnias; 0 when the method is unknown. */
export function estimatedFee(total: number, methodId: number | null): number {
  const method = paymentMethod(methodId);
  return method ? Math.round(total * method.rate) : 0;
}
