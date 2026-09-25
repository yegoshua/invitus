import type { CrmOrder } from "./orders.ts";

let nextId = 1000;

/** A counted, open, new-site order; override what a test is about. */
export function order(overrides: Partial<CrmOrder> = {}): CrmOrder {
  const createdAt = overrides.createdAt ?? new Date("2026-09-10T10:00:00Z");
  return {
    id: nextId++,
    sourceId: 3,
    statusId: 1,
    statusGroupId: 1,
    paid: false,
    total: 4100,
    createdAt,
    statusChangedAt: createdAt,
    closedAt: null,
    paidAt: null,
    paymentMethodId: null,
    lines: [],
    ...overrides,
  };
}

export function sale(completedAt: string, paidAt: string, overrides: Partial<CrmOrder> = {}): CrmOrder {
  return order({
    statusId: 12,
    statusGroupId: 5,
    paid: true,
    closedAt: new Date(completedAt),
    statusChangedAt: new Date(completedAt),
    paidAt: new Date(paidAt),
    ...overrides,
  });
}
