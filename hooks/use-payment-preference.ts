"use client";

// Public hooks for the remembered payment choice. Components import from here,
// never from `@/stores/payment-preference` — the store is the implementation.

import { useCallback } from "react";
import { usePaymentPreferenceStore } from "@/stores/payment-preference";
import { partsAvailable, partsSchedule } from "@/lib/installments";

export const usePaymentMethodPreference = () =>
  usePaymentPreferenceStore((s) => s.method);
export const usePartsPreference = () => usePaymentPreferenceStore((s) => s.parts);
export const useSetPaymentMethodPreference = () =>
  usePaymentPreferenceStore((s) => s.setMethod);
export const useSetPartsPreference = () =>
  usePaymentPreferenceStore((s) => s.setParts);

/** One call for the product button: «pay this in parts». */
export const usePreferParts = () => {
  const setMethod = usePaymentPreferenceStore((s) => s.setMethod);
  return useCallback(() => setMethod("parts"), [setMethod]);
};

/**
 * The instalment breakdown for a total, or null when the customer has not
 * chosen instalments or the total no longer qualifies — the cart drawer draws
 * its plain «До оплати» in that case. Derived, never stored: a size added to
 * the cart changes the figure and the eligibility with it.
 */
export function usePartsBreakdown(total: number) {
  const method = usePaymentPreferenceStore((s) => s.method);
  const parts = usePaymentPreferenceStore((s) => s.parts);
  if (method !== "parts" || !partsAvailable(total)) return null;
  return partsSchedule(total, parts);
}
